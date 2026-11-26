package learnerport_test

import (
	"context"
	"errors"

	learnerport "example.com/learnlab/internal/core/ports/input/learner"
)

// The fake's Fn signatures only mention types declared in the port
// package (learnerport.CreateLearnerCommand, *learnerport.LearnerResponse,
// etc.). The user-declared value-object types those structs hold
// internally — `domain.Money`, `domain.Address`, etc. — are visible to
// the fake transitively through the learnerport import; the fake itself
// never names them, so no domain import is necessary.

// FakeLearnerService is a generated test double for the
// learnerport.LearnerService inbound port. Each interface method
// has a matching `<Method>Fn` field of the exact signature the
// interface requires; the method body invokes the field when set and
// otherwise returns a clear "<Method>Fn not set" error.
//
// Adapter tests (REST handlers, htmx handlers, gRPC servers, etc.)
// instantiate this struct and assign only the Fn fields the test
// actually exercises:
//
//	svc := &learnerportfake.FakeLearnerService{
//	    CreateFn: func(ctx context.Context, cmd learnerport.CreateLearnerCommand) (*learnerport.LearnerResponse, error) {
//	        return &learnerport.LearnerResponse{}, nil
//	    },
//	}
//
// Methods that the test does NOT set surface a clear "Fn not set"
// error so a missing wiring shows up as a test failure with a useful
// message instead of a nil-pointer panic.
//
// The compile-time assertion at the bottom of the file pins that
// FakeLearnerService satisfies learnerport.LearnerService —
// adding a new method to the port interface fails the substrate's CI
// and adapter tests at compile time, never at runtime.
type FakeLearnerService struct {
	CreateFn  func(ctx context.Context, cmd learnerport.CreateLearnerCommand) (*learnerport.LearnerResponse, error)
	GetByIDFn func(ctx context.Context, q learnerport.GetLearnerByIDQuery) (*learnerport.LearnerResponse, error)
	ListFn    func(ctx context.Context, q learnerport.ListLearnerQuery) ([]*learnerport.LearnerResponse, error)
	OptionsFn func(ctx context.Context, q learnerport.LearnerOptionsQuery) ([]learnerport.LearnerOption, error)
	UpdateFn  func(ctx context.Context, cmd learnerport.UpdateLearnerCommand) (*learnerport.LearnerResponse, error)
	DeleteFn  func(ctx context.Context, cmd learnerport.DeleteLearnerCommand) error
}

// Create dispatches to CreateFn, or returns "CreateFn not set" when
// the test left the field nil — surfaces missing wiring as a clear
// test failure instead of a nil-deref panic.
func (f *FakeLearnerService) Create(ctx context.Context, cmd learnerport.CreateLearnerCommand) (*learnerport.LearnerResponse, error) {
	if f.CreateFn == nil {
		return nil, errors.New("FakeLearnerService.CreateFn not set")
	}
	return f.CreateFn(ctx, cmd)
}

// GetByID dispatches to GetByIDFn, or returns "GetByIDFn not set"
// when nil.
func (f *FakeLearnerService) GetByID(ctx context.Context, q learnerport.GetLearnerByIDQuery) (*learnerport.LearnerResponse, error) {
	if f.GetByIDFn == nil {
		return nil, errors.New("FakeLearnerService.GetByIDFn not set")
	}
	return f.GetByIDFn(ctx, q)
}

// List dispatches to ListFn, or returns "ListFn not set" when nil.
func (f *FakeLearnerService) List(ctx context.Context, q learnerport.ListLearnerQuery) ([]*learnerport.LearnerResponse, error) {
	if f.ListFn == nil {
		return nil, errors.New("FakeLearnerService.ListFn not set")
	}
	return f.ListFn(ctx, q)
}

// Options dispatches to OptionsFn, or returns "OptionsFn not set"
// when nil.
func (f *FakeLearnerService) Options(ctx context.Context, q learnerport.LearnerOptionsQuery) ([]learnerport.LearnerOption, error) {
	if f.OptionsFn == nil {
		return nil, errors.New("FakeLearnerService.OptionsFn not set")
	}
	return f.OptionsFn(ctx, q)
}

// Update dispatches to UpdateFn, or returns "UpdateFn not set" when
// nil.
func (f *FakeLearnerService) Update(ctx context.Context, cmd learnerport.UpdateLearnerCommand) (*learnerport.LearnerResponse, error) {
	if f.UpdateFn == nil {
		return nil, errors.New("FakeLearnerService.UpdateFn not set")
	}
	return f.UpdateFn(ctx, cmd)
}

// Delete dispatches to DeleteFn, or returns "DeleteFn not set" when
// nil.
func (f *FakeLearnerService) Delete(ctx context.Context, cmd learnerport.DeleteLearnerCommand) error {
	if f.DeleteFn == nil {
		return errors.New("FakeLearnerService.DeleteFn not set")
	}
	return f.DeleteFn(ctx, cmd)
}

// Compile-time assertion: FakeLearnerService must satisfy
// learnerport.LearnerService. When the port interface grows or
// changes a method, this line breaks the build at the substrate level
// AND in every project that imports the generated fake — far better
// than a downstream test panicking at runtime when it tries to invoke
// an Fn that no longer exists.
var _ learnerport.LearnerService = (*FakeLearnerService)(nil)
