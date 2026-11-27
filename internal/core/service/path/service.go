package pathservice

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"strings" // the Options search sanitiser (#5078)

	domain "example.com/learnlab/internal/core/domain/path"
	inputport "example.com/learnlab/internal/core/ports/input/path"
	outputport "example.com/learnlab/internal/core/ports/output/path"
	"github.com/inxpired/hexago-runtime/listfilter"
	"github.com/inxpired/hexago-runtime/txmanager"
)

// generatePathID returns a random 128-bit hex identifier. Used by
// Create when the client does not supply an ID. Swap for a UUID/ULID library
// in application code if you need a specific format.
func generatePathID() string {
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
		panic("generatePathID: crypto/rand.Read: " + err.Error())
	}
	return hex.EncodeToString(b[:])
}

var _ inputport.PathService = (*Service)(nil)

type Service struct {
	repo      outputport.PathRepository
	txManager txmanager.TxManager
}

func NewService(
	repo outputport.PathRepository,
	txManager txmanager.TxManager,
) *Service {
	return &Service{
		repo:      repo,
		txManager: txManager,
	}
}

func (s *Service) Create(ctx context.Context, cmd inputport.CreatePathCommand) (*inputport.PathResponse, error) {
	var result *inputport.PathResponse
	err := s.txManager.WithTransaction(ctx, func(ctx context.Context) error {
		if cmd.ID == "" {
			cmd.ID = generatePathID()
		}
		e, err := domain.NewPath(cmd.ID, cmd.Slug, cmd.Title, cmd.Summary, cmd.Level, cmd.Position, cmd.Requires)
		if err != nil {
			return err
		}
		if err := s.repo.Save(ctx, e); err != nil {
			if errors.Is(err, outputport.ErrAlreadyExists) {
				return inputport.ErrPathAlreadyExists
			}
			return err
		}
		result = pathToResponse(e)
		return nil
	})
	// Single-scalar-unique refinement (#4484): slug
	// is this entity's ONLY unique-index source, so a generic AlreadyExists can
	// only be its collision (the id is a generated UUID). Name the field so the
	// operator is told WHICH value to change instead of a bare "already exists".
	if errors.Is(err, inputport.ErrPathAlreadyExists) {
		return nil, inputport.ErrPathSlugAlreadyExists
	}
	return result, err
}

func (s *Service) GetByID(ctx context.Context, q inputport.GetPathByIDQuery) (*inputport.PathResponse, error) {
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
			return nil, inputport.ErrPathNotFound
		}
		return nil, err
	}
	return pathToResponse(e), nil
}

func (s *Service) List(ctx context.Context, q inputport.ListPathQuery) ([]*inputport.PathResponse, error) {
	// UX-B enum filter dropdowns: build the enum-equality map from the query's
	// enum filter fields (empty values are omitted so an unselected "— all —"
	// dropdown applies no predicate), then route through ListFiltered when a
	// search term (q.Search) is present OR any enum filter is
	// active. The repository AND-composes the search + enum-equality predicates.
	// Falls back to unfiltered List when neither is present.
	var (
		es  []*domain.Path
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
	out := make([]*inputport.PathResponse, 0, len(es))
	for _, e := range es {
		out = append(out, pathToResponse(e))
	}
	return out, nil
}

// Options returns up to 1000 dropdown rows (#403 sub-5). Read-only —
// no transaction, no event publish — so it stays cheap on hot paths
// like create-form rendering. A query carrying Search and/or IDs is served
// by searchOptions instead (#5078).
func (s *Service) Options(ctx context.Context, q inputport.PathOptionsQuery) ([]inputport.PathOption, error) {
	if q.Search != "" || len(q.IDs) > 0 {
		return s.searchOptions(ctx, q)
	}
	rows, err := s.repo.ListOptions(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]inputport.PathOption, 0, len(rows))
	for _, r := range rows {
		out = append(out, inputport.PathOption{ID: r.ID, Label: r.Label})
	}
	return out, nil
}

// searchOptions serves an Options call narrowed by Search and/or IDs (#5078).
// The narrowing runs in the store, BEFORE its 1000-row LIMIT, through the
// optional outputport.PathOptionsSearcher capability, so a row past the
// first 1000 labels is still found by text or by id. An adapter without the
// capability (hand-written, or generated before #5078) keeps the old
// behaviour: the windowed ListOptions rows, filtered in memory.
// The query is sanitised first, once, for every store: Search loses NUL bytes
// and invalid UTF-8 (PostgreSQL and MongoDB reject both) and is cut to
// maxPathOptionsSearchRunes runes (SQLite's LIKE and MongoDB's regex refuse a
// very long pattern); IDs are de-duplicated BEFORE the 1000-id cap, so
// duplicate ids never push a distinct id past it.
func (s *Service) searchOptions(ctx context.Context, q inputport.PathOptionsQuery) ([]inputport.PathOption, error) {
	search := sanitizePathOptionsSearch(q.Search)
	ids := dedupePathOptionIDs(q.IDs, 1000)
	var (
		rows []outputport.PathOptionRow
		err  error
	)
	if searcher, ok := s.repo.(outputport.PathOptionsSearcher); ok {
		rows, err = searcher.SearchOptions(ctx, outputport.PathOptionsFilter{Search: search, IDs: ids})
	} else {
		rows, err = s.repo.ListOptions(ctx)
		if err == nil {
			rows = filterPathOptionRows(rows, search, ids)
		}
	}
	if err != nil {
		return nil, err
	}
	out := make([]inputport.PathOption, 0, len(rows))
	for _, r := range rows {
		out = append(out, inputport.PathOption{ID: r.ID, Label: r.Label})
	}
	return out, nil
}

// maxPathOptionsSearchRunes caps the length of an Options search text (#5078):
// a longer text is cut, on a rune boundary, before it reaches a store.
const maxPathOptionsSearchRunes = 200

// sanitizePathOptionsSearch makes an Options search text safe for every store:
// invalid UTF-8 and NUL bytes are dropped (PostgreSQL and MongoDB error on
// both) and the text is cut to maxPathOptionsSearchRunes runes.
func sanitizePathOptionsSearch(search string) string {
	search = strings.ToValidUTF8(search, "")
	search = strings.ReplaceAll(search, "\x00", "")
	if r := []rune(search); len(r) > maxPathOptionsSearchRunes {
		search = string(r[:maxPathOptionsSearchRunes])
	}
	return search
}

// dedupePathOptionIDs drops repeated ids (keeping the first occurrence, in
// order) and then keeps at most limit of them, so duplicates cannot crowd a
// distinct id out of the cap.
func dedupePathOptionIDs(ids []string, limit int) []string {
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

// filterPathOptionRows is searchOptions' fallback for an adapter that
// lacks the OptionsSearcher capability: keep the rows whose id is in ids (when
// given) and whose label contains search, case-insensitively.
func filterPathOptionRows(rows []outputport.PathOptionRow, search string, ids []string) []outputport.PathOptionRow {
	if len(ids) > 0 {
		want := make(map[string]struct{}, len(ids))
		for _, id := range ids {
			want[id] = struct{}{}
		}
		kept := make([]outputport.PathOptionRow, 0, len(rows))
		for _, r := range rows {
			if _, ok := want[r.ID]; ok {
				kept = append(kept, r)
			}
		}
		rows = kept
	}
	return listfilter.SubstringMatch(rows, search, func(r outputport.PathOptionRow) string { return r.Label })
}

// ListOptions returns the same dropdown rows as Options. It is a thin
// convenience that bypasses the PathOptionsQuery wrapper for
// callers that already hold a concrete *Service handle (e.g. an HTMX
// handler pre-fetching options for a CreateForm FieldSelect). The
// return type — []inputport.PathOption — is intentionally
// port-level (not view-level) so this method does NOT pull a
// hexago/runtime/view dependency into the core/service package. Core
// must not import view; the conversion to the transport's option
// type (e.g. view.SelectOption for HTMX) belongs at the adapter
// boundary, where the handler invokes ListOptions and maps each
// entry to its rendering shape. This is a convenience method on the
// concrete *Service — it is NOT part of the
// inputport.PathService interface, so callers must use the
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
func (s *Service) ListOptions(ctx context.Context) ([]inputport.PathOption, error) {
	rows, err := s.repo.ListOptions(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]inputport.PathOption, 0, len(rows))
	for _, r := range rows {
		out = append(out, inputport.PathOption{ID: r.ID, Label: r.Label})
	}
	return out, nil
}

func (s *Service) Update(ctx context.Context, cmd inputport.UpdatePathCommand) (*inputport.PathResponse, error) {
	var result *inputport.PathResponse
	err := s.txManager.WithTransaction(ctx, func(ctx context.Context) error {
		e, err := s.repo.FindByID(ctx, cmd.ID)
		if err != nil {
			if errors.Is(err, outputport.ErrNotFound) {
				return inputport.ErrPathNotFound
			}
			return err
		}
		if err := e.ApplyUpdate(cmd.Slug, cmd.Title, cmd.Summary, cmd.Level, cmd.Position, cmd.Requires); err != nil {
			return err
		}
		if err := s.repo.Update(ctx, e); err != nil {
			if errors.Is(err, outputport.ErrNotFound) {
				return inputport.ErrPathNotFound
			}
			// A storage-level UNIQUE index refused the new values (a slug /
			// sequence / scalar `unique: true` column, a hand-written index,
			// or a `unique: true` ref a racing Update claimed — #3540). Map
			// ErrAlreadyExists → ErrPathAlreadyExists (Conflict → 409)
			// exactly as Create does (#4972), not the 500 an uncategorised
			// error gets; a field-named refinement, if any, follows the tx.
			if errors.Is(err, outputport.ErrAlreadyExists) {
				return inputport.ErrPathAlreadyExists
			}
			return err
		}
		result = pathToResponse(e)
		return nil
	})
	// Single-scalar-unique refinement (#4484): slug
	// is this entity's ONLY unique-index source, so a generic AlreadyExists can
	// only be its collision. Name the field so the operator is told WHICH value
	// to change instead of a bare "already exists".
	if errors.Is(err, inputport.ErrPathAlreadyExists) {
		return nil, inputport.ErrPathSlugAlreadyExists
	}
	return result, err
}

func (s *Service) Delete(ctx context.Context, cmd inputport.DeletePathCommand) error {
	return s.txManager.WithTransaction(ctx, func(ctx context.Context) error {
		if err := s.repo.Delete(ctx, cmd.ID); err != nil {
			if errors.Is(err, outputport.ErrNotFound) {
				return inputport.ErrPathNotFound
			}
			return err
		}
		return nil
	})
}

func pathToResponse(e *domain.Path) *inputport.PathResponse {
	return &inputport.PathResponse{
		ID:        e.ID(),
		Level:     e.Level(),
		Position:  e.Position(),
		Requires:  e.Requires(),
		Slug:      e.Slug(),
		Summary:   e.Summary(),
		Title:     e.Title(),
		CreatedAt: e.CreatedAt(),
		UpdatedAt: e.UpdatedAt(),
	}
}
