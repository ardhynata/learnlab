package progressrest

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strconv"
	"unicode/utf8" // #3236/#3899: rune-safe truncation of the logged ref/id

	"github.com/inxpired/hexago-runtime/httperr"

	inputport "example.com/learnlab/internal/core/ports/input/progress"
)

// maxPageSize caps the maximum number of rows any list endpoint returns
// in a single call. A caller-supplied limit above this is silently clamped
// to maxPageSize; a non-positive limit (0 or negative) falls back to the
// default page size of 50, NOT to maxPageSize (#4381). Operators who need
// a higher ceiling can raise this constant; the intent is to prevent a
// full-table dump via a single authenticated request (#1650).
const maxPageSize = 1000

// Handler serves the progress REST endpoints.
type Handler struct {
	svc          inputport.ProgressService
	maxBodyBytes int64
	// logger is used for encode-failure diagnostics in writeJSON. Falls back
	// to slog.Default() when nil — callers that don't supply one get the
	// same behaviour as before this field was added.
	logger *slog.Logger
}

// NewHandler builds the REST handler. maxBodyBytes caps request bodies
// via http.MaxBytesReader on body-bearing operations — 0 means no
// limit (not recommended in prod). Wire it from cfg.MaxBodyBytes.
//
// Body decoding delegates to cmd.DecodeJSON on the input-port command
// type, which enforces both wire-presence (required fields →
// ErrRequiredFieldMissing) and strict-mode (unknown fields → 400).
// The handler does not call json.Decoder directly — the strictness
// contract lives with the command type so it can't drift from per-
// adapter decoder configuration.
//
// Error→status mapping is handled by httperr.Write reading the
// errcat.Category each domain/port sentinel carries; no per-entity
// mapper plumbing required. To add a new domain error, declare it with
// errcat.New(msg, errcat.<Category>) — every transport adapter routes
// it correctly without further wiring here.
// logger is used for encode-failure diagnostics in writeJSON — pass the
// service-wide *slog.Logger from main.go; nil falls back to slog.Default().
func NewHandler(svc inputport.ProgressService, maxBodyBytes int64, logger *slog.Logger) *Handler {
	return &Handler{svc: svc, maxBodyBytes: maxBodyBytes, logger: logger}
}

func (h *Handler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("POST /progresses", h.create)
	mux.HandleFunc("GET /progresses", h.list)
	mux.HandleFunc("GET /progresses/{id}", h.getByID)
	mux.HandleFunc("PUT /progresses/{id}", h.update)
	mux.HandleFunc("DELETE /progresses/{id}", h.delete)
	// #1078: ListByLearner route — exposes the relationship query over HTTP
	// at a verb-prefixed path so it stays clear of `GET /<plural>/{id}` per the
	// #453 precedence discipline. e.g. GET /order-lines/by-order/{orderId}
	mux.HandleFunc("GET /progresses/by-learner/{refID}", h.listByLearner)
	// #1078: ListByLesson route — exposes the relationship query over HTTP
	// at a verb-prefixed path so it stays clear of `GET /<plural>/{id}` per the
	// #453 precedence discipline. e.g. GET /order-lines/by-order/{orderId}
	mux.HandleFunc("GET /progresses/by-lesson/{refID}", h.listByLesson)
}

func (h *Handler) create(w http.ResponseWriter, r *http.Request) {
	if h.maxBodyBytes > 0 {
		r.Body = http.MaxBytesReader(w, r.Body, h.maxBodyBytes)
	}
	var cmd inputport.CreateProgressCommand
	if err := cmd.DecodeJSON(r.Body); err != nil {
		httperr.Write(w, err)
		return
	}
	resp, err := h.svc.Create(r.Context(), cmd)
	if err != nil {
		httperr.Write(w, err)
		return
	}
	h.writeJSON(w, http.StatusCreated, resp)
}

func (h *Handler) getByID(w http.ResponseWriter, r *http.Request) {
	// @hexago:user:authz-check:getbyid:progress
	// TODO(authz): this handler returns a record by ID with NO ownership
	// check. JWTAuth proves WHO the caller is, but nothing here constrains
	// WHICH progress they may read — any authenticated caller can
	// fetch any record (an IDOR). Verify the caller may access this
	// Progress — e.g. compare a caller identity from r.Context() against
	// the record's owner field — and return Forbidden otherwise. Code added
	// between these markers survives `hexago gen`. Delete the markers once
	// enforced. See docs/markers.md (authz-check) + docs/commands.md.
	// @hexago:user:end:authz-check:getbyid:progress
	resp, err := h.svc.GetByID(r.Context(), inputport.GetProgressByIDQuery{ID: r.PathValue("id")})
	if err != nil {
		httperr.Write(w, err)
		return
	}
	// #2907: Guard against a nil response pointer — a hand-edited service
	// returning (nil, nil) from GetByID would otherwise encode as JSON `null`
	// with 200 OK, which breaks JS clients doing property access on the result.
	// A nil single-response signals "no result" — surface it as 404 so callers
	// can distinguish "query succeeded, no data" from a populated response.
	// Mirrors the aggregate REST adapter's nil-single-response guard (#2598).
	if resp == nil {
		http.NotFound(w, r)
		return
	}
	h.writeJSON(w, http.StatusOK, resp)
}

func (h *Handler) list(w http.ResponseWriter, r *http.Request) {
	// Pagination parameters: `?limit=` / `?offset=`. Missing values fall
	// back to a sane default (limit=50, offset=0). Malformed values
	// surface as strconv.NumError → 400 via httperr.
	// A non-positive limit (≤0) falls back to the default of 50; a limit
	// above maxPageSize is clamped to maxPageSize to prevent full-table
	// dumps (#1650, #4381).
	limit := 50
	offset := 0
	if v := r.URL.Query().Get("limit"); v != "" {
		n, err := strconv.Atoi(v)
		if err != nil {
			httperr.Write(w, err)
			return
		}
		limit = n
	}
	if limit <= 0 {
		limit = 50
	}
	if limit > maxPageSize {
		limit = maxPageSize
	}
	if v := r.URL.Query().Get("offset"); v != "" {
		n, err := strconv.Atoi(v)
		if err != nil {
			httperr.Write(w, err)
			return
		}
		offset = n
	}
	// A negative offset is clamped to 0 (#1692): otherwise the value is
	// forwarded verbatim to the outbound adapter, where it diverges by
	// backend (PostgreSQL 5xx, SQLite/MySQL page-1 duplicate, Mongo ignore).
	// limit is already clamped above; this closes the offset floor.
	if offset < 0 {
		offset = 0
	}
	q := inputport.ListProgressQuery{Limit: limit, Offset: offset}
	// @hexago:user:authz-check:list:progress
	// TODO(authz): this handler returns ALL progress rows to any
	// authenticated caller with NO owner check — the widest bulk-disclosure
	// BOLA surface. JWTAuth proves WHO the caller is but nothing here
	// constrains WHICH rows they may enumerate. If this entity is
	// multi-tenant, scope `q` to the authenticated caller before the
	// svc.List call — e.g. read a caller identity from r.Context() and set
	// a tenant/owner field on the query; return Forbidden for unauthenticated
	// callers. Code added between these markers survives `hexago gen`.
	// Delete the markers once enforced.
	// See docs/markers.md (authz-check) + docs/commands.md.
	// @hexago:user:end:authz-check:list:progress
	resp, err := h.svc.List(r.Context(), q)
	if err != nil {
		httperr.Write(w, err)
		return
	}
	// #2272: Guarantee resp marshals as [] not null when svc.List returns
	// nil. A nil JSON-tagged slice encodes as JSON null and crashes JS
	// clients doing `for..of`. The explicit guard keeps the boundary correct
	// even if a hand-edited service returns nil. Mirrors the listByRef guard.
	if resp == nil {
		resp = []*inputport.ProgressResponse{}
	}
	h.writeJSON(w, http.StatusOK, resp)
}

func (h *Handler) update(w http.ResponseWriter, r *http.Request) {
	if h.maxBodyBytes > 0 {
		r.Body = http.MaxBytesReader(w, r.Body, h.maxBodyBytes)
	}
	var cmd inputport.UpdateProgressCommand
	if err := cmd.DecodeJSON(r.Body); err != nil {
		httperr.Write(w, err)
		return
	}
	pathID := r.PathValue("id")
	// Body-id and path-id must agree when both are present. Silently
	// overwriting cmd.ID with pathID (the old behavior) masks client
	// typos; explicit rejection surfaces the mismatch so the caller
	// notices. Empty body id is still accepted — path wins.
	if cmd.ID != "" && cmd.ID != pathID {
		// #3897: the sentinel MUST lead (`%w: <detail>`), matching the
		// ErrRequiredFieldMissing convention. httperr's categorizedMessage
		// (errcat.DetailedMessage) only surfaces the extra detail when the
		// wrapped message is a SUFFIX of the sentinel's own text — a detail-
		// first PREFIX wrap collapses to the bare "bad request" sentinel and
		// silently drops the mismatch detail from the response body.
		httperr.Write(w, fmt.Errorf("%w: body id does not match path id", httperr.ErrBadRequest))
		return
	}
	cmd.ID = pathID
	// @hexago:user:authz-check:update:progress
	// TODO(authz): this handler mutates a record by ID with NO ownership
	// check. JWTAuth proves WHO the caller is, but nothing here constrains
	// WHICH progress they may update — any authenticated caller can
	// alter any record (an IDOR). Verify the caller may modify this
	// Progress — e.g. compare a caller identity from r.Context() against
	// the record's owner field — and return Forbidden otherwise. Code added
	// between these markers survives `hexago gen`. Delete the markers once
	// enforced. See docs/markers.md (authz-check) + docs/commands.md.
	// @hexago:user:end:authz-check:update:progress
	resp, err := h.svc.Update(r.Context(), cmd)
	if err != nil {
		httperr.Write(w, err)
		return
	}
	// #2907: Guard against a nil response pointer — a hand-edited service
	// returning (nil, nil) from Update would otherwise encode as JSON `null`
	// with 200 OK, which breaks JS clients doing property access on the result.
	// A nil single-response signals "no record mutated" — surface it as 404 so
	// callers can distinguish "update succeeded, no row matched" from a populated
	// response. Mirrors the aggregate REST adapter's nil-single-response guard
	// (#2598) and the getByID nil guard above.
	if resp == nil {
		http.NotFound(w, r)
		return
	}
	h.writeJSON(w, http.StatusOK, resp)
}

func (h *Handler) delete(w http.ResponseWriter, r *http.Request) {
	// @hexago:user:authz-check:delete:progress
	// TODO(authz): this handler deletes a record by ID with NO ownership
	// check. JWTAuth proves WHO the caller is, but nothing here constrains
	// WHICH progress they may delete — any authenticated caller can
	// remove any record (an IDOR). Verify the caller may delete this
	// Progress — e.g. compare a caller identity from r.Context() against
	// the record's owner field — and return Forbidden otherwise. Code added
	// between these markers survives `hexago gen`. Delete the markers once
	// enforced. See docs/markers.md (authz-check) + docs/commands.md.
	// @hexago:user:end:authz-check:delete:progress
	if err := h.svc.Delete(r.Context(), inputport.DeleteProgressCommand{ID: r.PathValue("id")}); err != nil {
		httperr.Write(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// listByLearner handles `GET /progresses/by-learner/{refID}` — the
// HTTP surface for the ref-listing relationship query. The refID path
// value is forwarded to the input-port query; pagination via ?limit= /
// ?offset= mirrors the plain list handler (closes #1078).
// limit ≤0 falls back to 50 and a limit above maxPageSize is clamped to
// maxPageSize (see list handler; #1650, #4381).
func (h *Handler) listByLearner(w http.ResponseWriter, r *http.Request) {
	// @hexago:user:authz-check:listby-learner:progress
	// TODO(authz): this handler lists progress records scoped to a parent
	// learner refID with NO ownership check. JWTAuth proves WHO the
	// caller is, but nothing here constrains WHICH parent learner they may
	// query — any authenticated caller can pass any refID and read child
	// records cross-tenant (IDOR). Scope the refID to the caller's
	// tenant/ownership before the svc call — e.g. validate that the
	// learner identified by refID belongs to the authenticated caller
	// (compare r.Context() identity against the parent record's owner field)
	// and return Forbidden otherwise. Code added between these markers
	// survives `hexago gen`. Delete the markers once enforced.
	// See docs/markers.md (authz-check) + docs/commands.md.
	// @hexago:user:end:authz-check:listby-learner:progress
	limit := 50
	offset := 0
	if v := r.URL.Query().Get("limit"); v != "" {
		n, err := strconv.Atoi(v)
		if err != nil {
			httperr.Write(w, err)
			return
		}
		limit = n
	}
	if limit <= 0 {
		limit = 50
	}
	if limit > maxPageSize {
		limit = maxPageSize
	}
	if v := r.URL.Query().Get("offset"); v != "" {
		n, err := strconv.Atoi(v)
		if err != nil {
			httperr.Write(w, err)
			return
		}
		offset = n
	}
	// Clamp a negative offset to 0 (#1692), matching the plain list handler
	// — a verbatim negative offset diverges by backend.
	if offset < 0 {
		offset = 0
	}
	resp, err := h.svc.ListByLearner(r.Context(), inputport.ListProgressByLearnerQuery{
		LearnerID: r.PathValue("refID"),
		Limit:     limit,
		Offset:    offset,
	})
	if err != nil {
		httperr.Write(w, err)
		return
	}
	// #1696 item 6 — INTENTIONAL BREAKING CHANGE: listByLearner now wraps
	// its rows in the SAME `{data, total}` JSON envelope every other list
	// surface emits, instead of the prior bare JSON array. This standardizes
	// every list endpoint on one response shape so AI-agent drivers, the SaaS
	// UI, and jq-style tooling parse one contract — not a per-endpoint mix of
	// `[...]` and `{...}`. Consumers that previously read `resp[0]` must read
	// `resp.data[0]`.
	//
	// `data` is GUARANTEED non-nil at serialization so it marshals as `[]`
	// (never `null`) on an empty result — the null-vs-`[]` invariant the
	// JSON-envelope contract pins (docs/design/json-envelope-contract.md):
	// a nil JSON-tagged slice marshals to `null` and crashes consumers doing
	// `for x of resp.data`. svc.ListByLearner already returns a make()'d
	// (non-nil) slice, but the explicit guard keeps the boundary correct even
	// if a hand-edited service returns nil.
	//
	// `total` is the TRUE dataset-wide count (via CountByLearner), NOT the
	// page size — pagination UIs need this to compute whether more pages exist
	// (#2202). On a CountByLearner error the handler degrades gracefully:
	// data is still returned with total = len(page) as an honest fallback rather
	// than failing the entire request for a count that is advisory to UI only.
	// The error is logged (not silently swallowed) so operators can investigate
	// count failures that would otherwise make every response appear to be the
	// final page (#2582). Mirrors the gRPC sibling's graceful-degrade pattern.
	data := resp
	if data == nil {
		data = []*inputport.ProgressResponse{}
	}
	total := len(data)
	if n, countErr := h.svc.CountByLearner(r.Context(), inputport.ListProgressByLearnerQuery{
		LearnerID: r.PathValue("refID"),
	}); countErr == nil {
		total = n
	} else {
		countLogger := h.logger
		if countLogger == nil {
			countLogger = slog.Default()
		}
		// #2784: sanitize before logging.
		// (1) Do not log raw DB driver errors — they can expose table names,
		//     column names, constraint names, or raw query fragments from the
		//     persistence layer. Log a fixed domain message instead; operators
		//     who need the underlying cause should enable structured debug
		//     logging at the DB layer.
		// (2) Truncate the user-supplied refID to 64 bytes before logging.
		//     slog's standard handlers already escape newlines/ANSI, but an
		//     unbounded value can bloat log lines and exceed common log-
		//     aggregator field-size limits.
		//     (#3236) The 64-byte cap is a BYTE slice, so a multi-byte UTF-8
		//     rune (e.g. a 3-byte CJK ideograph) can be split at the boundary,
		//     leaving invalid UTF-8 that slog's JSON handler mangles into
		//     U+FFFD replacement characters — corrupting the very value log
		//     pipelines use for correlation. After the byte cap, back off to
		//     the last complete rune so the logged value is always valid UTF-8.
		//     Bounded to ≤3 trims (a UTF-8 rune is at most 4 bytes).
		logRefID := r.PathValue("refID")
		if len(logRefID) > 64 {
			logRefID = logRefID[:64]
			for len(logRefID) > 0 && !utf8.ValidString(logRefID) {
				logRefID = logRefID[:len(logRefID)-1]
			}
		}
		countLogger.Error("rest: CountByLearner degraded — returning page size as total",
			slog.String("err", "internal count error"),
			slog.String("ref_id", logRefID))
	}
	h.writeJSON(w, http.StatusOK, map[string]any{
		"data":  data,
		"total": total,
	})
}

// listByLesson handles `GET /progresses/by-lesson/{refID}` — the
// HTTP surface for the ref-listing relationship query. The refID path
// value is forwarded to the input-port query; pagination via ?limit= /
// ?offset= mirrors the plain list handler (closes #1078).
// limit ≤0 falls back to 50 and a limit above maxPageSize is clamped to
// maxPageSize (see list handler; #1650, #4381).
func (h *Handler) listByLesson(w http.ResponseWriter, r *http.Request) {
	// @hexago:user:authz-check:listby-lesson:progress
	// TODO(authz): this handler lists progress records scoped to a parent
	// lesson refID with NO ownership check. JWTAuth proves WHO the
	// caller is, but nothing here constrains WHICH parent lesson they may
	// query — any authenticated caller can pass any refID and read child
	// records cross-tenant (IDOR). Scope the refID to the caller's
	// tenant/ownership before the svc call — e.g. validate that the
	// lesson identified by refID belongs to the authenticated caller
	// (compare r.Context() identity against the parent record's owner field)
	// and return Forbidden otherwise. Code added between these markers
	// survives `hexago gen`. Delete the markers once enforced.
	// See docs/markers.md (authz-check) + docs/commands.md.
	// @hexago:user:end:authz-check:listby-lesson:progress
	limit := 50
	offset := 0
	if v := r.URL.Query().Get("limit"); v != "" {
		n, err := strconv.Atoi(v)
		if err != nil {
			httperr.Write(w, err)
			return
		}
		limit = n
	}
	if limit <= 0 {
		limit = 50
	}
	if limit > maxPageSize {
		limit = maxPageSize
	}
	if v := r.URL.Query().Get("offset"); v != "" {
		n, err := strconv.Atoi(v)
		if err != nil {
			httperr.Write(w, err)
			return
		}
		offset = n
	}
	// Clamp a negative offset to 0 (#1692), matching the plain list handler
	// — a verbatim negative offset diverges by backend.
	if offset < 0 {
		offset = 0
	}
	resp, err := h.svc.ListByLesson(r.Context(), inputport.ListProgressByLessonQuery{
		LessonID: r.PathValue("refID"),
		Limit:    limit,
		Offset:   offset,
	})
	if err != nil {
		httperr.Write(w, err)
		return
	}
	// #1696 item 6 — INTENTIONAL BREAKING CHANGE: listByLesson now wraps
	// its rows in the SAME `{data, total}` JSON envelope every other list
	// surface emits, instead of the prior bare JSON array. This standardizes
	// every list endpoint on one response shape so AI-agent drivers, the SaaS
	// UI, and jq-style tooling parse one contract — not a per-endpoint mix of
	// `[...]` and `{...}`. Consumers that previously read `resp[0]` must read
	// `resp.data[0]`.
	//
	// `data` is GUARANTEED non-nil at serialization so it marshals as `[]`
	// (never `null`) on an empty result — the null-vs-`[]` invariant the
	// JSON-envelope contract pins (docs/design/json-envelope-contract.md):
	// a nil JSON-tagged slice marshals to `null` and crashes consumers doing
	// `for x of resp.data`. svc.ListByLesson already returns a make()'d
	// (non-nil) slice, but the explicit guard keeps the boundary correct even
	// if a hand-edited service returns nil.
	//
	// `total` is the TRUE dataset-wide count (via CountByLesson), NOT the
	// page size — pagination UIs need this to compute whether more pages exist
	// (#2202). On a CountByLesson error the handler degrades gracefully:
	// data is still returned with total = len(page) as an honest fallback rather
	// than failing the entire request for a count that is advisory to UI only.
	// The error is logged (not silently swallowed) so operators can investigate
	// count failures that would otherwise make every response appear to be the
	// final page (#2582). Mirrors the gRPC sibling's graceful-degrade pattern.
	data := resp
	if data == nil {
		data = []*inputport.ProgressResponse{}
	}
	total := len(data)
	if n, countErr := h.svc.CountByLesson(r.Context(), inputport.ListProgressByLessonQuery{
		LessonID: r.PathValue("refID"),
	}); countErr == nil {
		total = n
	} else {
		countLogger := h.logger
		if countLogger == nil {
			countLogger = slog.Default()
		}
		// #2784: sanitize before logging.
		// (1) Do not log raw DB driver errors — they can expose table names,
		//     column names, constraint names, or raw query fragments from the
		//     persistence layer. Log a fixed domain message instead; operators
		//     who need the underlying cause should enable structured debug
		//     logging at the DB layer.
		// (2) Truncate the user-supplied refID to 64 bytes before logging.
		//     slog's standard handlers already escape newlines/ANSI, but an
		//     unbounded value can bloat log lines and exceed common log-
		//     aggregator field-size limits.
		//     (#3236) The 64-byte cap is a BYTE slice, so a multi-byte UTF-8
		//     rune (e.g. a 3-byte CJK ideograph) can be split at the boundary,
		//     leaving invalid UTF-8 that slog's JSON handler mangles into
		//     U+FFFD replacement characters — corrupting the very value log
		//     pipelines use for correlation. After the byte cap, back off to
		//     the last complete rune so the logged value is always valid UTF-8.
		//     Bounded to ≤3 trims (a UTF-8 rune is at most 4 bytes).
		logRefID := r.PathValue("refID")
		if len(logRefID) > 64 {
			logRefID = logRefID[:64]
			for len(logRefID) > 0 && !utf8.ValidString(logRefID) {
				logRefID = logRefID[:len(logRefID)-1]
			}
		}
		countLogger.Error("rest: CountByLesson degraded — returning page size as total",
			slog.String("err", "internal count error"),
			slog.String("ref_id", logRefID))
	}
	h.writeJSON(w, http.StatusOK, map[string]any{
		"data":  data,
		"total": total,
	})
}

// writeJSON serializes body as JSON to w. An encode failure (e.g.,
// client closed the connection mid-write) is logged via the handler's
// injected logger (falling back to slog.Default() when nil) rather than
// silently dropped — the response is already half-written at that point
// so the status line can't be changed, but the failure surfaces in logs
// for ops to investigate.
func (h *Handler) writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(body); err != nil {
		logger := h.logger
		if logger == nil {
			logger = slog.Default()
		}
		logger.Error("rest: response encode failed",
			slog.String("err", err.Error()))
	}
}
