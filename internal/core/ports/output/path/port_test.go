package pathrepo

import (
	"context"
	"errors"
	"testing"

	domain "example.com/learnlab/internal/core/domain/path"
)

// fakePathRepository is a hand-rolled implementation of the
// PathRepository outbound port. The compile-time
// `var _ ... = ...` assertion below pins the interface signature
// across regen — if someone adds a method to the port, this test stops
// compiling, so the contract change surfaces immediately instead of as
// a downstream service-build failure.
type fakePathRepository struct{}

func (fakePathRepository) Save(ctx context.Context, e *domain.Path) error {
	return nil
}

// FindByID — emitted whenever GetByID OR Update is present so this
// fake satisfies the (now Update-inclusive) output port interface
// (#1120). Under .Owned the signature gains the ownerID parameter so the
// fake matches the owner-scoped interface (owner-scoped CRUD §Q3).
func (fakePathRepository) FindByID(ctx context.Context, id string) (*domain.Path, error) {
	return nil, nil
}
func (fakePathRepository) List(ctx context.Context, limit, offset int) ([]*domain.Path, error) {
	return nil, nil
}

// ListFiltered pins the auto-emitted searchable-filter method on the
// outbound port (#1312). Emitted when filter.searchable is set AND a
// filter field named "search" or "q" is declared, OR when the entity has an
// enum-equality filter (UX-B). The fake returns nil/nil — the compile-time
// assertion below is the load-bearing contract.
func (fakePathRepository) ListFiltered(ctx context.Context, search string, enumFilters map[string]string, limit, offset int) ([]*domain.Path, error) {
	return nil, nil
}

// ListOptions pins the auto-emitted `[{id, label}]` projection method
// on the outbound port (#403 sub-5). Driven by the spec's
// `display_field:` declaration. The fake returns nil/nil — interface
// satisfaction is the load-bearing contract here, not behavior. Under
// .Owned the signature gains ownerID so the dropdown surface is
// owner-scoped (sec-pass3 #3/#35/#57 — §Q3).
func (fakePathRepository) ListOptions(ctx context.Context) ([]PathOptionRow, error) {
	return nil, nil
}

// TestPathOptionsSearcher_IsAnOptionalCapability pins the
// frozen-adapter contract of #5078: the options-search method lives on a
// SEPARATE interface, so an adapter that only has ListOptions (the fake here
// models a hand-written or pre-#5078 one) still satisfies the port, and the
// service's type assertion for PathOptionsSearcher is what opts a
// store in. Folding SearchOptions into PathRepository would make
// this test fail to compile-assert and break every such adapter.
func TestPathOptionsSearcher_IsAnOptionalCapability(t *testing.T) {
	var repo PathRepository = fakePathRepository{}
	if _, ok := repo.(PathOptionsSearcher); ok {
		t.Error("a ListOptions-only adapter satisfies PathOptionsSearcher; the capability must be opt-in")
	}
	var zero PathOptionsFilter
	if zero.Search != "" || len(zero.IDs) != 0 {
		t.Errorf("the zero PathOptionsFilter must select every row (like ListOptions), got %+v", zero)
	}
}

func (fakePathRepository) Update(ctx context.Context, e *domain.Path) error {
	return nil
}
func (fakePathRepository) Delete(ctx context.Context, id string) error {
	return nil
}

// Compile-time assertion: fakePathRepository must satisfy
// PathRepository.
var _ PathRepository = (*fakePathRepository)(nil)

// TestRepositorySentinels pins the identity of the package-level
// sentinels. The service layer relies on `errors.Is` matching these,
// so a future regen that swaps `errors.New` for a different shape
// (e.g. an errcat-backed sentinel) must keep the identity intact.
func TestRepositorySentinels(t *testing.T) {
	cases := []struct {
		name string
		err  error
	}{
		{"not-found", ErrNotFound},
		{"already-exists", ErrAlreadyExists},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if tc.err == nil {
				t.Fatal("sentinel is nil")
			}
			wrapped := errors.New("wrap: " + tc.err.Error())
			if errors.Is(wrapped, tc.err) {
				t.Errorf("unrelated wrap unexpectedly matched %v", tc.err)
			}
			if !errors.Is(tc.err, tc.err) {
				t.Errorf("sentinel does not match itself: %v", tc.err)
			}
		})
	}
}
