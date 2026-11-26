package questiontextport_test

import (
	"context"
	"errors"
	"time"

	questiontextport "example.com/learnlab/internal/core/ports/input/questiontext"
)

// The fake's Fn signatures only mention types declared in the port
// package (questiontextport.CreateQuestionTextCommand, *questiontextport.QuestionTextResponse,
// etc.). The user-declared value-object types those structs hold
// internally — `domain.Money`, `domain.Address`, etc. — are visible to
// the fake transitively through the questiontextport import; the fake itself
// never names them, so no domain import is necessary.

// FakeQuestionTextService is a generated test double for the
// questiontextport.QuestionTextService inbound port. Each interface method
// has a matching `<Method>Fn` field of the exact signature the
// interface requires; the method body invokes the field when set and
// otherwise returns a clear "<Method>Fn not set" error.
//
// Adapter tests (REST handlers, htmx handlers, gRPC servers, etc.)
// instantiate this struct and assign only the Fn fields the test
// actually exercises:
//
//	svc := &questiontextportfake.FakeQuestionTextService{
//	    CreateFn: func(ctx context.Context, cmd questiontextport.CreateQuestionTextCommand) (*questiontextport.QuestionTextResponse, error) {
//	        return &questiontextport.QuestionTextResponse{}, nil
//	    },
//	}
//
// Methods that the test does NOT set surface a clear "Fn not set"
// error so a missing wiring shows up as a test failure with a useful
// message instead of a nil-pointer panic.
//
// The compile-time assertion at the bottom of the file pins that
// FakeQuestionTextService satisfies questiontextport.QuestionTextService —
// adding a new method to the port interface fails the substrate's CI
// and adapter tests at compile time, never at runtime.
type FakeQuestionTextService struct {
	CreateFn            func(ctx context.Context, cmd questiontextport.CreateQuestionTextCommand) (*questiontextport.QuestionTextResponse, error)
	GetByIDFn           func(ctx context.Context, q questiontextport.GetQuestionTextByIDQuery) (*questiontextport.QuestionTextResponse, error)
	ListFn              func(ctx context.Context, q questiontextport.ListQuestionTextQuery) ([]*questiontextport.QuestionTextResponse, error)
	ListByLessonFn      func(ctx context.Context, q questiontextport.ListQuestionTextByLessonQuery) ([]*questiontextport.QuestionTextResponse, error)
	CountByLessonFn     func(ctx context.Context, q questiontextport.ListQuestionTextByLessonQuery) (int, error)
	ListByLessonSinceFn func(ctx context.Context, refID string, afterCreatedAt time.Time, afterID string, limit int) ([]*questiontextport.QuestionTextResponse, error)
	OptionsFn           func(ctx context.Context, q questiontextport.QuestionTextOptionsQuery) ([]questiontextport.QuestionTextOption, error)
	UpdateFn            func(ctx context.Context, cmd questiontextport.UpdateQuestionTextCommand) (*questiontextport.QuestionTextResponse, error)
	DeleteFn            func(ctx context.Context, cmd questiontextport.DeleteQuestionTextCommand) error
}

// Create dispatches to CreateFn, or returns "CreateFn not set" when
// the test left the field nil — surfaces missing wiring as a clear
// test failure instead of a nil-deref panic.
func (f *FakeQuestionTextService) Create(ctx context.Context, cmd questiontextport.CreateQuestionTextCommand) (*questiontextport.QuestionTextResponse, error) {
	if f.CreateFn == nil {
		return nil, errors.New("FakeQuestionTextService.CreateFn not set")
	}
	return f.CreateFn(ctx, cmd)
}

// GetByID dispatches to GetByIDFn, or returns "GetByIDFn not set"
// when nil.
func (f *FakeQuestionTextService) GetByID(ctx context.Context, q questiontextport.GetQuestionTextByIDQuery) (*questiontextport.QuestionTextResponse, error) {
	if f.GetByIDFn == nil {
		return nil, errors.New("FakeQuestionTextService.GetByIDFn not set")
	}
	return f.GetByIDFn(ctx, q)
}

// List dispatches to ListFn, or returns "ListFn not set" when nil.
func (f *FakeQuestionTextService) List(ctx context.Context, q questiontextport.ListQuestionTextQuery) ([]*questiontextport.QuestionTextResponse, error) {
	if f.ListFn == nil {
		return nil, errors.New("FakeQuestionTextService.ListFn not set")
	}
	return f.ListFn(ctx, q)
}

// ListByLesson dispatches to ListByLessonFn, or
// returns "ListByLessonFn not set" when nil.
func (f *FakeQuestionTextService) ListByLesson(ctx context.Context, q questiontextport.ListQuestionTextByLessonQuery) ([]*questiontextport.QuestionTextResponse, error) {
	if f.ListByLessonFn == nil {
		return nil, errors.New("FakeQuestionTextService.ListByLessonFn not set")
	}
	return f.ListByLessonFn(ctx, q)
}

// CountByLesson dispatches to CountByLessonFn, or
// returns "CountByLessonFn not set" when nil.
func (f *FakeQuestionTextService) CountByLesson(ctx context.Context, q questiontextport.ListQuestionTextByLessonQuery) (int, error) {
	if f.CountByLessonFn == nil {
		return 0, errors.New("FakeQuestionTextService.CountByLessonFn not set")
	}
	return f.CountByLessonFn(ctx, q)
}

// ListByLessonSince dispatches to ListByLessonSinceFn, or
// returns "ListByLessonSinceFn not set" when nil (#4237) — the
// keyset-paginated sibling of ListByLesson a cross-service `derive:`
// rollup's derived-rows-reader gRPC backing rides for its internal
// complete-scan loop; not part of the general REST/HTMX listing surface.
func (f *FakeQuestionTextService) ListByLessonSince(ctx context.Context, refID string, afterCreatedAt time.Time, afterID string, limit int) ([]*questiontextport.QuestionTextResponse, error) {
	if f.ListByLessonSinceFn == nil {
		return nil, errors.New("FakeQuestionTextService.ListByLessonSinceFn not set")
	}
	return f.ListByLessonSinceFn(ctx, refID, afterCreatedAt, afterID, limit)
}

// Options dispatches to OptionsFn, or returns "OptionsFn not set"
// when nil.
func (f *FakeQuestionTextService) Options(ctx context.Context, q questiontextport.QuestionTextOptionsQuery) ([]questiontextport.QuestionTextOption, error) {
	if f.OptionsFn == nil {
		return nil, errors.New("FakeQuestionTextService.OptionsFn not set")
	}
	return f.OptionsFn(ctx, q)
}

// Update dispatches to UpdateFn, or returns "UpdateFn not set" when
// nil.
func (f *FakeQuestionTextService) Update(ctx context.Context, cmd questiontextport.UpdateQuestionTextCommand) (*questiontextport.QuestionTextResponse, error) {
	if f.UpdateFn == nil {
		return nil, errors.New("FakeQuestionTextService.UpdateFn not set")
	}
	return f.UpdateFn(ctx, cmd)
}

// Delete dispatches to DeleteFn, or returns "DeleteFn not set" when
// nil.
func (f *FakeQuestionTextService) Delete(ctx context.Context, cmd questiontextport.DeleteQuestionTextCommand) error {
	if f.DeleteFn == nil {
		return errors.New("FakeQuestionTextService.DeleteFn not set")
	}
	return f.DeleteFn(ctx, cmd)
}

// Compile-time assertion: FakeQuestionTextService must satisfy
// questiontextport.QuestionTextService. When the port interface grows or
// changes a method, this line breaks the build at the substrate level
// AND in every project that imports the generated fake — far better
// than a downstream test panicking at runtime when it tries to invoke
// an Fn that no longer exists.
var _ questiontextport.QuestionTextService = (*FakeQuestionTextService)(nil)
