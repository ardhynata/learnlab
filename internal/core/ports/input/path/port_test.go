package pathport

import (
	"context"
	"reflect"
	"testing"
)

// fakePathService is a hand-rolled implementation of the
// PathService interface. The compile-time `var _ ... = ...`
// assertion below is the load-bearing assertion: when someone adds or
// changes a method on the interface, this test fails to compile,
// breaking the build immediately rather than waiting for a downstream
// import to break. Method bodies are stubs — the contract being pinned
// is the *signature set*, not behavior.
type fakePathService struct{}

func (fakePathService) Create(ctx context.Context, cmd CreatePathCommand) (*PathResponse, error) {
	return nil, nil
}

func (fakePathService) GetByID(ctx context.Context, q GetPathByIDQuery) (*PathResponse, error) {
	return nil, nil
}

func (fakePathService) List(ctx context.Context, q ListPathQuery) ([]*PathResponse, error) {
	return nil, nil
}

// Options pins the auto-emitted `[{id, label}]` projection method on
// the inbound port (#403 sub-5 / #421). Driven by the spec's
// `display_field:` declaration. The fake returns nil/nil; interface
// satisfaction is the load-bearing contract here, not behavior.
func (fakePathService) Options(ctx context.Context, q PathOptionsQuery) ([]PathOption, error) {
	return nil, nil
}

func (fakePathService) Update(ctx context.Context, cmd UpdatePathCommand) (*PathResponse, error) {
	return nil, nil
}

func (fakePathService) Delete(ctx context.Context, cmd DeletePathCommand) error {
	return nil
}

// Compile-time assertion: fakePathService must satisfy
// PathService. Adding/removing methods on the port without
// updating the fake breaks this line at compile time.
var _ PathService = (*fakePathService)(nil)

// TestFakePathServiceSatisfiesPort is a runtime guard for the
// compile-time assertion above: if the package ever stops importing
// the fake (e.g. via dead-code elimination of the var), `go test` still
// links the file and the interface satisfaction is exercised.
func TestFakePathServiceSatisfiesPort(t *testing.T) {
	port := reflect.TypeOf((*PathService)(nil)).Elem()
	if got, want := reflect.TypeOf(fakePathService{}).NumMethod(), port.NumMethod(); got != want {
		t.Errorf("fakePathService implements %d methods, port declares %d: the fake no longer mirrors the port", got, want)
	}
}
