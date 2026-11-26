package learnerport

import (
	"context"
	"reflect"
	"testing"
)

// fakeLearnerService is a hand-rolled implementation of the
// LearnerService interface. The compile-time `var _ ... = ...`
// assertion below is the load-bearing assertion: when someone adds or
// changes a method on the interface, this test fails to compile,
// breaking the build immediately rather than waiting for a downstream
// import to break. Method bodies are stubs — the contract being pinned
// is the *signature set*, not behavior.
type fakeLearnerService struct{}

func (fakeLearnerService) Create(ctx context.Context, cmd CreateLearnerCommand) (*LearnerResponse, error) {
	return nil, nil
}

func (fakeLearnerService) GetByID(ctx context.Context, q GetLearnerByIDQuery) (*LearnerResponse, error) {
	return nil, nil
}

func (fakeLearnerService) List(ctx context.Context, q ListLearnerQuery) ([]*LearnerResponse, error) {
	return nil, nil
}

// Options pins the auto-emitted `[{id, label}]` projection method on
// the inbound port (#403 sub-5 / #421). Driven by the spec's
// `display_field:` declaration. The fake returns nil/nil; interface
// satisfaction is the load-bearing contract here, not behavior.
func (fakeLearnerService) Options(ctx context.Context, q LearnerOptionsQuery) ([]LearnerOption, error) {
	return nil, nil
}

func (fakeLearnerService) Update(ctx context.Context, cmd UpdateLearnerCommand) (*LearnerResponse, error) {
	return nil, nil
}

func (fakeLearnerService) Delete(ctx context.Context, cmd DeleteLearnerCommand) error {
	return nil
}

// Compile-time assertion: fakeLearnerService must satisfy
// LearnerService. Adding/removing methods on the port without
// updating the fake breaks this line at compile time.
var _ LearnerService = (*fakeLearnerService)(nil)

// TestFakeLearnerServiceSatisfiesPort is a runtime guard for the
// compile-time assertion above: if the package ever stops importing
// the fake (e.g. via dead-code elimination of the var), `go test` still
// links the file and the interface satisfaction is exercised.
func TestFakeLearnerServiceSatisfiesPort(t *testing.T) {
	port := reflect.TypeOf((*LearnerService)(nil)).Elem()
	if got, want := reflect.TypeOf(fakeLearnerService{}).NumMethod(), port.NumMethod(); got != want {
		t.Errorf("fakeLearnerService implements %d methods, port declares %d: the fake no longer mirrors the port", got, want)
	}
}
