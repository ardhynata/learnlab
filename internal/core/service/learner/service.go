package learnerservice

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"strings" // the Options search sanitiser (#5078)

	domain "example.com/learnlab/internal/core/domain/learner"
	inputport "example.com/learnlab/internal/core/ports/input/learner"
	outputport "example.com/learnlab/internal/core/ports/output/learner"
	progressrepo "example.com/learnlab/internal/core/ports/output/progress"
	"github.com/inxpired/hexago-runtime/listfilter"
	"github.com/inxpired/hexago-runtime/txmanager"
)

// generateLearnerID returns a random 128-bit hex identifier. Used by
// Create when the client does not supply an ID. Swap for a UUID/ULID library
// in application code if you need a specific format.
func generateLearnerID() string {
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
		panic("generateLearnerID: crypto/rand.Read: " + err.Error())
	}
	return hex.EncodeToString(b[:])
}

var _ inputport.LearnerService = (*Service)(nil)

type Service struct {
	repo         outputport.LearnerRepository
	progressRepo progressrepo.ProgressRepository
	txManager    txmanager.TxManager
}

func NewService(
	repo outputport.LearnerRepository,
	progressRepo progressrepo.ProgressRepository,
	txManager txmanager.TxManager,
) *Service {
	return &Service{
		repo:         repo,
		progressRepo: progressRepo,
		txManager:    txManager,
	}
}

// onDeleteCascadeBatch bounds one ListBy page of the on_delete cascade loop
// in Delete. The loop re-lists at offset 0 after each deleted batch, so the
// size only caps per-roundtrip memory — not the total number of children
// removed.
const onDeleteCascadeBatch = 500

func (s *Service) Create(ctx context.Context, cmd inputport.CreateLearnerCommand) (*inputport.LearnerResponse, error) {
	var result *inputport.LearnerResponse
	err := s.txManager.WithTransaction(ctx, func(ctx context.Context) error {
		if cmd.ID == "" {
			cmd.ID = generateLearnerID()
		}
		e, err := domain.NewLearner(cmd.ID, cmd.Name)
		if err != nil {
			return err
		}
		if err := s.repo.Save(ctx, e); err != nil {
			if errors.Is(err, outputport.ErrAlreadyExists) {
				return inputport.ErrLearnerAlreadyExists
			}
			return err
		}
		result = learnerToResponse(e)
		return nil
	})
	return result, err
}

func (s *Service) GetByID(ctx context.Context, q inputport.GetLearnerByIDQuery) (*inputport.LearnerResponse, error) {
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
			return nil, inputport.ErrLearnerNotFound
		}
		return nil, err
	}
	return learnerToResponse(e), nil
}

func (s *Service) List(ctx context.Context, q inputport.ListLearnerQuery) ([]*inputport.LearnerResponse, error) {
	// filter.searchable is set (#1300): route through ListFiltered when the
	// search param (q.Search) is non-empty so the
	// repository applies the ILIKE/LIKE predicates on searchable columns.
	// Falls back to unfiltered List when search is "".
	var (
		es  []*domain.Learner
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
	out := make([]*inputport.LearnerResponse, 0, len(es))
	for _, e := range es {
		out = append(out, learnerToResponse(e))
	}
	return out, nil
}

// Options returns up to 1000 dropdown rows (#403 sub-5). Read-only —
// no transaction, no event publish — so it stays cheap on hot paths
// like create-form rendering. A query carrying Search and/or IDs is served
// by searchOptions instead (#5078).
func (s *Service) Options(ctx context.Context, q inputport.LearnerOptionsQuery) ([]inputport.LearnerOption, error) {
	if q.Search != "" || len(q.IDs) > 0 {
		return s.searchOptions(ctx, q)
	}
	rows, err := s.repo.ListOptions(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]inputport.LearnerOption, 0, len(rows))
	for _, r := range rows {
		out = append(out, inputport.LearnerOption{ID: r.ID, Label: r.Label})
	}
	return out, nil
}

// searchOptions serves an Options call narrowed by Search and/or IDs (#5078).
// The narrowing runs in the store, BEFORE its 1000-row LIMIT, through the
// optional outputport.LearnerOptionsSearcher capability, so a row past the
// first 1000 labels is still found by text or by id. An adapter without the
// capability (hand-written, or generated before #5078) keeps the old
// behaviour: the windowed ListOptions rows, filtered in memory.
// The query is sanitised first, once, for every store: Search loses NUL bytes
// and invalid UTF-8 (PostgreSQL and MongoDB reject both) and is cut to
// maxLearnerOptionsSearchRunes runes (SQLite's LIKE and MongoDB's regex refuse a
// very long pattern); IDs are de-duplicated BEFORE the 1000-id cap, so
// duplicate ids never push a distinct id past it.
func (s *Service) searchOptions(ctx context.Context, q inputport.LearnerOptionsQuery) ([]inputport.LearnerOption, error) {
	search := sanitizeLearnerOptionsSearch(q.Search)
	ids := dedupeLearnerOptionIDs(q.IDs, 1000)
	var (
		rows []outputport.LearnerOptionRow
		err  error
	)
	if searcher, ok := s.repo.(outputport.LearnerOptionsSearcher); ok {
		rows, err = searcher.SearchOptions(ctx, outputport.LearnerOptionsFilter{Search: search, IDs: ids})
	} else {
		rows, err = s.repo.ListOptions(ctx)
		if err == nil {
			rows = filterLearnerOptionRows(rows, search, ids)
		}
	}
	if err != nil {
		return nil, err
	}
	out := make([]inputport.LearnerOption, 0, len(rows))
	for _, r := range rows {
		out = append(out, inputport.LearnerOption{ID: r.ID, Label: r.Label})
	}
	return out, nil
}

// maxLearnerOptionsSearchRunes caps the length of an Options search text (#5078):
// a longer text is cut, on a rune boundary, before it reaches a store.
const maxLearnerOptionsSearchRunes = 200

// sanitizeLearnerOptionsSearch makes an Options search text safe for every store:
// invalid UTF-8 and NUL bytes are dropped (PostgreSQL and MongoDB error on
// both) and the text is cut to maxLearnerOptionsSearchRunes runes.
func sanitizeLearnerOptionsSearch(search string) string {
	search = strings.ToValidUTF8(search, "")
	search = strings.ReplaceAll(search, "\x00", "")
	if r := []rune(search); len(r) > maxLearnerOptionsSearchRunes {
		search = string(r[:maxLearnerOptionsSearchRunes])
	}
	return search
}

// dedupeLearnerOptionIDs drops repeated ids (keeping the first occurrence, in
// order) and then keeps at most limit of them, so duplicates cannot crowd a
// distinct id out of the cap.
func dedupeLearnerOptionIDs(ids []string, limit int) []string {
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

// filterLearnerOptionRows is searchOptions' fallback for an adapter that
// lacks the OptionsSearcher capability: keep the rows whose id is in ids (when
// given) and whose label contains search, case-insensitively.
func filterLearnerOptionRows(rows []outputport.LearnerOptionRow, search string, ids []string) []outputport.LearnerOptionRow {
	if len(ids) > 0 {
		want := make(map[string]struct{}, len(ids))
		for _, id := range ids {
			want[id] = struct{}{}
		}
		kept := make([]outputport.LearnerOptionRow, 0, len(rows))
		for _, r := range rows {
			if _, ok := want[r.ID]; ok {
				kept = append(kept, r)
			}
		}
		rows = kept
	}
	return listfilter.SubstringMatch(rows, search, func(r outputport.LearnerOptionRow) string { return r.Label })
}

// ListOptions returns the same dropdown rows as Options. It is a thin
// convenience that bypasses the LearnerOptionsQuery wrapper for
// callers that already hold a concrete *Service handle (e.g. an HTMX
// handler pre-fetching options for a CreateForm FieldSelect). The
// return type — []inputport.LearnerOption — is intentionally
// port-level (not view-level) so this method does NOT pull a
// hexago/runtime/view dependency into the core/service package. Core
// must not import view; the conversion to the transport's option
// type (e.g. view.SelectOption for HTMX) belongs at the adapter
// boundary, where the handler invokes ListOptions and maps each
// entry to its rendering shape. This is a convenience method on the
// concrete *Service — it is NOT part of the
// inputport.LearnerService interface, so callers must use the
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
func (s *Service) ListOptions(ctx context.Context) ([]inputport.LearnerOption, error) {
	rows, err := s.repo.ListOptions(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]inputport.LearnerOption, 0, len(rows))
	for _, r := range rows {
		out = append(out, inputport.LearnerOption{ID: r.ID, Label: r.Label})
	}
	return out, nil
}

func (s *Service) Update(ctx context.Context, cmd inputport.UpdateLearnerCommand) (*inputport.LearnerResponse, error) {
	var result *inputport.LearnerResponse
	err := s.txManager.WithTransaction(ctx, func(ctx context.Context) error {
		e, err := s.repo.FindByID(ctx, cmd.ID)
		if err != nil {
			if errors.Is(err, outputport.ErrNotFound) {
				return inputport.ErrLearnerNotFound
			}
			return err
		}
		if err := e.ApplyUpdate(cmd.Name); err != nil {
			return err
		}
		if err := s.repo.Update(ctx, e); err != nil {
			if errors.Is(err, outputport.ErrNotFound) {
				return inputport.ErrLearnerNotFound
			}
			// A storage-level UNIQUE index refused the new values (a slug /
			// sequence / scalar `unique: true` column, a hand-written index,
			// or a `unique: true` ref a racing Update claimed — #3540). Map
			// ErrAlreadyExists → ErrLearnerAlreadyExists (Conflict → 409)
			// exactly as Create does (#4972), not the 500 an uncategorised
			// error gets; a field-named refinement, if any, follows the tx.
			if errors.Is(err, outputport.ErrAlreadyExists) {
				return inputport.ErrLearnerAlreadyExists
			}
			return err
		}
		result = learnerToResponse(e)
		return nil
	})
	return result, err
}

func (s *Service) Delete(ctx context.Context, cmd inputport.DeleteLearnerCommand) error {
	return s.txManager.WithTransaction(ctx, func(ctx context.Context) error {
		// on_delete: cascade (Progress.learner_id — Phase 2,
		// docs/design/relationships-and-computed-fields.md): delete the
		// referencing progresses FIRST, inside this same delete
		// transaction, through the child repository's Delete — so a
		// soft-delete child is soft-deleted (its repo Delete implements the
		// declared strategy). Pages of onDeleteCascadeBatch, re-listing at
		// offset 0 (survivors shift down; soft-deleted rows drop out of the
		// active-row filter). A concurrent ErrNotFound on one child is
		// tolerated — the row is already gone, which is the goal.
		for {
			progressChildren, progressListErr := s.progressRepo.ListByLearner(ctx, cmd.ID, onDeleteCascadeBatch, 0)
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
		if err := s.repo.Delete(ctx, cmd.ID); err != nil {
			if errors.Is(err, outputport.ErrNotFound) {
				return inputport.ErrLearnerNotFound
			}
			return err
		}
		return nil
	})
}

func learnerToResponse(e *domain.Learner) *inputport.LearnerResponse {
	return &inputport.LearnerResponse{
		ID:        e.ID(),
		Name:      e.Name(),
		CreatedAt: e.CreatedAt(),
		UpdatedAt: e.UpdatedAt(),
	}
}
