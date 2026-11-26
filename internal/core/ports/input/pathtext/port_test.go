package pathtextport

import (
	"context"
	"reflect"
	"testing"
	"time"
)

// fakePathTextService is a hand-rolled implementation of the
// PathTextService interface. The compile-time `var _ ... = ...`
// assertion below is the load-bearing assertion: when someone adds or
// changes a method on the interface, this test fails to compile,
// breaking the build immediately rather than waiting for a downstream
// import to break. Method bodies are stubs — the contract being pinned
// is the *signature set*, not behavior.
type fakePathTextService struct{}

func (fakePathTextService) Create(ctx context.Context, cmd CreatePathTextCommand) (*PathTextResponse, error) {
	return nil, nil
}

func (fakePathTextService) GetByID(ctx context.Context, q GetPathTextByIDQuery) (*PathTextResponse, error) {
	return nil, nil
}

func (fakePathTextService) List(ctx context.Context, q ListPathTextQuery) ([]*PathTextResponse, error) {
	return nil, nil
}

// ListByPath pins the auto-emitted ref-listing method on the
// inbound port (#403 sub-3 / #421). The fake returns nil/nil — the
// load-bearing contract is the compile-time interface satisfaction
// below, not the body.
func (fakePathTextService) ListByPath(ctx context.Context, q ListPathTextByPathQuery) ([]*PathTextResponse, error) {
	return nil, nil
}

// CountByPath pins the auto-emitted ref-count method on the inbound
// port (#2202). Returns 0/nil — the load-bearing contract is the compile-time
// interface satisfaction below, not the body.
func (fakePathTextService) CountByPath(ctx context.Context, q ListPathTextByPathQuery) (int, error) {
	return 0, nil
}

// ListByPathSince pins the auto-emitted keyset-paginated sibling of
// ListByPath on the inbound port (#4237). Returns nil/nil — the
// load-bearing contract is the compile-time interface satisfaction below,
// not the body.
func (fakePathTextService) ListByPathSince(ctx context.Context, refID string, afterCreatedAt time.Time, afterID string, limit int) ([]*PathTextResponse, error) {
	return nil, nil
}

// Options pins the auto-emitted `[{id, label}]` projection method on
// the inbound port (#403 sub-5 / #421). Driven by the spec's
// `display_field:` declaration. The fake returns nil/nil; interface
// satisfaction is the load-bearing contract here, not behavior.
func (fakePathTextService) Options(ctx context.Context, q PathTextOptionsQuery) ([]PathTextOption, error) {
	return nil, nil
}

func (fakePathTextService) Update(ctx context.Context, cmd UpdatePathTextCommand) (*PathTextResponse, error) {
	return nil, nil
}

func (fakePathTextService) Delete(ctx context.Context, cmd DeletePathTextCommand) error {
	return nil
}

// Compile-time assertion: fakePathTextService must satisfy
// PathTextService. Adding/removing methods on the port without
// updating the fake breaks this line at compile time.
var _ PathTextService = (*fakePathTextService)(nil)

// TestFakePathTextServiceSatisfiesPort is a runtime guard for the
// compile-time assertion above: if the package ever stops importing
// the fake (e.g. via dead-code elimination of the var), `go test` still
// links the file and the interface satisfaction is exercised.
func TestFakePathTextServiceSatisfiesPort(t *testing.T) {
	port := reflect.TypeOf((*PathTextService)(nil)).Elem()
	if got, want := reflect.TypeOf(fakePathTextService{}).NumMethod(), port.NumMethod(); got != want {
		t.Errorf("fakePathTextService implements %d methods, port declares %d: the fake no longer mirrors the port", got, want)
	}
}
