package lessonport

import (
	"context"
	"reflect"
	"testing"
	"time"
)

// fakeLessonService is a hand-rolled implementation of the
// LessonService interface. The compile-time `var _ ... = ...`
// assertion below is the load-bearing assertion: when someone adds or
// changes a method on the interface, this test fails to compile,
// breaking the build immediately rather than waiting for a downstream
// import to break. Method bodies are stubs — the contract being pinned
// is the *signature set*, not behavior.
type fakeLessonService struct{}

func (fakeLessonService) Create(ctx context.Context, cmd CreateLessonCommand) (*LessonResponse, error) {
	return nil, nil
}

func (fakeLessonService) GetByID(ctx context.Context, q GetLessonByIDQuery) (*LessonResponse, error) {
	return nil, nil
}

func (fakeLessonService) List(ctx context.Context, q ListLessonQuery) ([]*LessonResponse, error) {
	return nil, nil
}

// ListByCourse pins the auto-emitted ref-listing method on the
// inbound port (#403 sub-3 / #421). The fake returns nil/nil — the
// load-bearing contract is the compile-time interface satisfaction
// below, not the body.
func (fakeLessonService) ListByCourse(ctx context.Context, q ListLessonByCourseQuery) ([]*LessonResponse, error) {
	return nil, nil
}

// CountByCourse pins the auto-emitted ref-count method on the inbound
// port (#2202). Returns 0/nil — the load-bearing contract is the compile-time
// interface satisfaction below, not the body.
func (fakeLessonService) CountByCourse(ctx context.Context, q ListLessonByCourseQuery) (int, error) {
	return 0, nil
}

// ListByCourseSince pins the auto-emitted keyset-paginated sibling of
// ListByCourse on the inbound port (#4237). Returns nil/nil — the
// load-bearing contract is the compile-time interface satisfaction below,
// not the body.
func (fakeLessonService) ListByCourseSince(ctx context.Context, refID string, afterCreatedAt time.Time, afterID string, limit int) ([]*LessonResponse, error) {
	return nil, nil
}

// ListByModule pins the auto-emitted ref-listing method on the
// inbound port (#403 sub-3 / #421). The fake returns nil/nil — the
// load-bearing contract is the compile-time interface satisfaction
// below, not the body.
func (fakeLessonService) ListByModule(ctx context.Context, q ListLessonByModuleQuery) ([]*LessonResponse, error) {
	return nil, nil
}

// CountByModule pins the auto-emitted ref-count method on the inbound
// port (#2202). Returns 0/nil — the load-bearing contract is the compile-time
// interface satisfaction below, not the body.
func (fakeLessonService) CountByModule(ctx context.Context, q ListLessonByModuleQuery) (int, error) {
	return 0, nil
}

// ListByModuleSince pins the auto-emitted keyset-paginated sibling of
// ListByModule on the inbound port (#4237). Returns nil/nil — the
// load-bearing contract is the compile-time interface satisfaction below,
// not the body.
func (fakeLessonService) ListByModuleSince(ctx context.Context, refID string, afterCreatedAt time.Time, afterID string, limit int) ([]*LessonResponse, error) {
	return nil, nil
}

// Options pins the auto-emitted `[{id, label}]` projection method on
// the inbound port (#403 sub-5 / #421). Driven by the spec's
// `display_field:` declaration. The fake returns nil/nil; interface
// satisfaction is the load-bearing contract here, not behavior.
func (fakeLessonService) Options(ctx context.Context, q LessonOptionsQuery) ([]LessonOption, error) {
	return nil, nil
}

func (fakeLessonService) Update(ctx context.Context, cmd UpdateLessonCommand) (*LessonResponse, error) {
	return nil, nil
}

func (fakeLessonService) Delete(ctx context.Context, cmd DeleteLessonCommand) error {
	return nil
}

// Compile-time assertion: fakeLessonService must satisfy
// LessonService. Adding/removing methods on the port without
// updating the fake breaks this line at compile time.
var _ LessonService = (*fakeLessonService)(nil)

// TestFakeLessonServiceSatisfiesPort is a runtime guard for the
// compile-time assertion above: if the package ever stops importing
// the fake (e.g. via dead-code elimination of the var), `go test` still
// links the file and the interface satisfaction is exercised.
func TestFakeLessonServiceSatisfiesPort(t *testing.T) {
	port := reflect.TypeOf((*LessonService)(nil)).Elem()
	if got, want := reflect.TypeOf(fakeLessonService{}).NumMethod(), port.NumMethod(); got != want {
		t.Errorf("fakeLessonService implements %d methods, port declares %d: the fake no longer mirrors the port", got, want)
	}
}
