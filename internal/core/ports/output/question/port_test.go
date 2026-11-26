package questionrepo

import (
	"context"
	"errors"
	"testing"
	"time"

	domain "example.com/learnlab/internal/core/domain/question"
)

// fakeQuestionRepository is a hand-rolled implementation of the
// QuestionRepository outbound port. The compile-time
// `var _ ... = ...` assertion below pins the interface signature
// across regen — if someone adds a method to the port, this test stops
// compiling, so the contract change surfaces immediately instead of as
// a downstream service-build failure.
type fakeQuestionRepository struct{}

func (fakeQuestionRepository) Save(ctx context.Context, e *domain.Question) error {
	return nil
}

// FindByID — emitted whenever GetByID OR Update is present so this
// fake satisfies the (now Update-inclusive) output port interface
// (#1120). Under .Owned the signature gains the ownerID parameter so the
// fake matches the owner-scoped interface (owner-scoped CRUD §Q3).
func (fakeQuestionRepository) FindByID(ctx context.Context, id string) (*domain.Question, error) {
	return nil, nil
}
func (fakeQuestionRepository) List(ctx context.Context, limit, offset int) ([]*domain.Question, error) {
	return nil, nil
}

// ListFiltered pins the auto-emitted searchable-filter method on the
// outbound port (#1312). Emitted when filter.searchable is set AND a
// filter field named "search" or "q" is declared, OR when the entity has an
// enum-equality filter (UX-B). The fake returns nil/nil — the compile-time
// assertion below is the load-bearing contract.
func (fakeQuestionRepository) ListFiltered(ctx context.Context, search string, limit, offset int) ([]*domain.Question, error) {
	return nil, nil
}

// ListByLesson pins the auto-emitted ref-listing method on the
// outbound port (#403 sub-3). The fake returns nil/nil — the assertion
// that load-bears here is the compile-time interface satisfaction
// below, not the body. Under .Owned the signature gains ownerID.
func (fakeQuestionRepository) ListByLesson(ctx context.Context, refID string, limit, offset int) ([]*domain.Question, error) {
	return nil, nil
}

// CountByLesson pins the auto-emitted ref-count method on the outbound
// port (#2202). The fake returns 0/nil — load-bearing is the compile-time
// interface satisfaction below, not the body. Under .Owned the signature
// gains ownerID.
func (fakeQuestionRepository) CountByLesson(ctx context.Context, refID string) (int, error) {
	return 0, nil
}

// ListByLessonSince pins the auto-emitted keyset-paginated sibling of
// ListByLesson on the outbound port (#4237). The fake returns nil/nil —
// load-bearing is the compile-time interface satisfaction below, not the
// body. Under .Owned the signature gains ownerID.
func (fakeQuestionRepository) ListByLessonSince(ctx context.Context, refID string, afterCreatedAt time.Time, afterID string, limit int) ([]*domain.Question, error) {
	return nil, nil
}

// ListOptions pins the auto-emitted `[{id, label}]` projection method
// on the outbound port (#403 sub-5). Driven by the spec's
// `display_field:` declaration. The fake returns nil/nil — interface
// satisfaction is the load-bearing contract here, not behavior. Under
// .Owned the signature gains ownerID so the dropdown surface is
// owner-scoped (sec-pass3 #3/#35/#57 — §Q3).
func (fakeQuestionRepository) ListOptions(ctx context.Context) ([]QuestionOptionRow, error) {
	return nil, nil
}

// TestQuestionOptionsSearcher_IsAnOptionalCapability pins the
// frozen-adapter contract of #5078: the options-search method lives on a
// SEPARATE interface, so an adapter that only has ListOptions (the fake here
// models a hand-written or pre-#5078 one) still satisfies the port, and the
// service's type assertion for QuestionOptionsSearcher is what opts a
// store in. Folding SearchOptions into QuestionRepository would make
// this test fail to compile-assert and break every such adapter.
func TestQuestionOptionsSearcher_IsAnOptionalCapability(t *testing.T) {
	var repo QuestionRepository = fakeQuestionRepository{}
	if _, ok := repo.(QuestionOptionsSearcher); ok {
		t.Error("a ListOptions-only adapter satisfies QuestionOptionsSearcher; the capability must be opt-in")
	}
	var zero QuestionOptionsFilter
	if zero.Search != "" || len(zero.IDs) != 0 {
		t.Errorf("the zero QuestionOptionsFilter must select every row (like ListOptions), got %+v", zero)
	}
}

func (fakeQuestionRepository) Update(ctx context.Context, e *domain.Question) error {
	return nil
}
func (fakeQuestionRepository) Delete(ctx context.Context, id string) error {
	return nil
}

// Compile-time assertion: fakeQuestionRepository must satisfy
// QuestionRepository.
var _ QuestionRepository = (*fakeQuestionRepository)(nil)

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
