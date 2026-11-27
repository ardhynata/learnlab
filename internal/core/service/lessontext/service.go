package lessontextservice

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"strings" // the Options search sanitiser (#5078)
	"time"

	domain "example.com/learnlab/internal/core/domain/lessontext"
	inputport "example.com/learnlab/internal/core/ports/input/lessontext"
	lessonrepo "example.com/learnlab/internal/core/ports/output/lesson"
	outputport "example.com/learnlab/internal/core/ports/output/lessontext"
	"github.com/inxpired/hexago-runtime/listfilter"
	"github.com/inxpired/hexago-runtime/txmanager"
)

// generateLessonTextID returns a random 128-bit hex identifier. Used by
// Create when the client does not supply an ID. Swap for a UUID/ULID library
// in application code if you need a specific format.
func generateLessonTextID() string {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		// A crypto/rand.Read failure means the OS entropy source is
		// unavailable. Discarding the error would leave b all-zero and return
		// the constant id "00000000000000000000000000000000", silently
		// colliding every Create's primary key (#3381). Panic instead so the
		// failure is loud and immediate. crypto/rand.Read never returns an
		// error on Go 1.20+ (it panics internally on catastrophic failure), so
		// this guard is defense-in-depth; swap this generator for a UUID/ULID
		// library in application code to choose a different failure policy.
		panic("generateLessonTextID: crypto/rand.Read: " + err.Error())
	}
	return hex.EncodeToString(b[:])
}

var _ inputport.LessonTextService = (*Service)(nil)

type Service struct {
	repo       outputport.LessonTextRepository
	lessonRepo lessonrepo.LessonRepository
	txManager  txmanager.TxManager
}

func NewService(
	repo outputport.LessonTextRepository,
	lessonRepo lessonrepo.LessonRepository,
	txManager txmanager.TxManager,
) *Service {
	return &Service{
		repo:       repo,
		lessonRepo: lessonRepo,
		txManager:  txManager,
	}
}

// validateRefs checks that every referenced aggregate exists in its
// repository (same-context refs), via its lookup adapter (cross-context
// refs, Phase-3 M3b), or via its remote port (remote-refs, W4-e — http-
// client / grpc-client peers). Returns the matching inputport invalid-
// reference sentinel so the handler's mapper lifts it to 400.
//
// validateRefs is called BEFORE the write transaction opens (pre-tx
// precondition check). This is required for correctness on PostgreSQL:
// pgx.Tx is a single connection and NOT safe for concurrent use; calling
// validateRefs inside WithTransaction would cause goroutines to issue
// concurrent FindByID calls on the same pgx.Tx → protocol desync /
// data corruption (#1789). By running on the outer ctx each goroutine
// draws a fresh pooled connection — safe for all backends and
// behaviour-neutral for the validation result.
func (s *Service) validateLessonTextRefs(ctx context.Context, lessonID string) error {
	if lessonID != "" {
		// Same-context ref: a missed lookup surfaces as the producer's
		// own ErrNotFound sentinel (declared in the target entity's
		// output port package — lessonrepo.ErrNotFound). Each generated
		// output port declares its own opaque sentinel so errors.Is does
		// pointer-identity comparison; using the consumer's self
		// outputport.ErrNotFound would NEVER match the target's sentinel
		// and the BadRequest translation would silently fall through to
		// the raw error → 5xx (#1311). Translate to the InvalidReference
		// sentinel so the handler's mapper lifts it to 400. Other
		// repository errors bubble up unchanged (handler routes them to
		// 5xx via errcat).
		if _, err := s.lessonRepo.FindByID(ctx, lessonID); err != nil {
			if errors.Is(err, lessonrepo.ErrNotFound) {
				return inputport.ErrLessonTextLessonIDInvalidReference
			}
			return err
		}
	}
	return nil
}

func (s *Service) Create(ctx context.Context, cmd inputport.CreateLessonTextCommand) (*inputport.LessonTextResponse, error) {
	// validateRefs runs PRE-TRANSACTION on the outer ctx so each goroutine
	// draws a fresh pooled connection — safe on PostgreSQL (pgx.Tx is not
	// concurrent-safe; running inside WithTransaction would cause goroutines
	// to share one connection → protocol desync, #1789).
	if err := s.validateLessonTextRefs(ctx, cmd.LessonID); err != nil {
		return nil, err
	}
	var result *inputport.LessonTextResponse
	err := s.txManager.WithTransaction(ctx, func(ctx context.Context) error {
		if cmd.ID == "" {
			cmd.ID = generateLessonTextID()
		}
		e, err := domain.NewLessonText(cmd.ID, cmd.LessonID, cmd.Locale, cmd.Title, cmd.Body)
		if err != nil {
			return err
		}
		if err := s.repo.Save(ctx, e); err != nil {
			if errors.Is(err, outputport.ErrAlreadyExists) {
				return inputport.ErrLessonTextAlreadyExists
			}
			return err
		}
		result = lessontextToResponse(e)
		return nil
	})
	return result, err
}

func (s *Service) GetByID(ctx context.Context, q inputport.GetLessonTextByIDQuery) (*inputport.LessonTextResponse, error) {
	e, err := s.repo.FindByID(ctx, q.ID)
	if err != nil {
		// Translate the repository-tier not-found sentinel to the
		// input-port one so the handler maps to 404 (the input-port
		// sentinel carries errcat.NotFound; httperr.Status / grpcerr.Code
		// read that category at the transport boundary). All generated
		// outbound adapters (memory, driver-backed, grpc-client) return
		// outputport.ErrNotFound on miss — unified in the not-found
		// convention cleanup (Day-12 #4).
		if errors.Is(err, outputport.ErrNotFound) {
			return nil, inputport.ErrLessonTextNotFound
		}
		return nil, err
	}
	return lessontextToResponse(e), nil
}

func (s *Service) List(ctx context.Context, q inputport.ListLessonTextQuery) ([]*inputport.LessonTextResponse, error) {
	// filter.searchable is set (#1300): route through ListFiltered when the
	// search param (q.Search) is non-empty so the
	// repository applies the ILIKE/LIKE predicates on searchable columns.
	// Falls back to unfiltered List when search is "".
	var (
		es  []*domain.LessonText
		err error
	)
	if q.Search != "" {
		es, err = s.repo.ListFiltered(ctx, q.Search, q.Limit, q.Offset)
	} else {
		es, err = s.repo.List(ctx, q.Limit, q.Offset)
	}
	if err != nil {
		return nil, err
	}
	out := make([]*inputport.LessonTextResponse, 0, len(es))
	for _, e := range es {
		out = append(out, lessontextToResponse(e))
	}
	return out, nil
}

// ListByLesson returns the lessontexts referencing the supplied LessonID.
// Auto-emitted from the `ref: Lesson` declaration on this entity
// (#403 sub-3); replaces the prior hand-pattern of `List(limit=1000)`
// followed by an in-memory filter on LessonID.
func (s *Service) ListByLesson(ctx context.Context, q inputport.ListLessonTextByLessonQuery) ([]*inputport.LessonTextResponse, error) {
	es, err := s.repo.ListByLesson(ctx, q.LessonID, q.Limit, q.Offset)
	if err != nil {
		return nil, err
	}
	out := make([]*inputport.LessonTextResponse, 0, len(es))
	for _, e := range es {
		out = append(out, lessontextToResponse(e))
	}
	return out, nil
}

// CountByLesson returns the total number of lessontext rows whose
// LessonID equals LessonID, without applying limit/offset. The REST
// listByLesson handler calls this to populate the `total` envelope field
// with the true dataset-wide count rather than the page size (#2202).
func (s *Service) CountByLesson(ctx context.Context, q inputport.ListLessonTextByLessonQuery) (int, error) {
	return s.repo.CountByLesson(ctx, q.LessonID)
}

// ListByLessonSince is the keyset-paginated sibling of ListByLesson
// (#4237) — a thin pass-through to the repository's own ListByLessonSince
// (see its godoc for the full keyset-vs-offset mechanism). Backs the gRPC
// ListByLessonSince RPC a cross-service `derive:` rollup's derived-rows
// reader rides for its internal complete-scan loop; not part of the general
// REST/HTMX listing surface.
func (s *Service) ListByLessonSince(ctx context.Context, refID string, afterCreatedAt time.Time, afterID string, limit int) ([]*inputport.LessonTextResponse, error) {
	es, err := s.repo.ListByLessonSince(ctx, refID, afterCreatedAt, afterID, limit)
	if err != nil {
		return nil, err
	}
	out := make([]*inputport.LessonTextResponse, 0, len(es))
	for _, e := range es {
		out = append(out, lessontextToResponse(e))
	}
	return out, nil
}

// Options returns up to 1000 dropdown rows (#403 sub-5). Read-only —
// no transaction, no event publish — so it stays cheap on hot paths
// like create-form rendering. A query carrying Search and/or IDs is served
// by searchOptions instead (#5078).
func (s *Service) Options(ctx context.Context, q inputport.LessonTextOptionsQuery) ([]inputport.LessonTextOption, error) {
	if q.Search != "" || len(q.IDs) > 0 {
		return s.searchOptions(ctx, q)
	}
	rows, err := s.repo.ListOptions(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]inputport.LessonTextOption, 0, len(rows))
	for _, r := range rows {
		out = append(out, inputport.LessonTextOption{ID: r.ID, Label: r.Label})
	}
	return out, nil
}

// searchOptions serves an Options call narrowed by Search and/or IDs (#5078).
// The narrowing runs in the store, BEFORE its 1000-row LIMIT, through the
// optional outputport.LessonTextOptionsSearcher capability, so a row past the
// first 1000 labels is still found by text or by id. An adapter without the
// capability (hand-written, or generated before #5078) keeps the old
// behaviour: the windowed ListOptions rows, filtered in memory.
// The query is sanitised first, once, for every store: Search loses NUL bytes
// and invalid UTF-8 (PostgreSQL and MongoDB reject both) and is cut to
// maxLessonTextOptionsSearchRunes runes (SQLite's LIKE and MongoDB's regex refuse a
// very long pattern); IDs are de-duplicated BEFORE the 1000-id cap, so
// duplicate ids never push a distinct id past it.
func (s *Service) searchOptions(ctx context.Context, q inputport.LessonTextOptionsQuery) ([]inputport.LessonTextOption, error) {
	search := sanitizeLessonTextOptionsSearch(q.Search)
	ids := dedupeLessonTextOptionIDs(q.IDs, 1000)
	var (
		rows []outputport.LessonTextOptionRow
		err  error
	)
	if searcher, ok := s.repo.(outputport.LessonTextOptionsSearcher); ok {
		rows, err = searcher.SearchOptions(ctx, outputport.LessonTextOptionsFilter{Search: search, IDs: ids})
	} else {
		rows, err = s.repo.ListOptions(ctx)
		if err == nil {
			rows = filterLessonTextOptionRows(rows, search, ids)
		}
	}
	if err != nil {
		return nil, err
	}
	out := make([]inputport.LessonTextOption, 0, len(rows))
	for _, r := range rows {
		out = append(out, inputport.LessonTextOption{ID: r.ID, Label: r.Label})
	}
	return out, nil
}

// maxLessonTextOptionsSearchRunes caps the length of an Options search text (#5078):
// a longer text is cut, on a rune boundary, before it reaches a store.
const maxLessonTextOptionsSearchRunes = 200

// sanitizeLessonTextOptionsSearch makes an Options search text safe for every store:
// invalid UTF-8 and NUL bytes are dropped (PostgreSQL and MongoDB error on
// both) and the text is cut to maxLessonTextOptionsSearchRunes runes.
func sanitizeLessonTextOptionsSearch(search string) string {
	search = strings.ToValidUTF8(search, "")
	search = strings.ReplaceAll(search, "\x00", "")
	if r := []rune(search); len(r) > maxLessonTextOptionsSearchRunes {
		search = string(r[:maxLessonTextOptionsSearchRunes])
	}
	return search
}

// dedupeLessonTextOptionIDs drops repeated ids (keeping the first occurrence, in
// order) and then keeps at most limit of them, so duplicates cannot crowd a
// distinct id out of the cap.
func dedupeLessonTextOptionIDs(ids []string, limit int) []string {
	if len(ids) == 0 {
		return nil
	}
	seen := make(map[string]struct{}, len(ids))
	out := make([]string, 0, len(ids))
	for _, id := range ids {
		if _, dup := seen[id]; dup {
			continue
		}
		seen[id] = struct{}{}
		out = append(out, id)
		if len(out) == limit {
			break
		}
	}
	return out
}

// filterLessonTextOptionRows is searchOptions' fallback for an adapter that
// lacks the OptionsSearcher capability: keep the rows whose id is in ids (when
// given) and whose label contains search, case-insensitively.
func filterLessonTextOptionRows(rows []outputport.LessonTextOptionRow, search string, ids []string) []outputport.LessonTextOptionRow {
	if len(ids) > 0 {
		want := make(map[string]struct{}, len(ids))
		for _, id := range ids {
			want[id] = struct{}{}
		}
		kept := make([]outputport.LessonTextOptionRow, 0, len(rows))
		for _, r := range rows {
			if _, ok := want[r.ID]; ok {
				kept = append(kept, r)
			}
		}
		rows = kept
	}
	return listfilter.SubstringMatch(rows, search, func(r outputport.LessonTextOptionRow) string { return r.Label })
}

// ListOptions returns the same dropdown rows as Options. It is a thin
// convenience that bypasses the LessonTextOptionsQuery wrapper for
// callers that already hold a concrete *Service handle (e.g. an HTMX
// handler pre-fetching options for a CreateForm FieldSelect). The
// return type — []inputport.LessonTextOption — is intentionally
// port-level (not view-level) so this method does NOT pull a
// hexago/runtime/view dependency into the core/service package. Core
// must not import view; the conversion to the transport's option
// type (e.g. view.SelectOption for HTMX) belongs at the adapter
// boundary, where the handler invokes ListOptions and maps each
// entry to its rendering shape. This is a convenience method on the
// concrete *Service — it is NOT part of the
// inputport.LessonTextService interface, so callers must use the
// concrete type (or add a local interface if they prefer abstraction).
//
// Wire example in an HTMX handler that needs to populate a
// view.FieldSelect{Options: ...} before rendering the create form:
//
//	opts, err := concreteSvc.ListOptions(r.Context())
//	if err != nil {
//	    h.writeError(w, err)
//	    return
//	}
//	selectOpts := make([]view.SelectOption, 0, len(opts))
//	for _, o := range opts {
//	    selectOpts = append(selectOpts, view.SelectOption{Value: o.ID, Label: o.Label})
//	}
//	// pass selectOpts to the view builder that owns the CreateForm.
func (s *Service) ListOptions(ctx context.Context) ([]inputport.LessonTextOption, error) {
	rows, err := s.repo.ListOptions(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]inputport.LessonTextOption, 0, len(rows))
	for _, r := range rows {
		out = append(out, inputport.LessonTextOption{ID: r.ID, Label: r.Label})
	}
	return out, nil
}

func (s *Service) Update(ctx context.Context, cmd inputport.UpdateLessonTextCommand) (*inputport.LessonTextResponse, error) {
	// validateRefs runs PRE-TRANSACTION on the outer ctx so each goroutine
	// draws a fresh pooled connection — safe on PostgreSQL (pgx.Tx is not
	// concurrent-safe; running inside WithTransaction would cause goroutines
	// to share one connection → protocol desync, #1789).
	if err := s.validateLessonTextRefs(ctx, cmd.LessonID); err != nil {
		return nil, err
	}
	var result *inputport.LessonTextResponse
	err := s.txManager.WithTransaction(ctx, func(ctx context.Context) error {
		e, err := s.repo.FindByID(ctx, cmd.ID)
		if err != nil {
			if errors.Is(err, outputport.ErrNotFound) {
				return inputport.ErrLessonTextNotFound
			}
			return err
		}
		if err := e.ApplyUpdate(cmd.LessonID, cmd.Locale, cmd.Title, cmd.Body); err != nil {
			return err
		}
		if err := s.repo.Update(ctx, e); err != nil {
			if errors.Is(err, outputport.ErrNotFound) {
				return inputport.ErrLessonTextNotFound
			}
			// A storage-level UNIQUE index refused the new values (a slug /
			// sequence / scalar `unique: true` column, a hand-written index,
			// or a `unique: true` ref a racing Update claimed — #3540). Map
			// ErrAlreadyExists → ErrLessonTextAlreadyExists (Conflict → 409)
			// exactly as Create does (#4972), not the 500 an uncategorised
			// error gets; a field-named refinement, if any, follows the tx.
			if errors.Is(err, outputport.ErrAlreadyExists) {
				return inputport.ErrLessonTextAlreadyExists
			}
			return err
		}
		result = lessontextToResponse(e)
		return nil
	})
	return result, err
}

func (s *Service) Delete(ctx context.Context, cmd inputport.DeleteLessonTextCommand) error {
	return s.txManager.WithTransaction(ctx, func(ctx context.Context) error {
		if err := s.repo.Delete(ctx, cmd.ID); err != nil {
			if errors.Is(err, outputport.ErrNotFound) {
				return inputport.ErrLessonTextNotFound
			}
			return err
		}
		return nil
	})
}

func lessontextToResponse(e *domain.LessonText) *inputport.LessonTextResponse {
	return &inputport.LessonTextResponse{
		ID:        e.ID(),
		Body:      e.Body(),
		LessonID:  e.LessonID(),
		Locale:    e.Locale(),
		Title:     e.Title(),
		CreatedAt: e.CreatedAt(),
		UpdatedAt: e.UpdatedAt(),
	}
}
