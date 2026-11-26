package progressport

import (
	"context"
	"reflect"
	"testing"
	"time"
)

// fakeProgressService is a hand-rolled implementation of the
// ProgressService interface. The compile-time `var _ ... = ...`
// assertion below is the load-bearing assertion: when someone adds or
// changes a method on the interface, this test fails to compile,
// breaking the build immediately rather than waiting for a downstream
// import to break. Method bodies are stubs — the contract being pinned
// is the *signature set*, not behavior.
type fakeProgressService struct{}

func (fakeProgressService) Create(ctx context.Context, cmd CreateProgressCommand) (*ProgressResponse, error) {
	return nil, nil
}

func (fakeProgressService) GetByID(ctx context.Context, q GetProgressByIDQuery) (*ProgressResponse, error) {
	return nil, nil
}

func (fakeProgressService) List(ctx context.Context, q ListProgressQuery) ([]*ProgressResponse, error) {
	return nil, nil
}

// ListByLearner pins the auto-emitted ref-listing method on the
// inbound port (#403 sub-3 / #421). The fake returns nil/nil — the
// load-bearing contract is the compile-time interface satisfaction
// below, not the body.
func (fakeProgressService) ListByLearner(ctx context.Context, q ListProgressByLearnerQuery) ([]*ProgressResponse, error) {
	return nil, nil
}

// CountByLearner pins the auto-emitted ref-count method on the inbound
// port (#2202). Returns 0/nil — the load-bearing contract is the compile-time
// interface satisfaction below, not the body.
func (fakeProgressService) CountByLearner(ctx context.Context, q ListProgressByLearnerQuery) (int, error) {
	return 0, nil
}

// ListByLearnerSince pins the auto-emitted keyset-paginated sibling of
// ListByLearner on the inbound port (#4237). Returns nil/nil — the
// load-bearing contract is the compile-time interface satisfaction below,
// not the body.
func (fakeProgressService) ListByLearnerSince(ctx context.Context, refID string, afterCreatedAt time.Time, afterID string, limit int) ([]*ProgressResponse, error) {
	return nil, nil
}

// ListByLesson pins the auto-emitted ref-listing method on the
// inbound port (#403 sub-3 / #421). The fake returns nil/nil — the
// load-bearing contract is the compile-time interface satisfaction
// below, not the body.
func (fakeProgressService) ListByLesson(ctx context.Context, q ListProgressByLessonQuery) ([]*ProgressResponse, error) {
	return nil, nil
}

// CountByLesson pins the auto-emitted ref-count method on the inbound
// port (#2202). Returns 0/nil — the load-bearing contract is the compile-time
// interface satisfaction below, not the body.
func (fakeProgressService) CountByLesson(ctx context.Context, q ListProgressByLessonQuery) (int, error) {
	return 0, nil
}

// ListByLessonSince pins the auto-emitted keyset-paginated sibling of
// ListByLesson on the inbound port (#4237). Returns nil/nil — the
// load-bearing contract is the compile-time interface satisfaction below,
// not the body.
func (fakeProgressService) ListByLessonSince(ctx context.Context, refID string, afterCreatedAt time.Time, afterID string, limit int) ([]*ProgressResponse, error) {
	return nil, nil
}

func (fakeProgressService) Update(ctx context.Context, cmd UpdateProgressCommand) (*ProgressResponse, error) {
	return nil, nil
}

func (fakeProgressService) Delete(ctx context.Context, cmd DeleteProgressCommand) error {
	return nil
}

// Compile-time assertion: fakeProgressService must satisfy
// ProgressService. Adding/removing methods on the port without
// updating the fake breaks this line at compile time.
var _ ProgressService = (*fakeProgressService)(nil)

// TestFakeProgressServiceSatisfiesPort is a runtime guard for the
// compile-time assertion above: if the package ever stops importing
// the fake (e.g. via dead-code elimination of the var), `go test` still
// links the file and the interface satisfaction is exercised.
func TestFakeProgressServiceSatisfiesPort(t *testing.T) {
	port := reflect.TypeOf((*ProgressService)(nil)).Elem()
	if got, want := reflect.TypeOf(fakeProgressService{}).NumMethod(), port.NumMethod(); got != want {
		t.Errorf("fakeProgressService implements %d methods, port declares %d: the fake no longer mirrors the port", got, want)
	}
}
