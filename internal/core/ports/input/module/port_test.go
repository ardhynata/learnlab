package moduleport

import (
	"context"
	"reflect"
	"testing"
	"time"
)

// fakeModuleService is a hand-rolled implementation of the
// ModuleService interface. The compile-time `var _ ... = ...`
// assertion below is the load-bearing assertion: when someone adds or
// changes a method on the interface, this test fails to compile,
// breaking the build immediately rather than waiting for a downstream
// import to break. Method bodies are stubs — the contract being pinned
// is the *signature set*, not behavior.
type fakeModuleService struct{}

func (fakeModuleService) Create(ctx context.Context, cmd CreateModuleCommand) (*ModuleResponse, error) {
	return nil, nil
}

func (fakeModuleService) GetByID(ctx context.Context, q GetModuleByIDQuery) (*ModuleResponse, error) {
	return nil, nil
}

func (fakeModuleService) List(ctx context.Context, q ListModuleQuery) ([]*ModuleResponse, error) {
	return nil, nil
}

// ListByCourse pins the auto-emitted ref-listing method on the
// inbound port (#403 sub-3 / #421). The fake returns nil/nil — the
// load-bearing contract is the compile-time interface satisfaction
// below, not the body.
func (fakeModuleService) ListByCourse(ctx context.Context, q ListModuleByCourseQuery) ([]*ModuleResponse, error) {
	return nil, nil
}

// CountByCourse pins the auto-emitted ref-count method on the inbound
// port (#2202). Returns 0/nil — the load-bearing contract is the compile-time
// interface satisfaction below, not the body.
func (fakeModuleService) CountByCourse(ctx context.Context, q ListModuleByCourseQuery) (int, error) {
	return 0, nil
}

// ListByCourseSince pins the auto-emitted keyset-paginated sibling of
// ListByCourse on the inbound port (#4237). Returns nil/nil — the
// load-bearing contract is the compile-time interface satisfaction below,
// not the body.
func (fakeModuleService) ListByCourseSince(ctx context.Context, refID string, afterCreatedAt time.Time, afterID string, limit int) ([]*ModuleResponse, error) {
	return nil, nil
}

// Options pins the auto-emitted `[{id, label}]` projection method on
// the inbound port (#403 sub-5 / #421). Driven by the spec's
// `display_field:` declaration. The fake returns nil/nil; interface
// satisfaction is the load-bearing contract here, not behavior.
func (fakeModuleService) Options(ctx context.Context, q ModuleOptionsQuery) ([]ModuleOption, error) {
	return nil, nil
}

func (fakeModuleService) Update(ctx context.Context, cmd UpdateModuleCommand) (*ModuleResponse, error) {
	return nil, nil
}

func (fakeModuleService) Delete(ctx context.Context, cmd DeleteModuleCommand) error {
	return nil
}

// Compile-time assertion: fakeModuleService must satisfy
// ModuleService. Adding/removing methods on the port without
// updating the fake breaks this line at compile time.
var _ ModuleService = (*fakeModuleService)(nil)

// TestFakeModuleServiceSatisfiesPort is a runtime guard for the
// compile-time assertion above: if the package ever stops importing
// the fake (e.g. via dead-code elimination of the var), `go test` still
// links the file and the interface satisfaction is exercised.
func TestFakeModuleServiceSatisfiesPort(t *testing.T) {
	port := reflect.TypeOf((*ModuleService)(nil)).Elem()
	if got, want := reflect.TypeOf(fakeModuleService{}).NumMethod(), port.NumMethod(); got != want {
		t.Errorf("fakeModuleService implements %d methods, port declares %d: the fake no longer mirrors the port", got, want)
	}
}
