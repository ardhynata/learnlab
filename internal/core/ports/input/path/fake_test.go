package pathport_test

import (
	"context"
	"errors"

	pathport "example.com/learnlab/internal/core/ports/input/path"
)

// The fake's Fn signatures only mention types declared in the port
// package (pathport.CreatePathCommand, *pathport.PathResponse,
// etc.). The user-declared value-object types those structs hold
// internally — `domain.Money`, `domain.Address`, etc. — are visible to
// the fake transitively through the pathport import; the fake itself
// never names them, so no domain import is necessary.

// FakePathService is a generated test double for the
// pathport.PathService inbound port. Each interface method
// has a matching `<Method>Fn` field of the exact signature the
// interface requires; the method body invokes the field when set and
// otherwise returns a clear "<Method>Fn not set" error.
//
// Adapter tests (REST handlers, htmx handlers, gRPC servers, etc.)
// instantiate this struct and assign only the Fn fields the test
// actually exercises:
//
//	svc := &pathportfake.FakePathService{
//	    CreateFn: func(ctx context.Context, cmd pathport.CreatePathCommand) (*pathport.PathResponse, error) {
//	        return &pathport.PathResponse{}, nil
//	    },
//	}
//
// Methods that the test does NOT set surface a clear "Fn not set"
// error so a missing wiring shows up as a test failure with a useful
// message instead of a nil-pointer panic.
//
// The compile-time assertion at the bottom of the file pins that
// FakePathService satisfies pathport.PathService —
// adding a new method to the port interface fails the substrate's CI
// and adapter tests at compile time, never at runtime.
type FakePathService struct {
	CreateFn  func(ctx context.Context, cmd pathport.CreatePathCommand) (*pathport.PathResponse, error)
	GetByIDFn func(ctx context.Context, q pathport.GetPathByIDQuery) (*pathport.PathResponse, error)
	ListFn    func(ctx context.Context, q pathport.ListPathQuery) ([]*pathport.PathResponse, error)
	OptionsFn func(ctx context.Context, q pathport.PathOptionsQuery) ([]pathport.PathOption, error)
	UpdateFn  func(ctx context.Context, cmd pathport.UpdatePathCommand) (*pathport.PathResponse, error)
	DeleteFn  func(ctx context.Context, cmd pathport.DeletePathCommand) error
}

// Create dispatches to CreateFn, or returns "CreateFn not set" when
// the test left the field nil — surfaces missing wiring as a clear
// test failure instead of a nil-deref panic.
func (f *FakePathService) Create(ctx context.Context, cmd pathport.CreatePathCommand) (*pathport.PathResponse, error) {
	if f.CreateFn == nil {
		return nil, errors.New("FakePathService.CreateFn not set")
	}
	return f.CreateFn(ctx, cmd)
}

// GetByID dispatches to GetByIDFn, or returns "GetByIDFn not set"
// when nil.
func (f *FakePathService) GetByID(ctx context.Context, q pathport.GetPathByIDQuery) (*pathport.PathResponse, error) {
	if f.GetByIDFn == nil {
		return nil, errors.New("FakePathService.GetByIDFn not set")
	}
	return f.GetByIDFn(ctx, q)
}

// List dispatches to ListFn, or returns "ListFn not set" when nil.
func (f *FakePathService) List(ctx context.Context, q pathport.ListPathQuery) ([]*pathport.PathResponse, error) {
	if f.ListFn == nil {
		return nil, errors.New("FakePathService.ListFn not set")
	}
	return f.ListFn(ctx, q)
}

// Options dispatches to OptionsFn, or returns "OptionsFn not set"
// when nil.
func (f *FakePathService) Options(ctx context.Context, q pathport.PathOptionsQuery) ([]pathport.PathOption, error) {
	if f.OptionsFn == nil {
		return nil, errors.New("FakePathService.OptionsFn not set")
	}
	return f.OptionsFn(ctx, q)
}

// Update dispatches to UpdateFn, or returns "UpdateFn not set" when
// nil.
func (f *FakePathService) Update(ctx context.Context, cmd pathport.UpdatePathCommand) (*pathport.PathResponse, error) {
	if f.UpdateFn == nil {
		return nil, errors.New("FakePathService.UpdateFn not set")
	}
	return f.UpdateFn(ctx, cmd)
}

// Delete dispatches to DeleteFn, or returns "DeleteFn not set" when
// nil.
func (f *FakePathService) Delete(ctx context.Context, cmd pathport.DeletePathCommand) error {
	if f.DeleteFn == nil {
		return errors.New("FakePathService.DeleteFn not set")
	}
	return f.DeleteFn(ctx, cmd)
}

// Compile-time assertion: FakePathService must satisfy
// pathport.PathService. When the port interface grows or
// changes a method, this line breaks the build at the substrate level
// AND in every project that imports the generated fake — far better
// than a downstream test panicking at runtime when it tries to invoke
// an Fn that no longer exists.
var _ pathport.PathService = (*FakePathService)(nil)
