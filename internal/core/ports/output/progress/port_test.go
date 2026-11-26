package progressrepo

import (
	"context"
	"errors"
	"testing"
	"time"

	domain "example.com/learnlab/internal/core/domain/progress"
)

// fakeProgressRepository is a hand-rolled implementation of the
// ProgressRepository outbound port. The compile-time
// `var _ ... = ...` assertion below pins the interface signature
// across regen — if someone adds a method to the port, this test stops
// compiling, so the contract change surfaces immediately instead of as
// a downstream service-build failure.
type fakeProgressRepository struct{}

func (fakeProgressRepository) Save(ctx context.Context, e *domain.Progress) error {
	return nil
}

// FindByID — emitted whenever GetByID OR Update is present so this
// fake satisfies the (now Update-inclusive) output port interface
// (#1120). Under .Owned the signature gains the ownerID parameter so the
// fake matches the owner-scoped interface (owner-scoped CRUD §Q3).
func (fakeProgressRepository) FindByID(ctx context.Context, id string) (*domain.Progress, error) {
	return nil, nil
}
func (fakeProgressRepository) List(ctx context.Context, limit, offset int) ([]*domain.Progress, error) {
	return nil, nil
}

// ListByLearner pins the auto-emitted ref-listing method on the
// outbound port (#403 sub-3). The fake returns nil/nil — the assertion
// that load-bears here is the compile-time interface satisfaction
// below, not the body. Under .Owned the signature gains ownerID.
func (fakeProgressRepository) ListByLearner(ctx context.Context, refID string, limit, offset int) ([]*domain.Progress, error) {
	return nil, nil
}

// CountByLearner pins the auto-emitted ref-count method on the outbound
// port (#2202). The fake returns 0/nil — load-bearing is the compile-time
// interface satisfaction below, not the body. Under .Owned the signature
// gains ownerID.
func (fakeProgressRepository) CountByLearner(ctx context.Context, refID string) (int, error) {
	return 0, nil
}

// ListByLearnerSince pins the auto-emitted keyset-paginated sibling of
// ListByLearner on the outbound port (#4237). The fake returns nil/nil —
// load-bearing is the compile-time interface satisfaction below, not the
// body. Under .Owned the signature gains ownerID.
func (fakeProgressRepository) ListByLearnerSince(ctx context.Context, refID string, afterCreatedAt time.Time, afterID string, limit int) ([]*domain.Progress, error) {
	return nil, nil
}

// ListByLesson pins the auto-emitted ref-listing method on the
// outbound port (#403 sub-3). The fake returns nil/nil — the assertion
// that load-bears here is the compile-time interface satisfaction
// below, not the body. Under .Owned the signature gains ownerID.
func (fakeProgressRepository) ListByLesson(ctx context.Context, refID string, limit, offset int) ([]*domain.Progress, error) {
	return nil, nil
}

// CountByLesson pins the auto-emitted ref-count method on the outbound
// port (#2202). The fake returns 0/nil — load-bearing is the compile-time
// interface satisfaction below, not the body. Under .Owned the signature
// gains ownerID.
func (fakeProgressRepository) CountByLesson(ctx context.Context, refID string) (int, error) {
	return 0, nil
}

// ListByLessonSince pins the auto-emitted keyset-paginated sibling of
// ListByLesson on the outbound port (#4237). The fake returns nil/nil —
// load-bearing is the compile-time interface satisfaction below, not the
// body. Under .Owned the signature gains ownerID.
func (fakeProgressRepository) ListByLessonSince(ctx context.Context, refID string, afterCreatedAt time.Time, afterID string, limit int) ([]*domain.Progress, error) {
	return nil, nil
}

func (fakeProgressRepository) Update(ctx context.Context, e *domain.Progress) error {
	return nil
}
func (fakeProgressRepository) Delete(ctx context.Context, id string) error {
	return nil
}

// Compile-time assertion: fakeProgressRepository must satisfy
// ProgressRepository.
var _ ProgressRepository = (*fakeProgressRepository)(nil)

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
