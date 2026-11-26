package pathrest

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/inxpired/hexago/runtime/httperr"

	inputport "example.com/learnlab/internal/core/ports/input/path"
)

// maxPageSize caps the maximum number of rows any list endpoint returns
// in a single call. A caller-supplied limit above this is silently clamped
// to maxPageSize; a non-positive limit (0 or negative) falls back to the
// default page size of 50, NOT to maxPageSize (#4381). Operators who need
// a higher ceiling can raise this constant; the intent is to prevent a
// full-table dump via a single authenticated request (#1650).
const maxPageSize = 1000

// Handler serves the path REST endpoints.
type Handler struct {
	svc          inputport.PathService
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
func NewHandler(svc inputport.PathService, maxBodyBytes int64, logger *slog.Logger) *Handler {
	return &Handler{svc: svc, maxBodyBytes: maxBodyBytes, logger: logger}
}

func (h *Handler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("POST /paths", h.create)
	mux.HandleFunc("GET /paths", h.list)
	// #1447: /options literal registered before /{id} wildcard so Go 1.22+
	// route-precedence rules don't shadow the options endpoint. Mirrors the
	// identical fix applied to the HTMX handler (#1406).
	mux.HandleFunc("GET /paths/options", h.options)
	mux.HandleFunc("GET /paths/{id}", h.getByID)
	mux.HandleFunc("PUT /paths/{id}", h.update)
	mux.HandleFunc("DELETE /paths/{id}", h.delete)
}

func (h *Handler) create(w http.ResponseWriter, r *http.Request) {
	if h.maxBodyBytes > 0 {
		r.Body = http.MaxBytesReader(w, r.Body, h.maxBodyBytes)
	}
	var cmd inputport.CreatePathCommand
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
	// @hexago:user:authz-check:getbyid:path
	// TODO(authz): this handler returns a record by ID with NO ownership
	// check. JWTAuth proves WHO the caller is, but nothing here constrains
	// WHICH path they may read — any authenticated caller can
	// fetch any record (an IDOR). Verify the caller may access this
	// Path — e.g. compare a caller identity from r.Context() against
	// the record's owner field — and return Forbidden otherwise. Code added
	// between these markers survives `hexago gen`. Delete the markers once
	// enforced. See docs/markers.md (authz-check) + docs/commands.md.
	// @hexago:user:end:authz-check:getbyid:path
	resp, err := h.svc.GetByID(r.Context(), inputport.GetPathByIDQuery{ID: r.PathValue("id")})
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
	q := inputport.ListPathQuery{Limit: limit, Offset: offset}
	// Filter fields (#572): each declared filter field is read from the
	// URL query string. Empty strings preserve "no filter applied" semantics.
	// #3345: ENUM filter fields backed by a real entity column are forwarded to
	// the repo as equality predicates (the service builds the enumFilters map and
	// routes through ListFiltered); non-enum filter fields (int / bool / date)
	// are decoded here but not yet applied as repo predicates — a typed non-enum
	// filter is a tracked follow-up (#3345). Mirrors the HTMX handler's decode
	// loop (issue #572).
	if v := r.URL.Query().Get("level"); v != "" {
		// #3383: reject an over-long filter/search term. Uncapped, the value
		// flows to the DB as a leading-wildcard LIKE '%v%' (SQL) / $regex
		// (Mongo) full-table scan; a ~1MB query param (bounded only by Go's
		// default MaxHeaderBytes, NOT the body MaxBytesReader) turns each
		// request into an O(rows × term-length) scan — a DB-CPU DoS amplifier.
		// 512 bytes is ample for any legitimate filter/search term.
		if len(v) > 512 {
			httperr.Write(w, httperr.ErrBadRequest)
			return
		}
		q.Level = v
	}
	if v := r.URL.Query().Get("search"); v != "" {
		// #3383: reject an over-long filter/search term. Uncapped, the value
		// flows to the DB as a leading-wildcard LIKE '%v%' (SQL) / $regex
		// (Mongo) full-table scan; a ~1MB query param (bounded only by Go's
		// default MaxHeaderBytes, NOT the body MaxBytesReader) turns each
		// request into an O(rows × term-length) scan — a DB-CPU DoS amplifier.
		// 512 bytes is ample for any legitimate filter/search term.
		if len(v) > 512 {
			httperr.Write(w, httperr.ErrBadRequest)
			return
		}
		q.Search = v
	}
	// @hexago:user:authz-check:list:path
	// TODO(authz): this handler returns ALL path rows to any
	// authenticated caller with NO owner check — the widest bulk-disclosure
	// BOLA surface. JWTAuth proves WHO the caller is but nothing here
	// constrains WHICH rows they may enumerate. If this entity is
	// multi-tenant, scope `q` to the authenticated caller before the
	// svc.List call — e.g. read a caller identity from r.Context() and set
	// a tenant/owner field on the query; return Forbidden for unauthenticated
	// callers. Code added between these markers survives `hexago gen`.
	// Delete the markers once enforced.
	// See docs/markers.md (authz-check) + docs/commands.md.
	// @hexago:user:end:authz-check:list:path
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
		resp = []*inputport.PathResponse{}
	}
	h.writeJSON(w, http.StatusOK, resp)
}

// options returns up to 1000 `[{id, label}]` rows for `<select>`-style
// dropdowns (#403 sub-5). Read-only — no body, no auth-action checks
// beyond what middleware enforces. JSON-encoded.
func (h *Handler) options(w http.ResponseWriter, r *http.Request) {
	// @hexago:user:authz-check:options:path
	// TODO(authz): this handler returns ALL path {id,label} rows
	// to any authenticated caller with NO owner check — a BOLA surface that
	// can enumerate the full options list cross-tenant. JWTAuth proves WHO
	// the caller is but nothing here constrains WHICH rows they may
	// enumerate. If this entity is multi-tenant, scope the query to the
	// authenticated caller — e.g. read a caller identity from r.Context()
	// and pass an OwnerID on the query; return Forbidden for unauthenticated
	// callers. Code added between these markers survives `hexago gen`.
	// Delete the markers once enforced.
	// See docs/markers.md (authz-check) + docs/commands.md.
	// @hexago:user:end:authz-check:options:path
	resp, err := h.svc.Options(r.Context(), inputport.PathOptionsQuery{})
	if err != nil {
		httperr.Write(w, err)
		return
	}
	// #3234: Guarantee resp marshals as [] not null when svc.Options returns
	// nil. A nil JSON-tagged slice encodes as JSON null and crashes JS clients
	// building a `<select>` with `for..of` / Array.isArray on the response. The
	// explicit guard keeps the boundary correct even if a hand-edited service
	// returns nil rather than a make()'d slice. Mirrors the list handler guard
	// (#2272).
	if resp == nil {
		resp = []inputport.PathOption{}
	}
	h.writeJSON(w, http.StatusOK, resp)
}

func (h *Handler) update(w http.ResponseWriter, r *http.Request) {
	if h.maxBodyBytes > 0 {
		r.Body = http.MaxBytesReader(w, r.Body, h.maxBodyBytes)
	}
	var cmd inputport.UpdatePathCommand
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
	// @hexago:user:authz-check:update:path
	// TODO(authz): this handler mutates a record by ID with NO ownership
	// check. JWTAuth proves WHO the caller is, but nothing here constrains
	// WHICH path they may update — any authenticated caller can
	// alter any record (an IDOR). Verify the caller may modify this
	// Path — e.g. compare a caller identity from r.Context() against
	// the record's owner field — and return Forbidden otherwise. Code added
	// between these markers survives `hexago gen`. Delete the markers once
	// enforced. See docs/markers.md (authz-check) + docs/commands.md.
	// @hexago:user:end:authz-check:update:path
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
	// @hexago:user:authz-check:delete:path
	// TODO(authz): this handler deletes a record by ID with NO ownership
	// check. JWTAuth proves WHO the caller is, but nothing here constrains
	// WHICH path they may delete — any authenticated caller can
	// remove any record (an IDOR). Verify the caller may delete this
	// Path — e.g. compare a caller identity from r.Context() against
	// the record's owner field — and return Forbidden otherwise. Code added
	// between these markers survives `hexago gen`. Delete the markers once
	// enforced. See docs/markers.md (authz-check) + docs/commands.md.
	// @hexago:user:end:authz-check:delete:path
	if err := h.svc.Delete(r.Context(), inputport.DeletePathCommand{ID: r.PathValue("id")}); err != nil {
		httperr.Write(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
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
