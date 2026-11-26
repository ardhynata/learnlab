package progressport_test

import (
	"context"
	"errors"
	"time"

	progressport "example.com/learnlab/internal/core/ports/input/progress"
)

// The fake's Fn signatures only mention types declared in the port
// package (progressport.CreateProgressCommand, *progressport.ProgressResponse,
// etc.). The user-declared value-object types those structs hold
// internally — `domain.Money`, `domain.Address`, etc. — are visible to
// the fake transitively through the progressport import; the fake itself
// never names them, so no domain import is necessary.

// FakeProgressService is a generated test double for the
// progressport.ProgressService inbound port. Each interface method
// has a matching `<Method>Fn` field of the exact signature the
// interface requires; the method body invokes the field when set and
// otherwise returns a clear "<Method>Fn not set" error.
//
// Adapter tests (REST handlers, htmx handlers, gRPC servers, etc.)
// instantiate this struct and assign only the Fn fields the test
// actually exercises:
//
//	svc := &progressportfake.FakeProgressService{
//	    CreateFn: func(ctx context.Context, cmd progressport.CreateProgressCommand) (*progressport.ProgressResponse, error) {
//	        return &progressport.ProgressResponse{}, nil
//	    },
//	}
//
// Methods that the test does NOT set surface a clear "Fn not set"
// error so a missing wiring shows up as a test failure with a useful
// message instead of a nil-pointer panic.
//
// The compile-time assertion at the bottom of the file pins that
// FakeProgressService satisfies progressport.ProgressService —
// adding a new method to the port interface fails the substrate's CI
// and adapter tests at compile time, never at runtime.
type FakeProgressService struct {
	CreateFn             func(ctx context.Context, cmd progressport.CreateProgressCommand) (*progressport.ProgressResponse, error)
	GetByIDFn            func(ctx context.Context, q progressport.GetProgressByIDQuery) (*progressport.ProgressResponse, error)
	ListFn               func(ctx context.Context, q progressport.ListProgressQuery) ([]*progressport.ProgressResponse, error)
	ListByLearnerFn      func(ctx context.Context, q progressport.ListProgressByLearnerQuery) ([]*progressport.ProgressResponse, error)
	CountByLearnerFn     func(ctx context.Context, q progressport.ListProgressByLearnerQuery) (int, error)
	ListByLearnerSinceFn func(ctx context.Context, refID string, afterCreatedAt time.Time, afterID string, limit int) ([]*progressport.ProgressResponse, error)
	ListByLessonFn       func(ctx context.Context, q progressport.ListProgressByLessonQuery) ([]*progressport.ProgressResponse, error)
	CountByLessonFn      func(ctx context.Context, q progressport.ListProgressByLessonQuery) (int, error)
	ListByLessonSinceFn  func(ctx context.Context, refID string, afterCreatedAt time.Time, afterID string, limit int) ([]*progressport.ProgressResponse, error)
	UpdateFn             func(ctx context.Context, cmd progressport.UpdateProgressCommand) (*progressport.ProgressResponse, error)
	DeleteFn             func(ctx context.Context, cmd progressport.DeleteProgressCommand) error
}

// Create dispatches to CreateFn, or returns "CreateFn not set" when
// the test left the field nil — surfaces missing wiring as a clear
// test failure instead of a nil-deref panic.
func (f *FakeProgressService) Create(ctx context.Context, cmd progressport.CreateProgressCommand) (*progressport.ProgressResponse, error) {
	if f.CreateFn == nil {
		return nil, errors.New("FakeProgressService.CreateFn not set")
	}
	return f.CreateFn(ctx, cmd)
}

// GetByID dispatches to GetByIDFn, or returns "GetByIDFn not set"
// when nil.
func (f *FakeProgressService) GetByID(ctx context.Context, q progressport.GetProgressByIDQuery) (*progressport.ProgressResponse, error) {
	if f.GetByIDFn == nil {
		return nil, errors.New("FakeProgressService.GetByIDFn not set")
	}
	return f.GetByIDFn(ctx, q)
}

// List dispatches to ListFn, or returns "ListFn not set" when nil.
func (f *FakeProgressService) List(ctx context.Context, q progressport.ListProgressQuery) ([]*progressport.ProgressResponse, error) {
	if f.ListFn == nil {
		return nil, errors.New("FakeProgressService.ListFn not set")
	}
	return f.ListFn(ctx, q)
}

// ListByLearner dispatches to ListByLearnerFn, or
// returns "ListByLearnerFn not set" when nil.
func (f *FakeProgressService) ListByLearner(ctx context.Context, q progressport.ListProgressByLearnerQuery) ([]*progressport.ProgressResponse, error) {
	if f.ListByLearnerFn == nil {
		return nil, errors.New("FakeProgressService.ListByLearnerFn not set")
	}
	return f.ListByLearnerFn(ctx, q)
}

// CountByLearner dispatches to CountByLearnerFn, or
// returns "CountByLearnerFn not set" when nil.
func (f *FakeProgressService) CountByLearner(ctx context.Context, q progressport.ListProgressByLearnerQuery) (int, error) {
	if f.CountByLearnerFn == nil {
		return 0, errors.New("FakeProgressService.CountByLearnerFn not set")
	}
	return f.CountByLearnerFn(ctx, q)
}

// ListByLearnerSince dispatches to ListByLearnerSinceFn, or
// returns "ListByLearnerSinceFn not set" when nil (#4237) — the
// keyset-paginated sibling of ListByLearner a cross-service `derive:`
// rollup's derived-rows-reader gRPC backing rides for its internal
// complete-scan loop; not part of the general REST/HTMX listing surface.
func (f *FakeProgressService) ListByLearnerSince(ctx context.Context, refID string, afterCreatedAt time.Time, afterID string, limit int) ([]*progressport.ProgressResponse, error) {
	if f.ListByLearnerSinceFn == nil {
		return nil, errors.New("FakeProgressService.ListByLearnerSinceFn not set")
	}
	return f.ListByLearnerSinceFn(ctx, refID, afterCreatedAt, afterID, limit)
}

// ListByLesson dispatches to ListByLessonFn, or
// returns "ListByLessonFn not set" when nil.
func (f *FakeProgressService) ListByLesson(ctx context.Context, q progressport.ListProgressByLessonQuery) ([]*progressport.ProgressResponse, error) {
	if f.ListByLessonFn == nil {
		return nil, errors.New("FakeProgressService.ListByLessonFn not set")
	}
	return f.ListByLessonFn(ctx, q)
}

// CountByLesson dispatches to CountByLessonFn, or
// returns "CountByLessonFn not set" when nil.
func (f *FakeProgressService) CountByLesson(ctx context.Context, q progressport.ListProgressByLessonQuery) (int, error) {
	if f.CountByLessonFn == nil {
		return 0, errors.New("FakeProgressService.CountByLessonFn not set")
	}
	return f.CountByLessonFn(ctx, q)
}

// ListByLessonSince dispatches to ListByLessonSinceFn, or
// returns "ListByLessonSinceFn not set" when nil (#4237) — the
// keyset-paginated sibling of ListByLesson a cross-service `derive:`
// rollup's derived-rows-reader gRPC backing rides for its internal
// complete-scan loop; not part of the general REST/HTMX listing surface.
func (f *FakeProgressService) ListByLessonSince(ctx context.Context, refID string, afterCreatedAt time.Time, afterID string, limit int) ([]*progressport.ProgressResponse, error) {
	if f.ListByLessonSinceFn == nil {
		return nil, errors.New("FakeProgressService.ListByLessonSinceFn not set")
	}
	return f.ListByLessonSinceFn(ctx, refID, afterCreatedAt, afterID, limit)
}

// Update dispatches to UpdateFn, or returns "UpdateFn not set" when
// nil.
func (f *FakeProgressService) Update(ctx context.Context, cmd progressport.UpdateProgressCommand) (*progressport.ProgressResponse, error) {
	if f.UpdateFn == nil {
		return nil, errors.New("FakeProgressService.UpdateFn not set")
	}
	return f.UpdateFn(ctx, cmd)
}

// Delete dispatches to DeleteFn, or returns "DeleteFn not set" when
// nil.
func (f *FakeProgressService) Delete(ctx context.Context, cmd progressport.DeleteProgressCommand) error {
	if f.DeleteFn == nil {
		return errors.New("FakeProgressService.DeleteFn not set")
	}
	return f.DeleteFn(ctx, cmd)
}

// Compile-time assertion: FakeProgressService must satisfy
// progressport.ProgressService. When the port interface grows or
// changes a method, this line breaks the build at the substrate level
// AND in every project that imports the generated fake — far better
// than a downstream test panicking at runtime when it tries to invoke
// an Fn that no longer exists.
var _ progressport.ProgressService = (*FakeProgressService)(nil)
