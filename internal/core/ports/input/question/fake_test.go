package questionport_test

import (
	"context"
	"errors"
	"time"

	questionport "example.com/learnlab/internal/core/ports/input/question"
)

// The fake's Fn signatures only mention types declared in the port
// package (questionport.CreateQuestionCommand, *questionport.QuestionResponse,
// etc.). The user-declared value-object types those structs hold
// internally — `domain.Money`, `domain.Address`, etc. — are visible to
// the fake transitively through the questionport import; the fake itself
// never names them, so no domain import is necessary.

// FakeQuestionService is a generated test double for the
// questionport.QuestionService inbound port. Each interface method
// has a matching `<Method>Fn` field of the exact signature the
// interface requires; the method body invokes the field when set and
// otherwise returns a clear "<Method>Fn not set" error.
//
// Adapter tests (REST handlers, htmx handlers, gRPC servers, etc.)
// instantiate this struct and assign only the Fn fields the test
// actually exercises:
//
//	svc := &questionportfake.FakeQuestionService{
//	    CreateFn: func(ctx context.Context, cmd questionport.CreateQuestionCommand) (*questionport.QuestionResponse, error) {
//	        return &questionport.QuestionResponse{}, nil
//	    },
//	}
//
// Methods that the test does NOT set surface a clear "Fn not set"
// error so a missing wiring shows up as a test failure with a useful
// message instead of a nil-pointer panic.
//
// The compile-time assertion at the bottom of the file pins that
// FakeQuestionService satisfies questionport.QuestionService —
// adding a new method to the port interface fails the substrate's CI
// and adapter tests at compile time, never at runtime.
type FakeQuestionService struct {
	CreateFn            func(ctx context.Context, cmd questionport.CreateQuestionCommand) (*questionport.QuestionResponse, error)
	GetByIDFn           func(ctx context.Context, q questionport.GetQuestionByIDQuery) (*questionport.QuestionResponse, error)
	ListFn              func(ctx context.Context, q questionport.ListQuestionQuery) ([]*questionport.QuestionResponse, error)
	ListByLessonFn      func(ctx context.Context, q questionport.ListQuestionByLessonQuery) ([]*questionport.QuestionResponse, error)
	CountByLessonFn     func(ctx context.Context, q questionport.ListQuestionByLessonQuery) (int, error)
	ListByLessonSinceFn func(ctx context.Context, refID string, afterCreatedAt time.Time, afterID string, limit int) ([]*questionport.QuestionResponse, error)
	OptionsFn           func(ctx context.Context, q questionport.QuestionOptionsQuery) ([]questionport.QuestionOption, error)
	UpdateFn            func(ctx context.Context, cmd questionport.UpdateQuestionCommand) (*questionport.QuestionResponse, error)
	DeleteFn            func(ctx context.Context, cmd questionport.DeleteQuestionCommand) error
}

// Create dispatches to CreateFn, or returns "CreateFn not set" when
// the test left the field nil — surfaces missing wiring as a clear
// test failure instead of a nil-deref panic.
func (f *FakeQuestionService) Create(ctx context.Context, cmd questionport.CreateQuestionCommand) (*questionport.QuestionResponse, error) {
	if f.CreateFn == nil {
		return nil, errors.New("FakeQuestionService.CreateFn not set")
	}
	return f.CreateFn(ctx, cmd)
}

// GetByID dispatches to GetByIDFn, or returns "GetByIDFn not set"
// when nil.
func (f *FakeQuestionService) GetByID(ctx context.Context, q questionport.GetQuestionByIDQuery) (*questionport.QuestionResponse, error) {
	if f.GetByIDFn == nil {
		return nil, errors.New("FakeQuestionService.GetByIDFn not set")
	}
	return f.GetByIDFn(ctx, q)
}

// List dispatches to ListFn, or returns "ListFn not set" when nil.
func (f *FakeQuestionService) List(ctx context.Context, q questionport.ListQuestionQuery) ([]*questionport.QuestionResponse, error) {
	if f.ListFn == nil {
		return nil, errors.New("FakeQuestionService.ListFn not set")
	}
	return f.ListFn(ctx, q)
}

// ListByLesson dispatches to ListByLessonFn, or
// returns "ListByLessonFn not set" when nil.
func (f *FakeQuestionService) ListByLesson(ctx context.Context, q questionport.ListQuestionByLessonQuery) ([]*questionport.QuestionResponse, error) {
	if f.ListByLessonFn == nil {
		return nil, errors.New("FakeQuestionService.ListByLessonFn not set")
	}
	return f.ListByLessonFn(ctx, q)
}

// CountByLesson dispatches to CountByLessonFn, or
// returns "CountByLessonFn not set" when nil.
func (f *FakeQuestionService) CountByLesson(ctx context.Context, q questionport.ListQuestionByLessonQuery) (int, error) {
	if f.CountByLessonFn == nil {
		return 0, errors.New("FakeQuestionService.CountByLessonFn not set")
	}
	return f.CountByLessonFn(ctx, q)
}

// ListByLessonSince dispatches to ListByLessonSinceFn, or
// returns "ListByLessonSinceFn not set" when nil (#4237) — the
// keyset-paginated sibling of ListByLesson a cross-service `derive:`
// rollup's derived-rows-reader gRPC backing rides for its internal
// complete-scan loop; not part of the general REST/HTMX listing surface.
func (f *FakeQuestionService) ListByLessonSince(ctx context.Context, refID string, afterCreatedAt time.Time, afterID string, limit int) ([]*questionport.QuestionResponse, error) {
	if f.ListByLessonSinceFn == nil {
		return nil, errors.New("FakeQuestionService.ListByLessonSinceFn not set")
	}
	return f.ListByLessonSinceFn(ctx, refID, afterCreatedAt, afterID, limit)
}

// Options dispatches to OptionsFn, or returns "OptionsFn not set"
// when nil.
func (f *FakeQuestionService) Options(ctx context.Context, q questionport.QuestionOptionsQuery) ([]questionport.QuestionOption, error) {
	if f.OptionsFn == nil {
		return nil, errors.New("FakeQuestionService.OptionsFn not set")
	}
	return f.OptionsFn(ctx, q)
}

// Update dispatches to UpdateFn, or returns "UpdateFn not set" when
// nil.
func (f *FakeQuestionService) Update(ctx context.Context, cmd questionport.UpdateQuestionCommand) (*questionport.QuestionResponse, error) {
	if f.UpdateFn == nil {
		return nil, errors.New("FakeQuestionService.UpdateFn not set")
	}
	return f.UpdateFn(ctx, cmd)
}

// Delete dispatches to DeleteFn, or returns "DeleteFn not set" when
// nil.
func (f *FakeQuestionService) Delete(ctx context.Context, cmd questionport.DeleteQuestionCommand) error {
	if f.DeleteFn == nil {
		return errors.New("FakeQuestionService.DeleteFn not set")
	}
	return f.DeleteFn(ctx, cmd)
}

// Compile-time assertion: FakeQuestionService must satisfy
// questionport.QuestionService. When the port interface grows or
// changes a method, this line breaks the build at the substrate level
// AND in every project that imports the generated fake — far better
// than a downstream test panicking at runtime when it tries to invoke
// an Fn that no longer exists.
var _ questionport.QuestionService = (*FakeQuestionService)(nil)
