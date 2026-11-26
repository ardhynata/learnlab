package lessontextport

import (
	"context"
	"reflect"
	"testing"
	"time"
)

// fakeLessonTextService is a hand-rolled implementation of the
// LessonTextService interface. The compile-time `var _ ... = ...`
// assertion below is the load-bearing assertion: when someone adds or
// changes a method on the interface, this test fails to compile,
// breaking the build immediately rather than waiting for a downstream
// import to break. Method bodies are stubs — the contract being pinned
// is the *signature set*, not behavior.
type fakeLessonTextService struct{}

func (fakeLessonTextService) Create(ctx context.Context, cmd CreateLessonTextCommand) (*LessonTextResponse, error) {
	return nil, nil
}

func (fakeLessonTextService) GetByID(ctx context.Context, q GetLessonTextByIDQuery) (*LessonTextResponse, error) {
	return nil, nil
}

func (fakeLessonTextService) List(ctx context.Context, q ListLessonTextQuery) ([]*LessonTextResponse, error) {
	return nil, nil
}

// ListByLesson pins the auto-emitted ref-listing method on the
// inbound port (#403 sub-3 / #421). The fake returns nil/nil — the
// load-bearing contract is the compile-time interface satisfaction
// below, not the body.
func (fakeLessonTextService) ListByLesson(ctx context.Context, q ListLessonTextByLessonQuery) ([]*LessonTextResponse, error) {
	return nil, nil
}

// CountByLesson pins the auto-emitted ref-count method on the inbound
// port (#2202). Returns 0/nil — the load-bearing contract is the compile-time
// interface satisfaction below, not the body.
func (fakeLessonTextService) CountByLesson(ctx context.Context, q ListLessonTextByLessonQuery) (int, error) {
	return 0, nil
}

// ListByLessonSince pins the auto-emitted keyset-paginated sibling of
// ListByLesson on the inbound port (#4237). Returns nil/nil — the
// load-bearing contract is the compile-time interface satisfaction below,
// not the body.
func (fakeLessonTextService) ListByLessonSince(ctx context.Context, refID string, afterCreatedAt time.Time, afterID string, limit int) ([]*LessonTextResponse, error) {
	return nil, nil
}

// Options pins the auto-emitted `[{id, label}]` projection method on
// the inbound port (#403 sub-5 / #421). Driven by the spec's
// `display_field:` declaration. The fake returns nil/nil; interface
// satisfaction is the load-bearing contract here, not behavior.
func (fakeLessonTextService) Options(ctx context.Context, q LessonTextOptionsQuery) ([]LessonTextOption, error) {
	return nil, nil
}

func (fakeLessonTextService) Update(ctx context.Context, cmd UpdateLessonTextCommand) (*LessonTextResponse, error) {
	return nil, nil
}

func (fakeLessonTextService) Delete(ctx context.Context, cmd DeleteLessonTextCommand) error {
	return nil
}

// Compile-time assertion: fakeLessonTextService must satisfy
// LessonTextService. Adding/removing methods on the port without
// updating the fake breaks this line at compile time.
var _ LessonTextService = (*fakeLessonTextService)(nil)

// TestFakeLessonTextServiceSatisfiesPort is a runtime guard for the
// compile-time assertion above: if the package ever stops importing
// the fake (e.g. via dead-code elimination of the var), `go test` still
// links the file and the interface satisfaction is exercised.
func TestFakeLessonTextServiceSatisfiesPort(t *testing.T) {
	port := reflect.TypeOf((*LessonTextService)(nil)).Elem()
	if got, want := reflect.TypeOf(fakeLessonTextService{}).NumMethod(), port.NumMethod(); got != want {
		t.Errorf("fakeLessonTextService implements %d methods, port declares %d: the fake no longer mirrors the port", got, want)
	}
}
