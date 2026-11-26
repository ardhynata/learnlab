package lessonport_test

import (
	"context"
	"errors"
	"time"

	lessonport "example.com/learnlab/internal/core/ports/input/lesson"
)

// The fake's Fn signatures only mention types declared in the port
// package (lessonport.CreateLessonCommand, *lessonport.LessonResponse,
// etc.). The user-declared value-object types those structs hold
// internally — `domain.Money`, `domain.Address`, etc. — are visible to
// the fake transitively through the lessonport import; the fake itself
// never names them, so no domain import is necessary.

// FakeLessonService is a generated test double for the
// lessonport.LessonService inbound port. Each interface method
// has a matching `<Method>Fn` field of the exact signature the
// interface requires; the method body invokes the field when set and
// otherwise returns a clear "<Method>Fn not set" error.
//
// Adapter tests (REST handlers, htmx handlers, gRPC servers, etc.)
// instantiate this struct and assign only the Fn fields the test
// actually exercises:
//
//	svc := &lessonportfake.FakeLessonService{
//	    CreateFn: func(ctx context.Context, cmd lessonport.CreateLessonCommand) (*lessonport.LessonResponse, error) {
//	        return &lessonport.LessonResponse{}, nil
//	    },
//	}
//
// Methods that the test does NOT set surface a clear "Fn not set"
// error so a missing wiring shows up as a test failure with a useful
// message instead of a nil-pointer panic.
//
// The compile-time assertion at the bottom of the file pins that
// FakeLessonService satisfies lessonport.LessonService —
// adding a new method to the port interface fails the substrate's CI
// and adapter tests at compile time, never at runtime.
type FakeLessonService struct {
	CreateFn            func(ctx context.Context, cmd lessonport.CreateLessonCommand) (*lessonport.LessonResponse, error)
	GetByIDFn           func(ctx context.Context, q lessonport.GetLessonByIDQuery) (*lessonport.LessonResponse, error)
	ListFn              func(ctx context.Context, q lessonport.ListLessonQuery) ([]*lessonport.LessonResponse, error)
	ListByCourseFn      func(ctx context.Context, q lessonport.ListLessonByCourseQuery) ([]*lessonport.LessonResponse, error)
	CountByCourseFn     func(ctx context.Context, q lessonport.ListLessonByCourseQuery) (int, error)
	ListByCourseSinceFn func(ctx context.Context, refID string, afterCreatedAt time.Time, afterID string, limit int) ([]*lessonport.LessonResponse, error)
	ListByModuleFn      func(ctx context.Context, q lessonport.ListLessonByModuleQuery) ([]*lessonport.LessonResponse, error)
	CountByModuleFn     func(ctx context.Context, q lessonport.ListLessonByModuleQuery) (int, error)
	ListByModuleSinceFn func(ctx context.Context, refID string, afterCreatedAt time.Time, afterID string, limit int) ([]*lessonport.LessonResponse, error)
	OptionsFn           func(ctx context.Context, q lessonport.LessonOptionsQuery) ([]lessonport.LessonOption, error)
	UpdateFn            func(ctx context.Context, cmd lessonport.UpdateLessonCommand) (*lessonport.LessonResponse, error)
	DeleteFn            func(ctx context.Context, cmd lessonport.DeleteLessonCommand) error
}

// Create dispatches to CreateFn, or returns "CreateFn not set" when
// the test left the field nil — surfaces missing wiring as a clear
// test failure instead of a nil-deref panic.
func (f *FakeLessonService) Create(ctx context.Context, cmd lessonport.CreateLessonCommand) (*lessonport.LessonResponse, error) {
	if f.CreateFn == nil {
		return nil, errors.New("FakeLessonService.CreateFn not set")
	}
	return f.CreateFn(ctx, cmd)
}

// GetByID dispatches to GetByIDFn, or returns "GetByIDFn not set"
// when nil.
func (f *FakeLessonService) GetByID(ctx context.Context, q lessonport.GetLessonByIDQuery) (*lessonport.LessonResponse, error) {
	if f.GetByIDFn == nil {
		return nil, errors.New("FakeLessonService.GetByIDFn not set")
	}
	return f.GetByIDFn(ctx, q)
}

// List dispatches to ListFn, or returns "ListFn not set" when nil.
func (f *FakeLessonService) List(ctx context.Context, q lessonport.ListLessonQuery) ([]*lessonport.LessonResponse, error) {
	if f.ListFn == nil {
		return nil, errors.New("FakeLessonService.ListFn not set")
	}
	return f.ListFn(ctx, q)
}

// ListByCourse dispatches to ListByCourseFn, or
// returns "ListByCourseFn not set" when nil.
func (f *FakeLessonService) ListByCourse(ctx context.Context, q lessonport.ListLessonByCourseQuery) ([]*lessonport.LessonResponse, error) {
	if f.ListByCourseFn == nil {
		return nil, errors.New("FakeLessonService.ListByCourseFn not set")
	}
	return f.ListByCourseFn(ctx, q)
}

// CountByCourse dispatches to CountByCourseFn, or
// returns "CountByCourseFn not set" when nil.
func (f *FakeLessonService) CountByCourse(ctx context.Context, q lessonport.ListLessonByCourseQuery) (int, error) {
	if f.CountByCourseFn == nil {
		return 0, errors.New("FakeLessonService.CountByCourseFn not set")
	}
	return f.CountByCourseFn(ctx, q)
}

// ListByCourseSince dispatches to ListByCourseSinceFn, or
// returns "ListByCourseSinceFn not set" when nil (#4237) — the
// keyset-paginated sibling of ListByCourse a cross-service `derive:`
// rollup's derived-rows-reader gRPC backing rides for its internal
// complete-scan loop; not part of the general REST/HTMX listing surface.
func (f *FakeLessonService) ListByCourseSince(ctx context.Context, refID string, afterCreatedAt time.Time, afterID string, limit int) ([]*lessonport.LessonResponse, error) {
	if f.ListByCourseSinceFn == nil {
		return nil, errors.New("FakeLessonService.ListByCourseSinceFn not set")
	}
	return f.ListByCourseSinceFn(ctx, refID, afterCreatedAt, afterID, limit)
}

// ListByModule dispatches to ListByModuleFn, or
// returns "ListByModuleFn not set" when nil.
func (f *FakeLessonService) ListByModule(ctx context.Context, q lessonport.ListLessonByModuleQuery) ([]*lessonport.LessonResponse, error) {
	if f.ListByModuleFn == nil {
		return nil, errors.New("FakeLessonService.ListByModuleFn not set")
	}
	return f.ListByModuleFn(ctx, q)
}

// CountByModule dispatches to CountByModuleFn, or
// returns "CountByModuleFn not set" when nil.
func (f *FakeLessonService) CountByModule(ctx context.Context, q lessonport.ListLessonByModuleQuery) (int, error) {
	if f.CountByModuleFn == nil {
		return 0, errors.New("FakeLessonService.CountByModuleFn not set")
	}
	return f.CountByModuleFn(ctx, q)
}

// ListByModuleSince dispatches to ListByModuleSinceFn, or
// returns "ListByModuleSinceFn not set" when nil (#4237) — the
// keyset-paginated sibling of ListByModule a cross-service `derive:`
// rollup's derived-rows-reader gRPC backing rides for its internal
// complete-scan loop; not part of the general REST/HTMX listing surface.
func (f *FakeLessonService) ListByModuleSince(ctx context.Context, refID string, afterCreatedAt time.Time, afterID string, limit int) ([]*lessonport.LessonResponse, error) {
	if f.ListByModuleSinceFn == nil {
		return nil, errors.New("FakeLessonService.ListByModuleSinceFn not set")
	}
	return f.ListByModuleSinceFn(ctx, refID, afterCreatedAt, afterID, limit)
}

// Options dispatches to OptionsFn, or returns "OptionsFn not set"
// when nil.
func (f *FakeLessonService) Options(ctx context.Context, q lessonport.LessonOptionsQuery) ([]lessonport.LessonOption, error) {
	if f.OptionsFn == nil {
		return nil, errors.New("FakeLessonService.OptionsFn not set")
	}
	return f.OptionsFn(ctx, q)
}

// Update dispatches to UpdateFn, or returns "UpdateFn not set" when
// nil.
func (f *FakeLessonService) Update(ctx context.Context, cmd lessonport.UpdateLessonCommand) (*lessonport.LessonResponse, error) {
	if f.UpdateFn == nil {
		return nil, errors.New("FakeLessonService.UpdateFn not set")
	}
	return f.UpdateFn(ctx, cmd)
}

// Delete dispatches to DeleteFn, or returns "DeleteFn not set" when
// nil.
func (f *FakeLessonService) Delete(ctx context.Context, cmd lessonport.DeleteLessonCommand) error {
	if f.DeleteFn == nil {
		return errors.New("FakeLessonService.DeleteFn not set")
	}
	return f.DeleteFn(ctx, cmd)
}

// Compile-time assertion: FakeLessonService must satisfy
// lessonport.LessonService. When the port interface grows or
// changes a method, this line breaks the build at the substrate level
// AND in every project that imports the generated fake — far better
// than a downstream test panicking at runtime when it tries to invoke
// an Fn that no longer exists.
var _ lessonport.LessonService = (*FakeLessonService)(nil)
