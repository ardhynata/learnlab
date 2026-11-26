package moduleport_test

import (
	"context"
	"errors"
	"time"

	moduleport "example.com/learnlab/internal/core/ports/input/module"
)

// The fake's Fn signatures only mention types declared in the port
// package (moduleport.CreateModuleCommand, *moduleport.ModuleResponse,
// etc.). The user-declared value-object types those structs hold
// internally — `domain.Money`, `domain.Address`, etc. — are visible to
// the fake transitively through the moduleport import; the fake itself
// never names them, so no domain import is necessary.

// FakeModuleService is a generated test double for the
// moduleport.ModuleService inbound port. Each interface method
// has a matching `<Method>Fn` field of the exact signature the
// interface requires; the method body invokes the field when set and
// otherwise returns a clear "<Method>Fn not set" error.
//
// Adapter tests (REST handlers, htmx handlers, gRPC servers, etc.)
// instantiate this struct and assign only the Fn fields the test
// actually exercises:
//
//	svc := &moduleportfake.FakeModuleService{
//	    CreateFn: func(ctx context.Context, cmd moduleport.CreateModuleCommand) (*moduleport.ModuleResponse, error) {
//	        return &moduleport.ModuleResponse{}, nil
//	    },
//	}
//
// Methods that the test does NOT set surface a clear "Fn not set"
// error so a missing wiring shows up as a test failure with a useful
// message instead of a nil-pointer panic.
//
// The compile-time assertion at the bottom of the file pins that
// FakeModuleService satisfies moduleport.ModuleService —
// adding a new method to the port interface fails the substrate's CI
// and adapter tests at compile time, never at runtime.
type FakeModuleService struct {
	CreateFn            func(ctx context.Context, cmd moduleport.CreateModuleCommand) (*moduleport.ModuleResponse, error)
	GetByIDFn           func(ctx context.Context, q moduleport.GetModuleByIDQuery) (*moduleport.ModuleResponse, error)
	ListFn              func(ctx context.Context, q moduleport.ListModuleQuery) ([]*moduleport.ModuleResponse, error)
	ListByCourseFn      func(ctx context.Context, q moduleport.ListModuleByCourseQuery) ([]*moduleport.ModuleResponse, error)
	CountByCourseFn     func(ctx context.Context, q moduleport.ListModuleByCourseQuery) (int, error)
	ListByCourseSinceFn func(ctx context.Context, refID string, afterCreatedAt time.Time, afterID string, limit int) ([]*moduleport.ModuleResponse, error)
	OptionsFn           func(ctx context.Context, q moduleport.ModuleOptionsQuery) ([]moduleport.ModuleOption, error)
	UpdateFn            func(ctx context.Context, cmd moduleport.UpdateModuleCommand) (*moduleport.ModuleResponse, error)
	DeleteFn            func(ctx context.Context, cmd moduleport.DeleteModuleCommand) error
}

// Create dispatches to CreateFn, or returns "CreateFn not set" when
// the test left the field nil — surfaces missing wiring as a clear
// test failure instead of a nil-deref panic.
func (f *FakeModuleService) Create(ctx context.Context, cmd moduleport.CreateModuleCommand) (*moduleport.ModuleResponse, error) {
	if f.CreateFn == nil {
		return nil, errors.New("FakeModuleService.CreateFn not set")
	}
	return f.CreateFn(ctx, cmd)
}

// GetByID dispatches to GetByIDFn, or returns "GetByIDFn not set"
// when nil.
func (f *FakeModuleService) GetByID(ctx context.Context, q moduleport.GetModuleByIDQuery) (*moduleport.ModuleResponse, error) {
	if f.GetByIDFn == nil {
		return nil, errors.New("FakeModuleService.GetByIDFn not set")
	}
	return f.GetByIDFn(ctx, q)
}

// List dispatches to ListFn, or returns "ListFn not set" when nil.
func (f *FakeModuleService) List(ctx context.Context, q moduleport.ListModuleQuery) ([]*moduleport.ModuleResponse, error) {
	if f.ListFn == nil {
		return nil, errors.New("FakeModuleService.ListFn not set")
	}
	return f.ListFn(ctx, q)
}

// ListByCourse dispatches to ListByCourseFn, or
// returns "ListByCourseFn not set" when nil.
func (f *FakeModuleService) ListByCourse(ctx context.Context, q moduleport.ListModuleByCourseQuery) ([]*moduleport.ModuleResponse, error) {
	if f.ListByCourseFn == nil {
		return nil, errors.New("FakeModuleService.ListByCourseFn not set")
	}
	return f.ListByCourseFn(ctx, q)
}

// CountByCourse dispatches to CountByCourseFn, or
// returns "CountByCourseFn not set" when nil.
func (f *FakeModuleService) CountByCourse(ctx context.Context, q moduleport.ListModuleByCourseQuery) (int, error) {
	if f.CountByCourseFn == nil {
		return 0, errors.New("FakeModuleService.CountByCourseFn not set")
	}
	return f.CountByCourseFn(ctx, q)
}

// ListByCourseSince dispatches to ListByCourseSinceFn, or
// returns "ListByCourseSinceFn not set" when nil (#4237) — the
// keyset-paginated sibling of ListByCourse a cross-service `derive:`
// rollup's derived-rows-reader gRPC backing rides for its internal
// complete-scan loop; not part of the general REST/HTMX listing surface.
func (f *FakeModuleService) ListByCourseSince(ctx context.Context, refID string, afterCreatedAt time.Time, afterID string, limit int) ([]*moduleport.ModuleResponse, error) {
	if f.ListByCourseSinceFn == nil {
		return nil, errors.New("FakeModuleService.ListByCourseSinceFn not set")
	}
	return f.ListByCourseSinceFn(ctx, refID, afterCreatedAt, afterID, limit)
}

// Options dispatches to OptionsFn, or returns "OptionsFn not set"
// when nil.
func (f *FakeModuleService) Options(ctx context.Context, q moduleport.ModuleOptionsQuery) ([]moduleport.ModuleOption, error) {
	if f.OptionsFn == nil {
		return nil, errors.New("FakeModuleService.OptionsFn not set")
	}
	return f.OptionsFn(ctx, q)
}

// Update dispatches to UpdateFn, or returns "UpdateFn not set" when
// nil.
func (f *FakeModuleService) Update(ctx context.Context, cmd moduleport.UpdateModuleCommand) (*moduleport.ModuleResponse, error) {
	if f.UpdateFn == nil {
		return nil, errors.New("FakeModuleService.UpdateFn not set")
	}
	return f.UpdateFn(ctx, cmd)
}

// Delete dispatches to DeleteFn, or returns "DeleteFn not set" when
// nil.
func (f *FakeModuleService) Delete(ctx context.Context, cmd moduleport.DeleteModuleCommand) error {
	if f.DeleteFn == nil {
		return errors.New("FakeModuleService.DeleteFn not set")
	}
	return f.DeleteFn(ctx, cmd)
}

// Compile-time assertion: FakeModuleService must satisfy
// moduleport.ModuleService. When the port interface grows or
// changes a method, this line breaks the build at the substrate level
// AND in every project that imports the generated fake — far better
// than a downstream test panicking at runtime when it tries to invoke
// an Fn that no longer exists.
var _ moduleport.ModuleService = (*FakeModuleService)(nil)
