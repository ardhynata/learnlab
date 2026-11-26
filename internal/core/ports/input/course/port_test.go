package courseport

import (
	"context"
	"reflect"
	"testing"
	"time"
)

// fakeCourseService is a hand-rolled implementation of the
// CourseService interface. The compile-time `var _ ... = ...`
// assertion below is the load-bearing assertion: when someone adds or
// changes a method on the interface, this test fails to compile,
// breaking the build immediately rather than waiting for a downstream
// import to break. Method bodies are stubs — the contract being pinned
// is the *signature set*, not behavior.
type fakeCourseService struct{}

func (fakeCourseService) Create(ctx context.Context, cmd CreateCourseCommand) (*CourseResponse, error) {
	return nil, nil
}

func (fakeCourseService) GetByID(ctx context.Context, q GetCourseByIDQuery) (*CourseResponse, error) {
	return nil, nil
}

func (fakeCourseService) List(ctx context.Context, q ListCourseQuery) ([]*CourseResponse, error) {
	return nil, nil
}

// ListByPath pins the auto-emitted ref-listing method on the
// inbound port (#403 sub-3 / #421). The fake returns nil/nil — the
// load-bearing contract is the compile-time interface satisfaction
// below, not the body.
func (fakeCourseService) ListByPath(ctx context.Context, q ListCourseByPathQuery) ([]*CourseResponse, error) {
	return nil, nil
}

// CountByPath pins the auto-emitted ref-count method on the inbound
// port (#2202). Returns 0/nil — the load-bearing contract is the compile-time
// interface satisfaction below, not the body.
func (fakeCourseService) CountByPath(ctx context.Context, q ListCourseByPathQuery) (int, error) {
	return 0, nil
}

// ListByPathSince pins the auto-emitted keyset-paginated sibling of
// ListByPath on the inbound port (#4237). Returns nil/nil — the
// load-bearing contract is the compile-time interface satisfaction below,
// not the body.
func (fakeCourseService) ListByPathSince(ctx context.Context, refID string, afterCreatedAt time.Time, afterID string, limit int) ([]*CourseResponse, error) {
	return nil, nil
}

// Options pins the auto-emitted `[{id, label}]` projection method on
// the inbound port (#403 sub-5 / #421). Driven by the spec's
// `display_field:` declaration. The fake returns nil/nil; interface
// satisfaction is the load-bearing contract here, not behavior.
func (fakeCourseService) Options(ctx context.Context, q CourseOptionsQuery) ([]CourseOption, error) {
	return nil, nil
}

func (fakeCourseService) Update(ctx context.Context, cmd UpdateCourseCommand) (*CourseResponse, error) {
	return nil, nil
}

func (fakeCourseService) Delete(ctx context.Context, cmd DeleteCourseCommand) error {
	return nil
}

// Compile-time assertion: fakeCourseService must satisfy
// CourseService. Adding/removing methods on the port without
// updating the fake breaks this line at compile time.
var _ CourseService = (*fakeCourseService)(nil)

// TestFakeCourseServiceSatisfiesPort is a runtime guard for the
// compile-time assertion above: if the package ever stops importing
// the fake (e.g. via dead-code elimination of the var), `go test` still
// links the file and the interface satisfaction is exercised.
func TestFakeCourseServiceSatisfiesPort(t *testing.T) {
	port := reflect.TypeOf((*CourseService)(nil)).Elem()
	if got, want := reflect.TypeOf(fakeCourseService{}).NumMethod(), port.NumMethod(); got != want {
		t.Errorf("fakeCourseService implements %d methods, port declares %d: the fake no longer mirrors the port", got, want)
	}
}
