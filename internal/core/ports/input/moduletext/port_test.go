package moduletextport

import (
	"context"
	"reflect"
	"testing"
	"time"
)

// fakeModuleTextService is a hand-rolled implementation of the
// ModuleTextService interface. The compile-time `var _ ... = ...`
// assertion below is the load-bearing assertion: when someone adds or
// changes a method on the interface, this test fails to compile,
// breaking the build immediately rather than waiting for a downstream
// import to break. Method bodies are stubs — the contract being pinned
// is the *signature set*, not behavior.
type fakeModuleTextService struct{}

func (fakeModuleTextService) Create(ctx context.Context, cmd CreateModuleTextCommand) (*ModuleTextResponse, error) {
	return nil, nil
}

func (fakeModuleTextService) GetByID(ctx context.Context, q GetModuleTextByIDQuery) (*ModuleTextResponse, error) {
	return nil, nil
}

func (fakeModuleTextService) List(ctx context.Context, q ListModuleTextQuery) ([]*ModuleTextResponse, error) {
	return nil, nil
}

// ListByModule pins the auto-emitted ref-listing method on the
// inbound port (#403 sub-3 / #421). The fake returns nil/nil — the
// load-bearing contract is the compile-time interface satisfaction
// below, not the body.
func (fakeModuleTextService) ListByModule(ctx context.Context, q ListModuleTextByModuleQuery) ([]*ModuleTextResponse, error) {
	return nil, nil
}

// CountByModule pins the auto-emitted ref-count method on the inbound
// port (#2202). Returns 0/nil — the load-bearing contract is the compile-time
// interface satisfaction below, not the body.
func (fakeModuleTextService) CountByModule(ctx context.Context, q ListModuleTextByModuleQuery) (int, error) {
	return 0, nil
}

// ListByModuleSince pins the auto-emitted keyset-paginated sibling of
// ListByModule on the inbound port (#4237). Returns nil/nil — the
// load-bearing contract is the compile-time interface satisfaction below,
// not the body.
func (fakeModuleTextService) ListByModuleSince(ctx context.Context, refID string, afterCreatedAt time.Time, afterID string, limit int) ([]*ModuleTextResponse, error) {
	return nil, nil
}

// Options pins the auto-emitted `[{id, label}]` projection method on
// the inbound port (#403 sub-5 / #421). Driven by the spec's
// `display_field:` declaration. The fake returns nil/nil; interface
// satisfaction is the load-bearing contract here, not behavior.
func (fakeModuleTextService) Options(ctx context.Context, q ModuleTextOptionsQuery) ([]ModuleTextOption, error) {
	return nil, nil
}

func (fakeModuleTextService) Update(ctx context.Context, cmd UpdateModuleTextCommand) (*ModuleTextResponse, error) {
	return nil, nil
}

func (fakeModuleTextService) Delete(ctx context.Context, cmd DeleteModuleTextCommand) error {
	return nil
}

// Compile-time assertion: fakeModuleTextService must satisfy
// ModuleTextService. Adding/removing methods on the port without
// updating the fake breaks this line at compile time.
var _ ModuleTextService = (*fakeModuleTextService)(nil)

// TestFakeModuleTextServiceSatisfiesPort is a runtime guard for the
// compile-time assertion above: if the package ever stops importing
// the fake (e.g. via dead-code elimination of the var), `go test` still
// links the file and the interface satisfaction is exercised.
func TestFakeModuleTextServiceSatisfiesPort(t *testing.T) {
	port := reflect.TypeOf((*ModuleTextService)(nil)).Elem()
	if got, want := reflect.TypeOf(fakeModuleTextService{}).NumMethod(), port.NumMethod(); got != want {
		t.Errorf("fakeModuleTextService implements %d methods, port declares %d: the fake no longer mirrors the port", got, want)
	}
}
