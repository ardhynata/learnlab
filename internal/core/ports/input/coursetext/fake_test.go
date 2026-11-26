package coursetextport_test

import (
	"context"
	"errors"
	"time"

	coursetextport "example.com/learnlab/internal/core/ports/input/coursetext"
)

// The fake's Fn signatures only mention types declared in the port
// package (coursetextport.CreateCourseTextCommand, *coursetextport.CourseTextResponse,
// etc.). The user-declared value-object types those structs hold
// internally — `domain.Money`, `domain.Address`, etc. — are visible to
// the fake transitively through the coursetextport import; the fake itself
// never names them, so no domain import is necessary.

// FakeCourseTextService is a generated test double for the
// coursetextport.CourseTextService inbound port. Each interface method
// has a matching `<Method>Fn` field of the exact signature the
// interface requires; the method body invokes the field when set and
// otherwise returns a clear "<Method>Fn not set" error.
//
// Adapter tests (REST handlers, htmx handlers, gRPC servers, etc.)
// instantiate this struct and assign only the Fn fields the test
// actually exercises:
//
//	svc := &coursetextportfake.FakeCourseTextService{
//	    CreateFn: func(ctx context.Context, cmd coursetextport.CreateCourseTextCommand) (*coursetextport.CourseTextResponse, error) {
//	        return &coursetextport.CourseTextResponse{}, nil
//	    },
//	}
//
// Methods that the test does NOT set surface a clear "Fn not set"
// error so a missing wiring shows up as a test failure with a useful
// message instead of a nil-pointer panic.
//
// The compile-time assertion at the bottom of the file pins that
// FakeCourseTextService satisfies coursetextport.CourseTextService —
// adding a new method to the port interface fails the substrate's CI
// and adapter tests at compile time, never at runtime.
type FakeCourseTextService struct {
	CreateFn            func(ctx context.Context, cmd coursetextport.CreateCourseTextCommand) (*coursetextport.CourseTextResponse, error)
	GetByIDFn           func(ctx context.Context, q coursetextport.GetCourseTextByIDQuery) (*coursetextport.CourseTextResponse, error)
	ListFn              func(ctx context.Context, q coursetextport.ListCourseTextQuery) ([]*coursetextport.CourseTextResponse, error)
	ListByCourseFn      func(ctx context.Context, q coursetextport.ListCourseTextByCourseQuery) ([]*coursetextport.CourseTextResponse, error)
	CountByCourseFn     func(ctx context.Context, q coursetextport.ListCourseTextByCourseQuery) (int, error)
	ListByCourseSinceFn func(ctx context.Context, refID string, afterCreatedAt time.Time, afterID string, limit int) ([]*coursetextport.CourseTextResponse, error)
	OptionsFn           func(ctx context.Context, q coursetextport.CourseTextOptionsQuery) ([]coursetextport.CourseTextOption, error)
	UpdateFn            func(ctx context.Context, cmd coursetextport.UpdateCourseTextCommand) (*coursetextport.CourseTextResponse, error)
	DeleteFn            func(ctx context.Context, cmd coursetextport.DeleteCourseTextCommand) error
}

// Create dispatches to CreateFn, or returns "CreateFn not set" when
// the test left the field nil — surfaces missing wiring as a clear
// test failure instead of a nil-deref panic.
func (f *FakeCourseTextService) Create(ctx context.Context, cmd coursetextport.CreateCourseTextCommand) (*coursetextport.CourseTextResponse, error) {
	if f.CreateFn == nil {
		return nil, errors.New("FakeCourseTextService.CreateFn not set")
	}
	return f.CreateFn(ctx, cmd)
}

// GetByID dispatches to GetByIDFn, or returns "GetByIDFn not set"
// when nil.
func (f *FakeCourseTextService) GetByID(ctx context.Context, q coursetextport.GetCourseTextByIDQuery) (*coursetextport.CourseTextResponse, error) {
	if f.GetByIDFn == nil {
		return nil, errors.New("FakeCourseTextService.GetByIDFn not set")
	}
	return f.GetByIDFn(ctx, q)
}

// List dispatches to ListFn, or returns "ListFn not set" when nil.
func (f *FakeCourseTextService) List(ctx context.Context, q coursetextport.ListCourseTextQuery) ([]*coursetextport.CourseTextResponse, error) {
	if f.ListFn == nil {
		return nil, errors.New("FakeCourseTextService.ListFn not set")
	}
	return f.ListFn(ctx, q)
}

// ListByCourse dispatches to ListByCourseFn, or
// returns "ListByCourseFn not set" when nil.
func (f *FakeCourseTextService) ListByCourse(ctx context.Context, q coursetextport.ListCourseTextByCourseQuery) ([]*coursetextport.CourseTextResponse, error) {
	if f.ListByCourseFn == nil {
		return nil, errors.New("FakeCourseTextService.ListByCourseFn not set")
	}
	return f.ListByCourseFn(ctx, q)
}

// CountByCourse dispatches to CountByCourseFn, or
// returns "CountByCourseFn not set" when nil.
func (f *FakeCourseTextService) CountByCourse(ctx context.Context, q coursetextport.ListCourseTextByCourseQuery) (int, error) {
	if f.CountByCourseFn == nil {
		return 0, errors.New("FakeCourseTextService.CountByCourseFn not set")
	}
	return f.CountByCourseFn(ctx, q)
}

// ListByCourseSince dispatches to ListByCourseSinceFn, or
// returns "ListByCourseSinceFn not set" when nil (#4237) — the
// keyset-paginated sibling of ListByCourse a cross-service `derive:`
// rollup's derived-rows-reader gRPC backing rides for its internal
// complete-scan loop; not part of the general REST/HTMX listing surface.
func (f *FakeCourseTextService) ListByCourseSince(ctx context.Context, refID string, afterCreatedAt time.Time, afterID string, limit int) ([]*coursetextport.CourseTextResponse, error) {
	if f.ListByCourseSinceFn == nil {
		return nil, errors.New("FakeCourseTextService.ListByCourseSinceFn not set")
	}
	return f.ListByCourseSinceFn(ctx, refID, afterCreatedAt, afterID, limit)
}

// Options dispatches to OptionsFn, or returns "OptionsFn not set"
// when nil.
func (f *FakeCourseTextService) Options(ctx context.Context, q coursetextport.CourseTextOptionsQuery) ([]coursetextport.CourseTextOption, error) {
	if f.OptionsFn == nil {
		return nil, errors.New("FakeCourseTextService.OptionsFn not set")
	}
	return f.OptionsFn(ctx, q)
}

// Update dispatches to UpdateFn, or returns "UpdateFn not set" when
// nil.
func (f *FakeCourseTextService) Update(ctx context.Context, cmd coursetextport.UpdateCourseTextCommand) (*coursetextport.CourseTextResponse, error) {
	if f.UpdateFn == nil {
		return nil, errors.New("FakeCourseTextService.UpdateFn not set")
	}
	return f.UpdateFn(ctx, cmd)
}

// Delete dispatches to DeleteFn, or returns "DeleteFn not set" when
// nil.
func (f *FakeCourseTextService) Delete(ctx context.Context, cmd coursetextport.DeleteCourseTextCommand) error {
	if f.DeleteFn == nil {
		return errors.New("FakeCourseTextService.DeleteFn not set")
	}
	return f.DeleteFn(ctx, cmd)
}

// Compile-time assertion: FakeCourseTextService must satisfy
// coursetextport.CourseTextService. When the port interface grows or
// changes a method, this line breaks the build at the substrate level
// AND in every project that imports the generated fake — far better
// than a downstream test panicking at runtime when it tries to invoke
// an Fn that no longer exists.
var _ coursetextport.CourseTextService = (*FakeCourseTextService)(nil)
