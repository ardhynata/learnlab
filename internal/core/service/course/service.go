package courseservice

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"strings" // the Options search sanitiser (#5078)
	"time"

	domain "example.com/learnlab/internal/core/domain/course"
	inputport "example.com/learnlab/internal/core/ports/input/course"
	outputport "example.com/learnlab/internal/core/ports/output/course"
	lessonrepo "example.com/learnlab/internal/core/ports/output/lesson"
	modulerepo "example.com/learnlab/internal/core/ports/output/module"
	pathrepo "example.com/learnlab/internal/core/ports/output/path"
	"github.com/inxpired/hexago/runtime/listfilter"
	"github.com/inxpired/hexago/runtime/txmanager"
)

// generateCourseID returns a random 128-bit hex identifier. Used by
// Create when the client does not supply an ID. Swap for a UUID/ULID library
// in application code if you need a specific format.
func generateCourseID() string {
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
		panic("generateCourseID: crypto/rand.Read: " + err.Error())
	}
	return hex.EncodeToString(b[:])
}

var _ inputport.CourseService = (*Service)(nil)

type Service struct {
	repo       outputport.CourseRepository
	pathRepo   pathrepo.PathRepository
	lessonRepo lessonrepo.LessonRepository
	moduleRepo modulerepo.ModuleRepository
	txManager  txmanager.TxManager
}

func NewService(
	repo outputport.CourseRepository,
	pathRepo pathrepo.PathRepository,
	lessonRepo lessonrepo.LessonRepository,
	moduleRepo modulerepo.ModuleRepository,
	txManager txmanager.TxManager,
) *Service {
	return &Service{
		repo:       repo,
		pathRepo:   pathRepo,
		lessonRepo: lessonRepo,
		moduleRepo: moduleRepo,
		txManager:  txManager,
	}
}

// onDeleteCascadeBatch bounds one ListBy page of the on_delete cascade loop
// in Delete. The loop re-lists at offset 0 after each deleted batch, so the
// size only caps per-roundtrip memory — not the total number of children
// removed.
const onDeleteCascadeBatch = 500

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
func (s *Service) validateCourseRefs(ctx context.Context, pathID string) error {
	if pathID != "" {
		// Same-context ref: a missed lookup surfaces as the producer's
		// own ErrNotFound sentinel (declared in the target entity's
		// output port package — pathrepo.ErrNotFound). Each generated
		// output port declares its own opaque sentinel so errors.Is does
		// pointer-identity comparison; using the consumer's self
		// outputport.ErrNotFound would NEVER match the target's sentinel
		// and the BadRequest translation would silently fall through to
		// the raw error → 5xx (#1311). Translate to the InvalidReference
		// sentinel so the handler's mapper lifts it to 400. Other
		// repository errors bubble up unchanged (handler routes them to
		// 5xx via errcat).
		if _, err := s.pathRepo.FindByID(ctx, pathID); err != nil {
			if errors.Is(err, pathrepo.ErrNotFound) {
				return inputport.ErrCoursePathIDInvalidReference
			}
			return err
		}
	}
	return nil
}

func (s *Service) Create(ctx context.Context, cmd inputport.CreateCourseCommand) (*inputport.CourseResponse, error) {
	// validateRefs runs PRE-TRANSACTION on the outer ctx so each goroutine
	// draws a fresh pooled connection — safe on PostgreSQL (pgx.Tx is not
	// concurrent-safe; running inside WithTransaction would cause goroutines
	// to share one connection → protocol desync, #1789).
	if err := s.validateCourseRefs(ctx, cmd.PathID); err != nil {
		return nil, err
	}
	var result *inputport.CourseResponse
	err := s.txManager.WithTransaction(ctx, func(ctx context.Context) error {
		if cmd.ID == "" {
			cmd.ID = generateCourseID()
		}
		e, err := domain.NewCourse(cmd.ID, cmd.PathID, cmd.Slug, cmd.Title, cmd.Summary, cmd.Topic, cmd.Level, cmd.Position)
		if err != nil {
			return err
		}
		if err := s.repo.Save(ctx, e); err != nil {
			if errors.Is(err, outputport.ErrAlreadyExists) {
				return inputport.ErrCourseAlreadyExists
			}
			return err
		}
		result = courseToResponse(e)
		return nil
	})
	// Single-scalar-unique refinement (#4484): slug
	// is this entity's ONLY unique-index source, so a generic AlreadyExists can
	// only be its collision (the id is a generated UUID). Name the field so the
	// operator is told WHICH value to change instead of a bare "already exists".
	if errors.Is(err, inputport.ErrCourseAlreadyExists) {
		return nil, inputport.ErrCourseSlugAlreadyExists
	}
	return result, err
}

func (s *Service) GetByID(ctx context.Context, q inputport.GetCourseByIDQuery) (*inputport.CourseResponse, error) {
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
			return nil, inputport.ErrCourseNotFound
		}
		return nil, err
	}
	return courseToResponse(e), nil
}

func (s *Service) List(ctx context.Context, q inputport.ListCourseQuery) ([]*inputport.CourseResponse, error) {
	// UX-B enum filter dropdowns: build the enum-equality map from the query's
	// enum filter fields (empty values are omitted so an unselected "— all —"
	// dropdown applies no predicate), then route through ListFiltered when a
	// search term (q.Search) is present OR any enum filter is
	// active. The repository AND-composes the search + enum-equality predicates.
	// Falls back to unfiltered List when neither is present.
	var (
		es  []*domain.Course
		err error
	)
	enumFilters := map[string]string{}
	if q.Level != "" {
		enumFilters["level"] = q.Level
	}
	if q.Search != "" || len(enumFilters) > 0 {
		es, err = s.repo.ListFiltered(ctx, q.Search, enumFilters, q.Limit, q.Offset)
	} else {
		es, err = s.repo.List(ctx, q.Limit, q.Offset)
	}
	if err != nil {
		return nil, err
	}
	out := make([]*inputport.CourseResponse, 0, len(es))
	for _, e := range es {
		out = append(out, courseToResponse(e))
	}
	return out, nil
}

// ListByPath returns the courses referencing the supplied PathID.
// Auto-emitted from the `ref: Path` declaration on this entity
// (#403 sub-3); replaces the prior hand-pattern of `List(limit=1000)`
// followed by an in-memory filter on PathID.
func (s *Service) ListByPath(ctx context.Context, q inputport.ListCourseByPathQuery) ([]*inputport.CourseResponse, error) {
	es, err := s.repo.ListByPath(ctx, q.PathID, q.Limit, q.Offset)
	if err != nil {
		return nil, err
	}
	out := make([]*inputport.CourseResponse, 0, len(es))
	for _, e := range es {
		out = append(out, courseToResponse(e))
	}
	return out, nil
}

// CountByPath returns the total number of course rows whose
// PathID equals PathID, without applying limit/offset. The REST
// listByPath handler calls this to populate the `total` envelope field
// with the true dataset-wide count rather than the page size (#2202).
func (s *Service) CountByPath(ctx context.Context, q inputport.ListCourseByPathQuery) (int, error) {
	return s.repo.CountByPath(ctx, q.PathID)
}

// ListByPathSince is the keyset-paginated sibling of ListByPath
// (#4237) — a thin pass-through to the repository's own ListByPathSince
// (see its godoc for the full keyset-vs-offset mechanism). Backs the gRPC
// ListByPathSince RPC a cross-service `derive:` rollup's derived-rows
// reader rides for its internal complete-scan loop; not part of the general
// REST/HTMX listing surface.
func (s *Service) ListByPathSince(ctx context.Context, refID string, afterCreatedAt time.Time, afterID string, limit int) ([]*inputport.CourseResponse, error) {
	es, err := s.repo.ListByPathSince(ctx, refID, afterCreatedAt, afterID, limit)
	if err != nil {
		return nil, err
	}
	out := make([]*inputport.CourseResponse, 0, len(es))
	for _, e := range es {
		out = append(out, courseToResponse(e))
	}
	return out, nil
}

// Options returns up to 1000 dropdown rows (#403 sub-5). Read-only —
// no transaction, no event publish — so it stays cheap on hot paths
// like create-form rendering. A query carrying Search and/or IDs is served
// by searchOptions instead (#5078).
func (s *Service) Options(ctx context.Context, q inputport.CourseOptionsQuery) ([]inputport.CourseOption, error) {
	if q.Search != "" || len(q.IDs) > 0 {
		return s.searchOptions(ctx, q)
	}
	rows, err := s.repo.ListOptions(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]inputport.CourseOption, 0, len(rows))
	for _, r := range rows {
		out = append(out, inputport.CourseOption{ID: r.ID, Label: r.Label})
	}
	return out, nil
}

// searchOptions serves an Options call narrowed by Search and/or IDs (#5078).
// The narrowing runs in the store, BEFORE its 1000-row LIMIT, through the
// optional outputport.CourseOptionsSearcher capability, so a row past the
// first 1000 labels is still found by text or by id. An adapter without the
// capability (hand-written, or generated before #5078) keeps the old
// behaviour: the windowed ListOptions rows, filtered in memory.
// The query is sanitised first, once, for every store: Search loses NUL bytes
// and invalid UTF-8 (PostgreSQL and MongoDB reject both) and is cut to
// maxCourseOptionsSearchRunes runes (SQLite's LIKE and MongoDB's regex refuse a
// very long pattern); IDs are de-duplicated BEFORE the 1000-id cap, so
// duplicate ids never push a distinct id past it.
func (s *Service) searchOptions(ctx context.Context, q inputport.CourseOptionsQuery) ([]inputport.CourseOption, error) {
	search := sanitizeCourseOptionsSearch(q.Search)
	ids := dedupeCourseOptionIDs(q.IDs, 1000)
	var (
		rows []outputport.CourseOptionRow
		err  error
	)
	if searcher, ok := s.repo.(outputport.CourseOptionsSearcher); ok {
		rows, err = searcher.SearchOptions(ctx, outputport.CourseOptionsFilter{Search: search, IDs: ids})
	} else {
		rows, err = s.repo.ListOptions(ctx)
		if err == nil {
			rows = filterCourseOptionRows(rows, search, ids)
		}
	}
	if err != nil {
		return nil, err
	}
	out := make([]inputport.CourseOption, 0, len(rows))
	for _, r := range rows {
		out = append(out, inputport.CourseOption{ID: r.ID, Label: r.Label})
	}
	return out, nil
}

// maxCourseOptionsSearchRunes caps the length of an Options search text (#5078):
// a longer text is cut, on a rune boundary, before it reaches a store.
const maxCourseOptionsSearchRunes = 200

// sanitizeCourseOptionsSearch makes an Options search text safe for every store:
// invalid UTF-8 and NUL bytes are dropped (PostgreSQL and MongoDB error on
// both) and the text is cut to maxCourseOptionsSearchRunes runes.
func sanitizeCourseOptionsSearch(search string) string {
	search = strings.ToValidUTF8(search, "")
	search = strings.ReplaceAll(search, "\x00", "")
	if r := []rune(search); len(r) > maxCourseOptionsSearchRunes {
		search = string(r[:maxCourseOptionsSearchRunes])
	}
	return search
}

// dedupeCourseOptionIDs drops repeated ids (keeping the first occurrence, in
// order) and then keeps at most limit of them, so duplicates cannot crowd a
// distinct id out of the cap.
func dedupeCourseOptionIDs(ids []string, limit int) []string {
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

// filterCourseOptionRows is searchOptions' fallback for an adapter that
// lacks the OptionsSearcher capability: keep the rows whose id is in ids (when
// given) and whose label contains search, case-insensitively.
func filterCourseOptionRows(rows []outputport.CourseOptionRow, search string, ids []string) []outputport.CourseOptionRow {
	if len(ids) > 0 {
		want := make(map[string]struct{}, len(ids))
		for _, id := range ids {
			want[id] = struct{}{}
		}
		kept := make([]outputport.CourseOptionRow, 0, len(rows))
		for _, r := range rows {
			if _, ok := want[r.ID]; ok {
				kept = append(kept, r)
			}
		}
		rows = kept
	}
	return listfilter.SubstringMatch(rows, search, func(r outputport.CourseOptionRow) string { return r.Label })
}

// ListOptions returns the same dropdown rows as Options. It is a thin
// convenience that bypasses the CourseOptionsQuery wrapper for
// callers that already hold a concrete *Service handle (e.g. an HTMX
// handler pre-fetching options for a CreateForm FieldSelect). The
// return type — []inputport.CourseOption — is intentionally
// port-level (not view-level) so this method does NOT pull a
// hexago/runtime/view dependency into the core/service package. Core
// must not import view; the conversion to the transport's option
// type (e.g. view.SelectOption for HTMX) belongs at the adapter
// boundary, where the handler invokes ListOptions and maps each
// entry to its rendering shape. This is a convenience method on the
// concrete *Service — it is NOT part of the
// inputport.CourseService interface, so callers must use the
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
func (s *Service) ListOptions(ctx context.Context) ([]inputport.CourseOption, error) {
	rows, err := s.repo.ListOptions(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]inputport.CourseOption, 0, len(rows))
	for _, r := range rows {
		out = append(out, inputport.CourseOption{ID: r.ID, Label: r.Label})
	}
	return out, nil
}

func (s *Service) Update(ctx context.Context, cmd inputport.UpdateCourseCommand) (*inputport.CourseResponse, error) {
	// validateRefs runs PRE-TRANSACTION on the outer ctx so each goroutine
	// draws a fresh pooled connection — safe on PostgreSQL (pgx.Tx is not
	// concurrent-safe; running inside WithTransaction would cause goroutines
	// to share one connection → protocol desync, #1789).
	if err := s.validateCourseRefs(ctx, cmd.PathID); err != nil {
		return nil, err
	}
	var result *inputport.CourseResponse
	err := s.txManager.WithTransaction(ctx, func(ctx context.Context) error {
		e, err := s.repo.FindByID(ctx, cmd.ID)
		if err != nil {
			if errors.Is(err, outputport.ErrNotFound) {
				return inputport.ErrCourseNotFound
			}
			return err
		}
		if err := e.ApplyUpdate(cmd.PathID, cmd.Slug, cmd.Title, cmd.Summary, cmd.Topic, cmd.Level, cmd.Position); err != nil {
			return err
		}
		if err := s.repo.Update(ctx, e); err != nil {
			if errors.Is(err, outputport.ErrNotFound) {
				return inputport.ErrCourseNotFound
			}
			// A storage-level UNIQUE index refused the new values (a slug /
			// sequence / scalar `unique: true` column, a hand-written index,
			// or a `unique: true` ref a racing Update claimed — #3540). Map
			// ErrAlreadyExists → ErrCourseAlreadyExists (Conflict → 409)
			// exactly as Create does (#4972), not the 500 an uncategorised
			// error gets; a field-named refinement, if any, follows the tx.
			if errors.Is(err, outputport.ErrAlreadyExists) {
				return inputport.ErrCourseAlreadyExists
			}
			return err
		}
		result = courseToResponse(e)
		return nil
	})
	// Single-scalar-unique refinement (#4484): slug
	// is this entity's ONLY unique-index source, so a generic AlreadyExists can
	// only be its collision. Name the field so the operator is told WHICH value
	// to change instead of a bare "already exists".
	if errors.Is(err, inputport.ErrCourseAlreadyExists) {
		return nil, inputport.ErrCourseSlugAlreadyExists
	}
	return result, err
}

func (s *Service) Delete(ctx context.Context, cmd inputport.DeleteCourseCommand) error {
	return s.txManager.WithTransaction(ctx, func(ctx context.Context) error {
		// on_delete: cascade (Lesson.course_id — Phase 2,
		// docs/design/relationships-and-computed-fields.md): delete the
		// referencing lessons FIRST, inside this same delete
		// transaction, through the child repository's Delete — so a
		// soft-delete child is soft-deleted (its repo Delete implements the
		// declared strategy). Pages of onDeleteCascadeBatch, re-listing at
		// offset 0 (survivors shift down; soft-deleted rows drop out of the
		// active-row filter). A concurrent ErrNotFound on one child is
		// tolerated — the row is already gone, which is the goal.
		for {
			lessonChildren, lessonListErr := s.lessonRepo.ListByCourse(ctx, cmd.ID, onDeleteCascadeBatch, 0)
			if lessonListErr != nil {
				return lessonListErr
			}
			for _, child := range lessonChildren {
				if derr := s.lessonRepo.Delete(ctx, child.ID()); derr != nil && !errors.Is(derr, lessonrepo.ErrNotFound) {
					return derr
				}
			}
			if len(lessonChildren) < onDeleteCascadeBatch {
				break
			}
		}
		// on_delete: cascade (Module.course_id — Phase 2,
		// docs/design/relationships-and-computed-fields.md): delete the
		// referencing modules FIRST, inside this same delete
		// transaction, through the child repository's Delete — so a
		// soft-delete child is soft-deleted (its repo Delete implements the
		// declared strategy). Pages of onDeleteCascadeBatch, re-listing at
		// offset 0 (survivors shift down; soft-deleted rows drop out of the
		// active-row filter). A concurrent ErrNotFound on one child is
		// tolerated — the row is already gone, which is the goal.
		for {
			moduleChildren, moduleListErr := s.moduleRepo.ListByCourse(ctx, cmd.ID, onDeleteCascadeBatch, 0)
			if moduleListErr != nil {
				return moduleListErr
			}
			for _, child := range moduleChildren {
				if derr := s.moduleRepo.Delete(ctx, child.ID()); derr != nil && !errors.Is(derr, modulerepo.ErrNotFound) {
					return derr
				}
			}
			if len(moduleChildren) < onDeleteCascadeBatch {
				break
			}
		}
		if err := s.repo.Delete(ctx, cmd.ID); err != nil {
			if errors.Is(err, outputport.ErrNotFound) {
				return inputport.ErrCourseNotFound
			}
			return err
		}
		return nil
	})
}

func courseToResponse(e *domain.Course) *inputport.CourseResponse {
	return &inputport.CourseResponse{
		ID:        e.ID(),
		Level:     e.Level(),
		PathID:    e.PathID(),
		Position:  e.Position(),
		Slug:      e.Slug(),
		Summary:   e.Summary(),
		Title:     e.Title(),
		Topic:     e.Topic(),
		CreatedAt: e.CreatedAt(),
		UpdatedAt: e.UpdatedAt(),
	}
}
