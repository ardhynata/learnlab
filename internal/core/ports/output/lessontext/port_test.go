package lessontextrepo

import (
	"context"
	"errors"
	"testing"
	"time"

	domain "example.com/learnlab/internal/core/domain/lessontext"
)

// fakeLessonTextRepository is a hand-rolled implementation of the
// LessonTextRepository outbound port. The compile-time
// `var _ ... = ...` assertion below pins the interface signature
// across regen — if someone adds a method to the port, this test stops
// compiling, so the contract change surfaces immediately instead of as
// a downstream service-build failure.
type fakeLessonTextRepository struct{}

func (fakeLessonTextRepository) Save(ctx context.Context, e *domain.LessonText) error {
	return nil
}

// FindByID — emitted whenever GetByID OR Update is present so this
// fake satisfies the (now Update-inclusive) output port interface
// (#1120). Under .Owned the signature gains the ownerID parameter so the
// fake matches the owner-scoped interface (owner-scoped CRUD §Q3).
func (fakeLessonTextRepository) FindByID(ctx context.Context, id string) (*domain.LessonText, error) {
	return nil, nil
}
func (fakeLessonTextRepository) List(ctx context.Context, limit, offset int) ([]*domain.LessonText, error) {
	return nil, nil
}

// ListFiltered pins the auto-emitted searchable-filter method on the
// outbound port (#1312). Emitted when filter.searchable is set AND a
// filter field named "search" or "q" is declared, OR when the entity has an
// enum-equality filter (UX-B). The fake returns nil/nil — the compile-time
// assertion below is the load-bearing contract.
func (fakeLessonTextRepository) ListFiltered(ctx context.Context, search string, limit, offset int) ([]*domain.LessonText, error) {
	return nil, nil
}

// ListByLesson pins the auto-emitted ref-listing method on the
// outbound port (#403 sub-3). The fake returns nil/nil — the assertion
// that load-bears here is the compile-time interface satisfaction
// below, not the body. Under .Owned the signature gains ownerID.
func (fakeLessonTextRepository) ListByLesson(ctx context.Context, refID string, limit, offset int) ([]*domain.LessonText, error) {
	return nil, nil
}

// CountByLesson pins the auto-emitted ref-count method on the outbound
// port (#2202). The fake returns 0/nil — load-bearing is the compile-time
// interface satisfaction below, not the body. Under .Owned the signature
// gains ownerID.
func (fakeLessonTextRepository) CountByLesson(ctx context.Context, refID string) (int, error) {
	return 0, nil
}

// ListByLessonSince pins the auto-emitted keyset-paginated sibling of
// ListByLesson on the outbound port (#4237). The fake returns nil/nil —
// load-bearing is the compile-time interface satisfaction below, not the
// body. Under .Owned the signature gains ownerID.
func (fakeLessonTextRepository) ListByLessonSince(ctx context.Context, refID string, afterCreatedAt time.Time, afterID string, limit int) ([]*domain.LessonText, error) {
	return nil, nil
}

// ListOptions pins the auto-emitted `[{id, label}]` projection method
// on the outbound port (#403 sub-5). Driven by the spec's
// `display_field:` declaration. The fake returns nil/nil — interface
// satisfaction is the load-bearing contract here, not behavior. Under
// .Owned the signature gains ownerID so the dropdown surface is
// owner-scoped (sec-pass3 #3/#35/#57 — §Q3).
func (fakeLessonTextRepository) ListOptions(ctx context.Context) ([]LessonTextOptionRow, error) {
	return nil, nil
}

// TestLessonTextOptionsSearcher_IsAnOptionalCapability pins the
// frozen-adapter contract of #5078: the options-search method lives on a
// SEPARATE interface, so an adapter that only has ListOptions (the fake here
// models a hand-written or pre-#5078 one) still satisfies the port, and the
// service's type assertion for LessonTextOptionsSearcher is what opts a
// store in. Folding SearchOptions into LessonTextRepository would make
// this test fail to compile-assert and break every such adapter.
func TestLessonTextOptionsSearcher_IsAnOptionalCapability(t *testing.T) {
	var repo LessonTextRepository = fakeLessonTextRepository{}
	if _, ok := repo.(LessonTextOptionsSearcher); ok {
		t.Error("a ListOptions-only adapter satisfies LessonTextOptionsSearcher; the capability must be opt-in")
	}
	var zero LessonTextOptionsFilter
	if zero.Search != "" || len(zero.IDs) != 0 {
		t.Errorf("the zero LessonTextOptionsFilter must select every row (like ListOptions), got %+v", zero)
	}
}

func (fakeLessonTextRepository) Update(ctx context.Context, e *domain.LessonText) error {
	return nil
}
func (fakeLessonTextRepository) Delete(ctx context.Context, id string) error {
	return nil
}

// Compile-time assertion: fakeLessonTextRepository must satisfy
// LessonTextRepository.
var _ LessonTextRepository = (*fakeLessonTextRepository)(nil)

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
