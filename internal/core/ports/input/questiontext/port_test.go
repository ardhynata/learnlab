package questiontextport

import (
	"context"
	"reflect"
	"testing"
	"time"
)

// fakeQuestionTextService is a hand-rolled implementation of the
// QuestionTextService interface. The compile-time `var _ ... = ...`
// assertion below is the load-bearing assertion: when someone adds or
// changes a method on the interface, this test fails to compile,
// breaking the build immediately rather than waiting for a downstream
// import to break. Method bodies are stubs — the contract being pinned
// is the *signature set*, not behavior.
type fakeQuestionTextService struct{}

func (fakeQuestionTextService) Create(ctx context.Context, cmd CreateQuestionTextCommand) (*QuestionTextResponse, error) {
	return nil, nil
}

func (fakeQuestionTextService) GetByID(ctx context.Context, q GetQuestionTextByIDQuery) (*QuestionTextResponse, error) {
	return nil, nil
}

func (fakeQuestionTextService) List(ctx context.Context, q ListQuestionTextQuery) ([]*QuestionTextResponse, error) {
	return nil, nil
}

// ListByLesson pins the auto-emitted ref-listing method on the
// inbound port (#403 sub-3 / #421). The fake returns nil/nil — the
// load-bearing contract is the compile-time interface satisfaction
// below, not the body.
func (fakeQuestionTextService) ListByLesson(ctx context.Context, q ListQuestionTextByLessonQuery) ([]*QuestionTextResponse, error) {
	return nil, nil
}

// CountByLesson pins the auto-emitted ref-count method on the inbound
// port (#2202). Returns 0/nil — the load-bearing contract is the compile-time
// interface satisfaction below, not the body.
func (fakeQuestionTextService) CountByLesson(ctx context.Context, q ListQuestionTextByLessonQuery) (int, error) {
	return 0, nil
}

// ListByLessonSince pins the auto-emitted keyset-paginated sibling of
// ListByLesson on the inbound port (#4237). Returns nil/nil — the
// load-bearing contract is the compile-time interface satisfaction below,
// not the body.
func (fakeQuestionTextService) ListByLessonSince(ctx context.Context, refID string, afterCreatedAt time.Time, afterID string, limit int) ([]*QuestionTextResponse, error) {
	return nil, nil
}

// Options pins the auto-emitted `[{id, label}]` projection method on
// the inbound port (#403 sub-5 / #421). Driven by the spec's
// `display_field:` declaration. The fake returns nil/nil; interface
// satisfaction is the load-bearing contract here, not behavior.
func (fakeQuestionTextService) Options(ctx context.Context, q QuestionTextOptionsQuery) ([]QuestionTextOption, error) {
	return nil, nil
}

func (fakeQuestionTextService) Update(ctx context.Context, cmd UpdateQuestionTextCommand) (*QuestionTextResponse, error) {
	return nil, nil
}

func (fakeQuestionTextService) Delete(ctx context.Context, cmd DeleteQuestionTextCommand) error {
	return nil
}

// Compile-time assertion: fakeQuestionTextService must satisfy
// QuestionTextService. Adding/removing methods on the port without
// updating the fake breaks this line at compile time.
var _ QuestionTextService = (*fakeQuestionTextService)(nil)

// TestFakeQuestionTextServiceSatisfiesPort is a runtime guard for the
// compile-time assertion above: if the package ever stops importing
// the fake (e.g. via dead-code elimination of the var), `go test` still
// links the file and the interface satisfaction is exercised.
func TestFakeQuestionTextServiceSatisfiesPort(t *testing.T) {
	port := reflect.TypeOf((*QuestionTextService)(nil)).Elem()
	if got, want := reflect.TypeOf(fakeQuestionTextService{}).NumMethod(), port.NumMethod(); got != want {
		t.Errorf("fakeQuestionTextService implements %d methods, port declares %d: the fake no longer mirrors the port", got, want)
	}
}
