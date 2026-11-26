package coursetextport

import (
	"context"
	"reflect"
	"testing"
	"time"
)

// fakeCourseTextService is a hand-rolled implementation of the
// CourseTextService interface. The compile-time `var _ ... = ...`
// assertion below is the load-bearing assertion: when someone adds or
// changes a method on the interface, this test fails to compile,
// breaking the build immediately rather than waiting for a downstream
// import to break. Method bodies are stubs — the contract being pinned
// is the *signature set*, not behavior.
type fakeCourseTextService struct{}

func (fakeCourseTextService) Create(ctx context.Context, cmd CreateCourseTextCommand) (*CourseTextResponse, error) {
	return nil, nil
}

func (fakeCourseTextService) GetByID(ctx context.Context, q GetCourseTextByIDQuery) (*CourseTextResponse, error) {
	return nil, nil
}

func (fakeCourseTextService) List(ctx context.Context, q ListCourseTextQuery) ([]*CourseTextResponse, error) {
	return nil, nil
}

// ListByCourse pins the auto-emitted ref-listing method on the
// inbound port (#403 sub-3 / #421). The fake returns nil/nil — the
// load-bearing contract is the compile-time interface satisfaction
// below, not the body.
func (fakeCourseTextService) ListByCourse(ctx context.Context, q ListCourseTextByCourseQuery) ([]*CourseTextResponse, error) {
	return nil, nil
}

// CountByCourse pins the auto-emitted ref-count method on the inbound
// port (#2202). Returns 0/nil — the load-bearing contract is the compile-time
// interface satisfaction below, not the body.
func (fakeCourseTextService) CountByCourse(ctx context.Context, q ListCourseTextByCourseQuery) (int, error) {
	return 0, nil
}

// ListByCourseSince pins the auto-emitted keyset-paginated sibling of
// ListByCourse on the inbound port (#4237). Returns nil/nil — the
// load-bearing contract is the compile-time interface satisfaction below,
// not the body.
func (fakeCourseTextService) ListByCourseSince(ctx context.Context, refID string, afterCreatedAt time.Time, afterID string, limit int) ([]*CourseTextResponse, error) {
	return nil, nil
}

// Options pins the auto-emitted `[{id, label}]` projection method on
// the inbound port (#403 sub-5 / #421). Driven by the spec's
// `display_field:` declaration. The fake returns nil/nil; interface
// satisfaction is the load-bearing contract here, not behavior.
func (fakeCourseTextService) Options(ctx context.Context, q CourseTextOptionsQuery) ([]CourseTextOption, error) {
	return nil, nil
}

func (fakeCourseTextService) Update(ctx context.Context, cmd UpdateCourseTextCommand) (*CourseTextResponse, error) {
	return nil, nil
}

func (fakeCourseTextService) Delete(ctx context.Context, cmd DeleteCourseTextCommand) error {
	return nil
}

// Compile-time assertion: fakeCourseTextService must satisfy
// CourseTextService. Adding/removing methods on the port without
// updating the fake breaks this line at compile time.
var _ CourseTextService = (*fakeCourseTextService)(nil)

// TestFakeCourseTextServiceSatisfiesPort is a runtime guard for the
// compile-time assertion above: if the package ever stops importing
// the fake (e.g. via dead-code elimination of the var), `go test` still
// links the file and the interface satisfaction is exercised.
func TestFakeCourseTextServiceSatisfiesPort(t *testing.T) {
	port := reflect.TypeOf((*CourseTextService)(nil)).Elem()
	if got, want := reflect.TypeOf(fakeCourseTextService{}).NumMethod(), port.NumMethod(); got != want {
		t.Errorf("fakeCourseTextService implements %d methods, port declares %d: the fake no longer mirrors the port", got, want)
	}
}
