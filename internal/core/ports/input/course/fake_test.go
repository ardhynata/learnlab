package courseport_test

import (
	"context"
	"errors"
	"time"

	courseport "example.com/learnlab/internal/core/ports/input/course"
)

// The fake's Fn signatures only mention types declared in the port
// package (courseport.CreateCourseCommand, *courseport.CourseResponse,
// etc.). The user-declared value-object types those structs hold
// internally — `domain.Money`, `domain.Address`, etc. — are visible to
// the fake transitively through the courseport import; the fake itself
// never names them, so no domain import is necessary.

// FakeCourseService is a generated test double for the
// courseport.CourseService inbound port. Each interface method
// has a matching `<Method>Fn` field of the exact signature the
// interface requires; the method body invokes the field when set and
// otherwise returns a clear "<Method>Fn not set" error.
//
// Adapter tests (REST handlers, htmx handlers, gRPC servers, etc.)
// instantiate this struct and assign only the Fn fields the test
// actually exercises:
//
//	svc := &courseportfake.FakeCourseService{
//	    CreateFn: func(ctx context.Context, cmd courseport.CreateCourseCommand) (*courseport.CourseResponse, error) {
//	        return &courseport.CourseResponse{}, nil
//	    },
//	}
//
// Methods that the test does NOT set surface a clear "Fn not set"
// error so a missing wiring shows up as a test failure with a useful
// message instead of a nil-pointer panic.
//
// The compile-time assertion at the bottom of the file pins that
// FakeCourseService satisfies courseport.CourseService —
// adding a new method to the port interface fails the substrate's CI
// and adapter tests at compile time, never at runtime.
type FakeCourseService struct {
	CreateFn          func(ctx context.Context, cmd courseport.CreateCourseCommand) (*courseport.CourseResponse, error)
	GetByIDFn         func(ctx context.Context, q courseport.GetCourseByIDQuery) (*courseport.CourseResponse, error)
	ListFn            func(ctx context.Context, q courseport.ListCourseQuery) ([]*courseport.CourseResponse, error)
	ListByPathFn      func(ctx context.Context, q courseport.ListCourseByPathQuery) ([]*courseport.CourseResponse, error)
	CountByPathFn     func(ctx context.Context, q courseport.ListCourseByPathQuery) (int, error)
	ListByPathSinceFn func(ctx context.Context, refID string, afterCreatedAt time.Time, afterID string, limit int) ([]*courseport.CourseResponse, error)
	OptionsFn         func(ctx context.Context, q courseport.CourseOptionsQuery) ([]courseport.CourseOption, error)
	UpdateFn          func(ctx context.Context, cmd courseport.UpdateCourseCommand) (*courseport.CourseResponse, error)
	DeleteFn          func(ctx context.Context, cmd courseport.DeleteCourseCommand) error
}

// Create dispatches to CreateFn, or returns "CreateFn not set" when
// the test left the field nil — surfaces missing wiring as a clear
// test failure instead of a nil-deref panic.
func (f *FakeCourseService) Create(ctx context.Context, cmd courseport.CreateCourseCommand) (*courseport.CourseResponse, error) {
	if f.CreateFn == nil {
		return nil, errors.New("FakeCourseService.CreateFn not set")
	}
	return f.CreateFn(ctx, cmd)
}

// GetByID dispatches to GetByIDFn, or returns "GetByIDFn not set"
// when nil.
func (f *FakeCourseService) GetByID(ctx context.Context, q courseport.GetCourseByIDQuery) (*courseport.CourseResponse, error) {
	if f.GetByIDFn == nil {
		return nil, errors.New("FakeCourseService.GetByIDFn not set")
	}
	return f.GetByIDFn(ctx, q)
}

// List dispatches to ListFn, or returns "ListFn not set" when nil.
func (f *FakeCourseService) List(ctx context.Context, q courseport.ListCourseQuery) ([]*courseport.CourseResponse, error) {
	if f.ListFn == nil {
		return nil, errors.New("FakeCourseService.ListFn not set")
	}
	return f.ListFn(ctx, q)
}

// ListByPath dispatches to ListByPathFn, or
// returns "ListByPathFn not set" when nil.
func (f *FakeCourseService) ListByPath(ctx context.Context, q courseport.ListCourseByPathQuery) ([]*courseport.CourseResponse, error) {
	if f.ListByPathFn == nil {
		return nil, errors.New("FakeCourseService.ListByPathFn not set")
	}
	return f.ListByPathFn(ctx, q)
}

// CountByPath dispatches to CountByPathFn, or
// returns "CountByPathFn not set" when nil.
func (f *FakeCourseService) CountByPath(ctx context.Context, q courseport.ListCourseByPathQuery) (int, error) {
	if f.CountByPathFn == nil {
		return 0, errors.New("FakeCourseService.CountByPathFn not set")
	}
	return f.CountByPathFn(ctx, q)
}

// ListByPathSince dispatches to ListByPathSinceFn, or
// returns "ListByPathSinceFn not set" when nil (#4237) — the
// keyset-paginated sibling of ListByPath a cross-service `derive:`
// rollup's derived-rows-reader gRPC backing rides for its internal
// complete-scan loop; not part of the general REST/HTMX listing surface.
func (f *FakeCourseService) ListByPathSince(ctx context.Context, refID string, afterCreatedAt time.Time, afterID string, limit int) ([]*courseport.CourseResponse, error) {
	if f.ListByPathSinceFn == nil {
		return nil, errors.New("FakeCourseService.ListByPathSinceFn not set")
	}
	return f.ListByPathSinceFn(ctx, refID, afterCreatedAt, afterID, limit)
}

// Options dispatches to OptionsFn, or returns "OptionsFn not set"
// when nil.
func (f *FakeCourseService) Options(ctx context.Context, q courseport.CourseOptionsQuery) ([]courseport.CourseOption, error) {
	if f.OptionsFn == nil {
		return nil, errors.New("FakeCourseService.OptionsFn not set")
	}
	return f.OptionsFn(ctx, q)
}

// Update dispatches to UpdateFn, or returns "UpdateFn not set" when
// nil.
func (f *FakeCourseService) Update(ctx context.Context, cmd courseport.UpdateCourseCommand) (*courseport.CourseResponse, error) {
	if f.UpdateFn == nil {
		return nil, errors.New("FakeCourseService.UpdateFn not set")
	}
	return f.UpdateFn(ctx, cmd)
}

// Delete dispatches to DeleteFn, or returns "DeleteFn not set" when
// nil.
func (f *FakeCourseService) Delete(ctx context.Context, cmd courseport.DeleteCourseCommand) error {
	if f.DeleteFn == nil {
		return errors.New("FakeCourseService.DeleteFn not set")
	}
	return f.DeleteFn(ctx, cmd)
}

// Compile-time assertion: FakeCourseService must satisfy
// courseport.CourseService. When the port interface grows or
// changes a method, this line breaks the build at the substrate level
// AND in every project that imports the generated fake — far better
// than a downstream test panicking at runtime when it tries to invoke
// an Fn that no longer exists.
var _ courseport.CourseService = (*FakeCourseService)(nil)
