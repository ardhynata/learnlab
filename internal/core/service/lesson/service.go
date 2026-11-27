package lessonservice

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"strings" // the Options search sanitiser (#5078)
	"sync"    // validateRefs concurrent fan-out (#1696 item 5) — stdlib only, no new dep
	"time"

	domain "example.com/learnlab/internal/core/domain/lesson"
	inputport "example.com/learnlab/internal/core/ports/input/lesson"
	courserepo "example.com/learnlab/internal/core/ports/output/course"
	outputport "example.com/learnlab/internal/core/ports/output/lesson"
	modulerepo "example.com/learnlab/internal/core/ports/output/module"
	progressrepo "example.com/learnlab/internal/core/ports/output/progress"
	questionrepo "example.com/learnlab/internal/core/ports/output/question"
	"github.com/inxpired/hexago-runtime/listfilter"
	"github.com/inxpired/hexago-runtime/txmanager"
)

// generateLessonID returns a random 128-bit hex identifier. Used by
// Create when the client does not supply an ID. Swap for a UUID/ULID library
// in application code if you need a specific format.
func generateLessonID() string {
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
		panic("generateLessonID: crypto/rand.Read: " + err.Error())
	}
	return hex.EncodeToString(b[:])
}

var _ inputport.LessonService = (*Service)(nil)

type Service struct {
	repo         outputport.LessonRepository
	courseRepo   courserepo.CourseRepository
	moduleRepo   modulerepo.ModuleRepository
	progressRepo progressrepo.ProgressRepository
	questionRepo questionrepo.QuestionRepository
	txManager    txmanager.TxManager
}

func NewService(
	repo outputport.LessonRepository,
	courseRepo courserepo.CourseRepository,
	moduleRepo modulerepo.ModuleRepository,
	progressRepo progressrepo.ProgressRepository,
	questionRepo questionrepo.QuestionRepository,
	txManager txmanager.TxManager,
) *Service {
	return &Service{
		repo:         repo,
		courseRepo:   courseRepo,
		moduleRepo:   moduleRepo,
		progressRepo: progressRepo,
		questionRepo: questionRepo,
		txManager:    txManager,
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
//
// With 2 refs the existence checks fan out concurrently
// (#1696 item 5): each ref is verified in its own goroutine via a
// stdlib sync.WaitGroup; each goroutine draws its own pooled connection
// from the cancel-capable ctx derived below. After Wait the first non-nil
// error by REF DECLARATION ORDER (not goroutine-finish order) is returned
// so the error surfaced is deterministic regardless of scheduling — it
// matches the sequential single-ref path's first-failing-ref rule and
// preserves every per-ref sentinel/error shape verbatim.
//
// A context.WithCancel derived from the caller's ctx is used so that once
// the first goroutine discovers an InvalidReference (or any error), the
// cancel call signals all still-running peers to abandon their in-flight
// RPCs (#2859). This is a latency optimisation: the result is already
// decided, so waiting on the slowest peer's full timeout is wasteful.
// The cancel is always deferred to ensure the derived ctx is cleaned up
// even when all refs are valid. The pgx.Tx constraint (#1789) is
// satisfied: each goroutine still draws a fresh pooled connection from
// the (now-cancellable) outer ctx, so no connection is shared.
func (s *Service) validateLessonRefs(ctx context.Context, courseID string, moduleID string) error {
	refCtx, refCancel := context.WithCancel(ctx)
	defer refCancel()
	var refWG sync.WaitGroup
	refErrs := make([]error, 2)
	refWG.Add(1)
	go func() {
		defer refWG.Done()
		// Run the per-ref check against refCtx so that when another goroutine
		// calls refCancel (on first error) the in-flight RPC here gets
		// cancelled too, freeing the connection early (#2859).
		if err := func() (refErr error) {
			// #5091: a panic in ANY per-ref check (a nil lookup port, a bug in a
			// hand-written adapter) must not escape this goroutine — an
			// unrecovered goroutine panic exits the WHOLE process, where the
			// same panic on the request goroutine is contained by the HTTP
			// server's per-request recover. Convert it into this ref's error
			// so the request fails alone (500) and the server stays up.
			defer func() {
				if rec := recover(); rec != nil {
					refErr = errors.New("validateLessonRefs: recovered from a panic while checking courseID")
				}
			}()
			if courseID == "" {
				return nil
			}
			// Same-context ref: a missed lookup surfaces as the producer's
			// own ErrNotFound sentinel (declared in the target entity's
			// output port package — courserepo.ErrNotFound). Each generated
			// output port declares its own opaque sentinel so errors.Is does
			// pointer-identity comparison; using the consumer's self
			// outputport.ErrNotFound would NEVER match the target's sentinel
			// and the BadRequest translation would silently fall through to
			// the raw error → 5xx (#1311). Translate to the InvalidReference
			// sentinel so the handler's mapper lifts it to 400. Other
			// repository errors bubble up unchanged (handler routes them to
			// 5xx via errcat).
			if _, err := s.courseRepo.FindByID(refCtx, courseID); err != nil {
				if errors.Is(err, courserepo.ErrNotFound) {
					return inputport.ErrLessonCourseIDInvalidReference
				}
				return err
			}
			return nil
		}(); err != nil {
			refErrs[0] = err
			refCancel() // abort sibling goroutines that are still in flight
		}
	}()
	refWG.Add(1)
	go func() {
		defer refWG.Done()
		// Run the per-ref check against refCtx so that when another goroutine
		// calls refCancel (on first error) the in-flight RPC here gets
		// cancelled too, freeing the connection early (#2859).
		if err := func() (refErr error) {
			// #5091: a panic in ANY per-ref check (a nil lookup port, a bug in a
			// hand-written adapter) must not escape this goroutine — an
			// unrecovered goroutine panic exits the WHOLE process, where the
			// same panic on the request goroutine is contained by the HTTP
			// server's per-request recover. Convert it into this ref's error
			// so the request fails alone (500) and the server stays up.
			defer func() {
				if rec := recover(); rec != nil {
					refErr = errors.New("validateLessonRefs: recovered from a panic while checking moduleID")
				}
			}()
			if moduleID == "" {
				return nil
			}
			// Same-context ref: a missed lookup surfaces as the producer's
			// own ErrNotFound sentinel (declared in the target entity's
			// output port package — modulerepo.ErrNotFound). Each generated
			// output port declares its own opaque sentinel so errors.Is does
			// pointer-identity comparison; using the consumer's self
			// outputport.ErrNotFound would NEVER match the target's sentinel
			// and the BadRequest translation would silently fall through to
			// the raw error → 5xx (#1311). Translate to the InvalidReference
			// sentinel so the handler's mapper lifts it to 400. Other
			// repository errors bubble up unchanged (handler routes them to
			// 5xx via errcat).
			if _, err := s.moduleRepo.FindByID(refCtx, moduleID); err != nil {
				if errors.Is(err, modulerepo.ErrNotFound) {
					return inputport.ErrLessonModuleIDInvalidReference
				}
				return err
			}
			return nil
		}(); err != nil {
			refErrs[1] = err
			refCancel() // abort sibling goroutines that are still in flight
		}
	}()
	refWG.Wait()
	// First non-nil error by ref-declaration index — deterministic
	// regardless of which goroutine finished first (#1696 item 5).
	//
	// #4395: a ref whose in-flight check was ABORTED by a sibling's refCancel
	// (once another ref was already found invalid, #2859) returns an error
	// wrapping context.Canceled. That aborted-in-flight error must NOT outrank a
	// genuine per-ref sentinel at a LATER declaration index: otherwise a
	// valid-but-slow ref[0] cancelled by an invalid fast ref[1] would surface
	// context.Canceled (→ 499) instead of the real InvalidReference sentinel
	// (→ 400), contradicting the "deterministic regardless of scheduling"
	// contract above. So return the first NON-cancelled non-nil error by
	// declaration index; fall back to a cancelled error only when EVERY non-nil
	// entry is context.Canceled (a genuinely cancelled caller ctx).
	var canceledErr error
	for _, err := range refErrs {
		switch {
		case err == nil:
			continue
		case errors.Is(err, context.Canceled):
			if canceledErr == nil {
				canceledErr = err
			}
		default:
			return err
		}
	}
	return canceledErr
}

func (s *Service) Create(ctx context.Context, cmd inputport.CreateLessonCommand) (*inputport.LessonResponse, error) {
	// validateRefs runs PRE-TRANSACTION on the outer ctx so each goroutine
	// draws a fresh pooled connection — safe on PostgreSQL (pgx.Tx is not
	// concurrent-safe; running inside WithTransaction would cause goroutines
	// to share one connection → protocol desync, #1789).
	if err := s.validateLessonRefs(ctx, cmd.CourseID, cmd.ModuleID); err != nil {
		return nil, err
	}
	var result *inputport.LessonResponse
	err := s.txManager.WithTransaction(ctx, func(ctx context.Context) error {
		if cmd.ID == "" {
			cmd.ID = generateLessonID()
		}
		e, err := domain.NewLesson(cmd.ID, cmd.CourseID, cmd.ModuleID, cmd.Slug, cmd.Title, cmd.Position, cmd.Minutes, cmd.Kind, cmd.Simulator, cmd.Body)
		if err != nil {
			return err
		}
		if err := s.repo.Save(ctx, e); err != nil {
			if errors.Is(err, outputport.ErrAlreadyExists) {
				return inputport.ErrLessonAlreadyExists
			}
			return err
		}
		result = lessonToResponse(e)
		return nil
	})
	return result, err
}

func (s *Service) GetByID(ctx context.Context, q inputport.GetLessonByIDQuery) (*inputport.LessonResponse, error) {
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
			return nil, inputport.ErrLessonNotFound
		}
		return nil, err
	}
	return lessonToResponse(e), nil
}

func (s *Service) List(ctx context.Context, q inputport.ListLessonQuery) ([]*inputport.LessonResponse, error) {
	// UX-B enum filter dropdowns: build the enum-equality map from the query's
	// enum filter fields (empty values are omitted so an unselected "— all —"
	// dropdown applies no predicate), then route through ListFiltered when a
	// search term (q.Search) is present OR any enum filter is
	// active. The repository AND-composes the search + enum-equality predicates.
	// Falls back to unfiltered List when neither is present.
	var (
		es  []*domain.Lesson
		err error
	)
	enumFilters := map[string]string{}
	if q.Kind != "" {
		enumFilters["kind"] = q.Kind
	}
	if q.Search != "" || len(enumFilters) > 0 {
		es, err = s.repo.ListFiltered(ctx, q.Search, enumFilters, q.Limit, q.Offset)
	} else {
		es, err = s.repo.List(ctx, q.Limit, q.Offset)
	}
	if err != nil {
		return nil, err
	}
	out := make([]*inputport.LessonResponse, 0, len(es))
	for _, e := range es {
		out = append(out, lessonToResponse(e))
	}
	return out, nil
}

// ListByCourse returns the lessons referencing the supplied CourseID.
// Auto-emitted from the `ref: Course` declaration on this entity
// (#403 sub-3); replaces the prior hand-pattern of `List(limit=1000)`
// followed by an in-memory filter on CourseID.
func (s *Service) ListByCourse(ctx context.Context, q inputport.ListLessonByCourseQuery) ([]*inputport.LessonResponse, error) {
	es, err := s.repo.ListByCourse(ctx, q.CourseID, q.Limit, q.Offset)
	if err != nil {
		return nil, err
	}
	out := make([]*inputport.LessonResponse, 0, len(es))
	for _, e := range es {
		out = append(out, lessonToResponse(e))
	}
	return out, nil
}

// CountByCourse returns the total number of lesson rows whose
// CourseID equals CourseID, without applying limit/offset. The REST
// listByCourse handler calls this to populate the `total` envelope field
// with the true dataset-wide count rather than the page size (#2202).
func (s *Service) CountByCourse(ctx context.Context, q inputport.ListLessonByCourseQuery) (int, error) {
	return s.repo.CountByCourse(ctx, q.CourseID)
}

// ListByCourseSince is the keyset-paginated sibling of ListByCourse
// (#4237) — a thin pass-through to the repository's own ListByCourseSince
// (see its godoc for the full keyset-vs-offset mechanism). Backs the gRPC
// ListByCourseSince RPC a cross-service `derive:` rollup's derived-rows
// reader rides for its internal complete-scan loop; not part of the general
// REST/HTMX listing surface.
func (s *Service) ListByCourseSince(ctx context.Context, refID string, afterCreatedAt time.Time, afterID string, limit int) ([]*inputport.LessonResponse, error) {
	es, err := s.repo.ListByCourseSince(ctx, refID, afterCreatedAt, afterID, limit)
	if err != nil {
		return nil, err
	}
	out := make([]*inputport.LessonResponse, 0, len(es))
	for _, e := range es {
		out = append(out, lessonToResponse(e))
	}
	return out, nil
}

// ListByModule returns the lessons referencing the supplied ModuleID.
// Auto-emitted from the `ref: Module` declaration on this entity
// (#403 sub-3); replaces the prior hand-pattern of `List(limit=1000)`
// followed by an in-memory filter on ModuleID.
func (s *Service) ListByModule(ctx context.Context, q inputport.ListLessonByModuleQuery) ([]*inputport.LessonResponse, error) {
	es, err := s.repo.ListByModule(ctx, q.ModuleID, q.Limit, q.Offset)
	if err != nil {
		return nil, err
	}
	out := make([]*inputport.LessonResponse, 0, len(es))
	for _, e := range es {
		out = append(out, lessonToResponse(e))
	}
	return out, nil
}

// CountByModule returns the total number of lesson rows whose
// ModuleID equals ModuleID, without applying limit/offset. The REST
// listByModule handler calls this to populate the `total` envelope field
// with the true dataset-wide count rather than the page size (#2202).
func (s *Service) CountByModule(ctx context.Context, q inputport.ListLessonByModuleQuery) (int, error) {
	return s.repo.CountByModule(ctx, q.ModuleID)
}

// ListByModuleSince is the keyset-paginated sibling of ListByModule
// (#4237) — a thin pass-through to the repository's own ListByModuleSince
// (see its godoc for the full keyset-vs-offset mechanism). Backs the gRPC
// ListByModuleSince RPC a cross-service `derive:` rollup's derived-rows
// reader rides for its internal complete-scan loop; not part of the general
// REST/HTMX listing surface.
func (s *Service) ListByModuleSince(ctx context.Context, refID string, afterCreatedAt time.Time, afterID string, limit int) ([]*inputport.LessonResponse, error) {
	es, err := s.repo.ListByModuleSince(ctx, refID, afterCreatedAt, afterID, limit)
	if err != nil {
		return nil, err
	}
	out := make([]*inputport.LessonResponse, 0, len(es))
	for _, e := range es {
		out = append(out, lessonToResponse(e))
	}
	return out, nil
}

// Options returns up to 1000 dropdown rows (#403 sub-5). Read-only —
// no transaction, no event publish — so it stays cheap on hot paths
// like create-form rendering. A query carrying Search and/or IDs is served
// by searchOptions instead (#5078).
func (s *Service) Options(ctx context.Context, q inputport.LessonOptionsQuery) ([]inputport.LessonOption, error) {
	if q.Search != "" || len(q.IDs) > 0 {
		return s.searchOptions(ctx, q)
	}
	rows, err := s.repo.ListOptions(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]inputport.LessonOption, 0, len(rows))
	for _, r := range rows {
		out = append(out, inputport.LessonOption{ID: r.ID, Label: r.Label})
	}
	return out, nil
}

// searchOptions serves an Options call narrowed by Search and/or IDs (#5078).
// The narrowing runs in the store, BEFORE its 1000-row LIMIT, through the
// optional outputport.LessonOptionsSearcher capability, so a row past the
// first 1000 labels is still found by text or by id. An adapter without the
// capability (hand-written, or generated before #5078) keeps the old
// behaviour: the windowed ListOptions rows, filtered in memory.
// The query is sanitised first, once, for every store: Search loses NUL bytes
// and invalid UTF-8 (PostgreSQL and MongoDB reject both) and is cut to
// maxLessonOptionsSearchRunes runes (SQLite's LIKE and MongoDB's regex refuse a
// very long pattern); IDs are de-duplicated BEFORE the 1000-id cap, so
// duplicate ids never push a distinct id past it.
func (s *Service) searchOptions(ctx context.Context, q inputport.LessonOptionsQuery) ([]inputport.LessonOption, error) {
	search := sanitizeLessonOptionsSearch(q.Search)
	ids := dedupeLessonOptionIDs(q.IDs, 1000)
	var (
		rows []outputport.LessonOptionRow
		err  error
	)
	if searcher, ok := s.repo.(outputport.LessonOptionsSearcher); ok {
		rows, err = searcher.SearchOptions(ctx, outputport.LessonOptionsFilter{Search: search, IDs: ids})
	} else {
		rows, err = s.repo.ListOptions(ctx)
		if err == nil {
			rows = filterLessonOptionRows(rows, search, ids)
		}
	}
	if err != nil {
		return nil, err
	}
	out := make([]inputport.LessonOption, 0, len(rows))
	for _, r := range rows {
		out = append(out, inputport.LessonOption{ID: r.ID, Label: r.Label})
	}
	return out, nil
}

// maxLessonOptionsSearchRunes caps the length of an Options search text (#5078):
// a longer text is cut, on a rune boundary, before it reaches a store.
const maxLessonOptionsSearchRunes = 200

// sanitizeLessonOptionsSearch makes an Options search text safe for every store:
// invalid UTF-8 and NUL bytes are dropped (PostgreSQL and MongoDB error on
// both) and the text is cut to maxLessonOptionsSearchRunes runes.
func sanitizeLessonOptionsSearch(search string) string {
	search = strings.ToValidUTF8(search, "")
	search = strings.ReplaceAll(search, "\x00", "")
	if r := []rune(search); len(r) > maxLessonOptionsSearchRunes {
		search = string(r[:maxLessonOptionsSearchRunes])
	}
	return search
}

// dedupeLessonOptionIDs drops repeated ids (keeping the first occurrence, in
// order) and then keeps at most limit of them, so duplicates cannot crowd a
// distinct id out of the cap.
func dedupeLessonOptionIDs(ids []string, limit int) []string {
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

// filterLessonOptionRows is searchOptions' fallback for an adapter that
// lacks the OptionsSearcher capability: keep the rows whose id is in ids (when
// given) and whose label contains search, case-insensitively.
func filterLessonOptionRows(rows []outputport.LessonOptionRow, search string, ids []string) []outputport.LessonOptionRow {
	if len(ids) > 0 {
		want := make(map[string]struct{}, len(ids))
		for _, id := range ids {
			want[id] = struct{}{}
		}
		kept := make([]outputport.LessonOptionRow, 0, len(rows))
		for _, r := range rows {
			if _, ok := want[r.ID]; ok {
				kept = append(kept, r)
			}
		}
		rows = kept
	}
	return listfilter.SubstringMatch(rows, search, func(r outputport.LessonOptionRow) string { return r.Label })
}

// ListOptions returns the same dropdown rows as Options. It is a thin
// convenience that bypasses the LessonOptionsQuery wrapper for
// callers that already hold a concrete *Service handle (e.g. an HTMX
// handler pre-fetching options for a CreateForm FieldSelect). The
// return type — []inputport.LessonOption — is intentionally
// port-level (not view-level) so this method does NOT pull a
// hexago/runtime/view dependency into the core/service package. Core
// must not import view; the conversion to the transport's option
// type (e.g. view.SelectOption for HTMX) belongs at the adapter
// boundary, where the handler invokes ListOptions and maps each
// entry to its rendering shape. This is a convenience method on the
// concrete *Service — it is NOT part of the
// inputport.LessonService interface, so callers must use the
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
func (s *Service) ListOptions(ctx context.Context) ([]inputport.LessonOption, error) {
	rows, err := s.repo.ListOptions(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]inputport.LessonOption, 0, len(rows))
	for _, r := range rows {
		out = append(out, inputport.LessonOption{ID: r.ID, Label: r.Label})
	}
	return out, nil
}

func (s *Service) Update(ctx context.Context, cmd inputport.UpdateLessonCommand) (*inputport.LessonResponse, error) {
	// validateRefs runs PRE-TRANSACTION on the outer ctx so each goroutine
	// draws a fresh pooled connection — safe on PostgreSQL (pgx.Tx is not
	// concurrent-safe; running inside WithTransaction would cause goroutines
	// to share one connection → protocol desync, #1789).
	if err := s.validateLessonRefs(ctx, cmd.CourseID, cmd.ModuleID); err != nil {
		return nil, err
	}
	var result *inputport.LessonResponse
	err := s.txManager.WithTransaction(ctx, func(ctx context.Context) error {
		e, err := s.repo.FindByID(ctx, cmd.ID)
		if err != nil {
			if errors.Is(err, outputport.ErrNotFound) {
				return inputport.ErrLessonNotFound
			}
			return err
		}
		if err := e.ApplyUpdate(cmd.CourseID, cmd.ModuleID, cmd.Slug, cmd.Title, cmd.Position, cmd.Minutes, cmd.Kind, cmd.Simulator, cmd.Body); err != nil {
			return err
		}
		if err := s.repo.Update(ctx, e); err != nil {
			if errors.Is(err, outputport.ErrNotFound) {
				return inputport.ErrLessonNotFound
			}
			// A storage-level UNIQUE index refused the new values (a slug /
			// sequence / scalar `unique: true` column, a hand-written index,
			// or a `unique: true` ref a racing Update claimed — #3540). Map
			// ErrAlreadyExists → ErrLessonAlreadyExists (Conflict → 409)
			// exactly as Create does (#4972), not the 500 an uncategorised
			// error gets; a field-named refinement, if any, follows the tx.
			if errors.Is(err, outputport.ErrAlreadyExists) {
				return inputport.ErrLessonAlreadyExists
			}
			return err
		}
		result = lessonToResponse(e)
		return nil
	})
	return result, err
}

func (s *Service) Delete(ctx context.Context, cmd inputport.DeleteLessonCommand) error {
	return s.txManager.WithTransaction(ctx, func(ctx context.Context) error {
		// on_delete: cascade (Progress.lesson_id — Phase 2,
		// docs/design/relationships-and-computed-fields.md): delete the
		// referencing progresses FIRST, inside this same delete
		// transaction, through the child repository's Delete — so a
		// soft-delete child is soft-deleted (its repo Delete implements the
		// declared strategy). Pages of onDeleteCascadeBatch, re-listing at
		// offset 0 (survivors shift down; soft-deleted rows drop out of the
		// active-row filter). A concurrent ErrNotFound on one child is
		// tolerated — the row is already gone, which is the goal.
		for {
			progressChildren, progressListErr := s.progressRepo.ListByLesson(ctx, cmd.ID, onDeleteCascadeBatch, 0)
			if progressListErr != nil {
				return progressListErr
			}
			for _, child := range progressChildren {
				if derr := s.progressRepo.Delete(ctx, child.ID()); derr != nil && !errors.Is(derr, progressrepo.ErrNotFound) {
					return derr
				}
			}
			if len(progressChildren) < onDeleteCascadeBatch {
				break
			}
		}
		// on_delete: cascade (Question.lesson_id — Phase 2,
		// docs/design/relationships-and-computed-fields.md): delete the
		// referencing questions FIRST, inside this same delete
		// transaction, through the child repository's Delete — so a
		// soft-delete child is soft-deleted (its repo Delete implements the
		// declared strategy). Pages of onDeleteCascadeBatch, re-listing at
		// offset 0 (survivors shift down; soft-deleted rows drop out of the
		// active-row filter). A concurrent ErrNotFound on one child is
		// tolerated — the row is already gone, which is the goal.
		for {
			questionChildren, questionListErr := s.questionRepo.ListByLesson(ctx, cmd.ID, onDeleteCascadeBatch, 0)
			if questionListErr != nil {
				return questionListErr
			}
			for _, child := range questionChildren {
				if derr := s.questionRepo.Delete(ctx, child.ID()); derr != nil && !errors.Is(derr, questionrepo.ErrNotFound) {
					return derr
				}
			}
			if len(questionChildren) < onDeleteCascadeBatch {
				break
			}
		}
		if err := s.repo.Delete(ctx, cmd.ID); err != nil {
			if errors.Is(err, outputport.ErrNotFound) {
				return inputport.ErrLessonNotFound
			}
			return err
		}
		return nil
	})
}

func lessonToResponse(e *domain.Lesson) *inputport.LessonResponse {
	return &inputport.LessonResponse{
		ID:        e.ID(),
		Body:      e.Body(),
		CourseID:  e.CourseID(),
		Kind:      e.Kind(),
		Minutes:   e.Minutes(),
		ModuleID:  e.ModuleID(),
		Position:  e.Position(),
		Simulator: e.Simulator(),
		Slug:      e.Slug(),
		Title:     e.Title(),
		CreatedAt: e.CreatedAt(),
		UpdatedAt: e.UpdatedAt(),
	}
}
