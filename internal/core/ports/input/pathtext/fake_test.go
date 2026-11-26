package pathtextport_test

import (
	"context"
	"errors"
	"time"

	pathtextport "example.com/learnlab/internal/core/ports/input/pathtext"
)

// The fake's Fn signatures only mention types declared in the port
// package (pathtextport.CreatePathTextCommand, *pathtextport.PathTextResponse,
// etc.). The user-declared value-object types those structs hold
// internally — `domain.Money`, `domain.Address`, etc. — are visible to
// the fake transitively through the pathtextport import; the fake itself
// never names them, so no domain import is necessary.

// FakePathTextService is a generated test double for the
// pathtextport.PathTextService inbound port. Each interface method
// has a matching `<Method>Fn` field of the exact signature the
// interface requires; the method body invokes the field when set and
// otherwise returns a clear "<Method>Fn not set" error.
//
// Adapter tests (REST handlers, htmx handlers, gRPC servers, etc.)
// instantiate this struct and assign only the Fn fields the test
// actually exercises:
//
//	svc := &pathtextportfake.FakePathTextService{
//	    CreateFn: func(ctx context.Context, cmd pathtextport.CreatePathTextCommand) (*pathtextport.PathTextResponse, error) {
//	        return &pathtextport.PathTextResponse{}, nil
//	    },
//	}
//
// Methods that the test does NOT set surface a clear "Fn not set"
// error so a missing wiring shows up as a test failure with a useful
// message instead of a nil-pointer panic.
//
// The compile-time assertion at the bottom of the file pins that
// FakePathTextService satisfies pathtextport.PathTextService —
// adding a new method to the port interface fails the substrate's CI
// and adapter tests at compile time, never at runtime.
type FakePathTextService struct {
	CreateFn          func(ctx context.Context, cmd pathtextport.CreatePathTextCommand) (*pathtextport.PathTextResponse, error)
	GetByIDFn         func(ctx context.Context, q pathtextport.GetPathTextByIDQuery) (*pathtextport.PathTextResponse, error)
	ListFn            func(ctx context.Context, q pathtextport.ListPathTextQuery) ([]*pathtextport.PathTextResponse, error)
	ListByPathFn      func(ctx context.Context, q pathtextport.ListPathTextByPathQuery) ([]*pathtextport.PathTextResponse, error)
	CountByPathFn     func(ctx context.Context, q pathtextport.ListPathTextByPathQuery) (int, error)
	ListByPathSinceFn func(ctx context.Context, refID string, afterCreatedAt time.Time, afterID string, limit int) ([]*pathtextport.PathTextResponse, error)
	OptionsFn         func(ctx context.Context, q pathtextport.PathTextOptionsQuery) ([]pathtextport.PathTextOption, error)
	UpdateFn          func(ctx context.Context, cmd pathtextport.UpdatePathTextCommand) (*pathtextport.PathTextResponse, error)
	DeleteFn          func(ctx context.Context, cmd pathtextport.DeletePathTextCommand) error
}

// Create dispatches to CreateFn, or returns "CreateFn not set" when
// the test left the field nil — surfaces missing wiring as a clear
// test failure instead of a nil-deref panic.
func (f *FakePathTextService) Create(ctx context.Context, cmd pathtextport.CreatePathTextCommand) (*pathtextport.PathTextResponse, error) {
	if f.CreateFn == nil {
		return nil, errors.New("FakePathTextService.CreateFn not set")
	}
	return f.CreateFn(ctx, cmd)
}

// GetByID dispatches to GetByIDFn, or returns "GetByIDFn not set"
// when nil.
func (f *FakePathTextService) GetByID(ctx context.Context, q pathtextport.GetPathTextByIDQuery) (*pathtextport.PathTextResponse, error) {
	if f.GetByIDFn == nil {
		return nil, errors.New("FakePathTextService.GetByIDFn not set")
	}
	return f.GetByIDFn(ctx, q)
}

// List dispatches to ListFn, or returns "ListFn not set" when nil.
func (f *FakePathTextService) List(ctx context.Context, q pathtextport.ListPathTextQuery) ([]*pathtextport.PathTextResponse, error) {
	if f.ListFn == nil {
		return nil, errors.New("FakePathTextService.ListFn not set")
	}
	return f.ListFn(ctx, q)
}

// ListByPath dispatches to ListByPathFn, or
// returns "ListByPathFn not set" when nil.
func (f *FakePathTextService) ListByPath(ctx context.Context, q pathtextport.ListPathTextByPathQuery) ([]*pathtextport.PathTextResponse, error) {
	if f.ListByPathFn == nil {
		return nil, errors.New("FakePathTextService.ListByPathFn not set")
	}
	return f.ListByPathFn(ctx, q)
}

// CountByPath dispatches to CountByPathFn, or
// returns "CountByPathFn not set" when nil.
func (f *FakePathTextService) CountByPath(ctx context.Context, q pathtextport.ListPathTextByPathQuery) (int, error) {
	if f.CountByPathFn == nil {
		return 0, errors.New("FakePathTextService.CountByPathFn not set")
	}
	return f.CountByPathFn(ctx, q)
}

// ListByPathSince dispatches to ListByPathSinceFn, or
// returns "ListByPathSinceFn not set" when nil (#4237) — the
// keyset-paginated sibling of ListByPath a cross-service `derive:`
// rollup's derived-rows-reader gRPC backing rides for its internal
// complete-scan loop; not part of the general REST/HTMX listing surface.
func (f *FakePathTextService) ListByPathSince(ctx context.Context, refID string, afterCreatedAt time.Time, afterID string, limit int) ([]*pathtextport.PathTextResponse, error) {
	if f.ListByPathSinceFn == nil {
		return nil, errors.New("FakePathTextService.ListByPathSinceFn not set")
	}
	return f.ListByPathSinceFn(ctx, refID, afterCreatedAt, afterID, limit)
}

// Options dispatches to OptionsFn, or returns "OptionsFn not set"
// when nil.
func (f *FakePathTextService) Options(ctx context.Context, q pathtextport.PathTextOptionsQuery) ([]pathtextport.PathTextOption, error) {
	if f.OptionsFn == nil {
		return nil, errors.New("FakePathTextService.OptionsFn not set")
	}
	return f.OptionsFn(ctx, q)
}

// Update dispatches to UpdateFn, or returns "UpdateFn not set" when
// nil.
func (f *FakePathTextService) Update(ctx context.Context, cmd pathtextport.UpdatePathTextCommand) (*pathtextport.PathTextResponse, error) {
	if f.UpdateFn == nil {
		return nil, errors.New("FakePathTextService.UpdateFn not set")
	}
	return f.UpdateFn(ctx, cmd)
}

// Delete dispatches to DeleteFn, or returns "DeleteFn not set" when
// nil.
func (f *FakePathTextService) Delete(ctx context.Context, cmd pathtextport.DeletePathTextCommand) error {
	if f.DeleteFn == nil {
		return errors.New("FakePathTextService.DeleteFn not set")
	}
	return f.DeleteFn(ctx, cmd)
}

// Compile-time assertion: FakePathTextService must satisfy
// pathtextport.PathTextService. When the port interface grows or
// changes a method, this line breaks the build at the substrate level
// AND in every project that imports the generated fake — far better
// than a downstream test panicking at runtime when it tries to invoke
// an Fn that no longer exists.
var _ pathtextport.PathTextService = (*FakePathTextService)(nil)
