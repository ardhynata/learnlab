package questionport

import (
	"context"
	"reflect"
	"testing"
	"time"
)

// fakeQuestionService is a hand-rolled implementation of the
// QuestionService interface. The compile-time `var _ ... = ...`
// assertion below is the load-bearing assertion: when someone adds or
// changes a method on the interface, this test fails to compile,
// breaking the build immediately rather than waiting for a downstream
// import to break. Method bodies are stubs — the contract being pinned
// is the *signature set*, not behavior.
type fakeQuestionService struct{}

func (fakeQuestionService) Create(ctx context.Context, cmd CreateQuestionCommand) (*QuestionResponse, error) {
	return nil, nil
}

func (fakeQuestionService) GetByID(ctx context.Context, q GetQuestionByIDQuery) (*QuestionResponse, error) {
	return nil, nil
}

func (fakeQuestionService) List(ctx context.Context, q ListQuestionQuery) ([]*QuestionResponse, error) {
	return nil, nil
}

// ListByLesson pins the auto-emitted ref-listing method on the
// inbound port (#403 sub-3 / #421). The fake returns nil/nil — the
// load-bearing contract is the compile-time interface satisfaction
// below, not the body.
func (fakeQuestionService) ListByLesson(ctx context.Context, q ListQuestionByLessonQuery) ([]*QuestionResponse, error) {
	return nil, nil
}

// CountByLesson pins the auto-emitted ref-count method on the inbound
// port (#2202). Returns 0/nil — the load-bearing contract is the compile-time
// interface satisfaction below, not the body.
func (fakeQuestionService) CountByLesson(ctx context.Context, q ListQuestionByLessonQuery) (int, error) {
	return 0, nil
}

// ListByLessonSince pins the auto-emitted keyset-paginated sibling of
// ListByLesson on the inbound port (#4237). Returns nil/nil — the
// load-bearing contract is the compile-time interface satisfaction below,
// not the body.
func (fakeQuestionService) ListByLessonSince(ctx context.Context, refID string, afterCreatedAt time.Time, afterID string, limit int) ([]*QuestionResponse, error) {
	return nil, nil
}

// Options pins the auto-emitted `[{id, label}]` projection method on
// the inbound port (#403 sub-5 / #421). Driven by the spec's
// `display_field:` declaration. The fake returns nil/nil; interface
// satisfaction is the load-bearing contract here, not behavior.
func (fakeQuestionService) Options(ctx context.Context, q QuestionOptionsQuery) ([]QuestionOption, error) {
	return nil, nil
}

func (fakeQuestionService) Update(ctx context.Context, cmd UpdateQuestionCommand) (*QuestionResponse, error) {
	return nil, nil
}

func (fakeQuestionService) Delete(ctx context.Context, cmd DeleteQuestionCommand) error {
	return nil
}

// Compile-time assertion: fakeQuestionService must satisfy
// QuestionService. Adding/removing methods on the port without
// updating the fake breaks this line at compile time.
var _ QuestionService = (*fakeQuestionService)(nil)

// TestFakeQuestionServiceSatisfiesPort is a runtime guard for the
// compile-time assertion above: if the package ever stops importing
// the fake (e.g. via dead-code elimination of the var), `go test` still
// links the file and the interface satisfaction is exercised.
func TestFakeQuestionServiceSatisfiesPort(t *testing.T) {
	port := reflect.TypeOf((*QuestionService)(nil)).Elem()
	if got, want := reflect.TypeOf(fakeQuestionService{}).NumMethod(), port.NumMethod(); got != want {
		t.Errorf("fakeQuestionService implements %d methods, port declares %d: the fake no longer mirrors the port", got, want)
	}
}
