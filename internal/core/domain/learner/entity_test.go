package learner

import (
	"errors"
	"testing"
	"time"
)

// TestNewLearner_ValidInputs pins the happy-path constructor:
//
//   - Returns a non-nil entity and a nil error when every invariant
//     is satisfied.
//   - createdAt / updatedAt are set to the wall-clock time at
//     construction (never zero, always within a tight bracket of now).
//
// Per-field validation rejection paths are covered separately below;
// this test owns "the constructor accepts what the spec says is valid".
func TestNewLearner_ValidInputs(t *testing.T) {
	before := time.Now()
	e, err := NewLearner("x", "x")
	after := time.Now()

	if err != nil {
		t.Fatalf("NewLearner with valid inputs returned error: %v", err)
	}
	if e == nil {
		t.Fatal("NewLearner returned nil entity with nil error")
		return
	}
	if got := e.CreatedAt(); got.IsZero() || got.Before(before) || got.After(after) {
		t.Errorf("CreatedAt() = %v, want within [%v, %v]", got, before, after)
	}
	if got := e.UpdatedAt(); got.IsZero() || got.Before(before) || got.After(after) {
		t.Errorf("UpdatedAt() = %v, want within [%v, %v]", got, before, after)
	}
}

// TestLoadLearner_BypassesValidation pins the friend-constructor
// contract: outbound adapters reconstruct an entity from at-rest state
// (row / doc / proto) WITHOUT re-running validation. A spec change
// that tightens an invariant must not retro-actively reject every
// already-stored record. LoadLearner therefore takes the same
// inputs as New but skips the checks and accepts caller-provided
// createdAt / updatedAt.
func TestLoadLearner_BypassesValidation(t *testing.T) {
	created := time.Date(2024, 1, 2, 3, 4, 5, 0, time.UTC)
	updated := time.Date(2024, 6, 7, 8, 9, 10, 0, time.UTC)
	e := LoadLearner("x", "x", created, updated)
	if e == nil {
		t.Fatal("LoadLearner returned nil entity")
		return
	}
	if !e.CreatedAt().Equal(created) {
		t.Errorf("LoadLearner CreatedAt = %v, want %v", e.CreatedAt(), created)
	}
	if !e.UpdatedAt().Equal(updated) {
		t.Errorf("LoadLearner UpdatedAt = %v, want %v", e.UpdatedAt(), updated)
	}
}

// TestNewLearner_Rejects_ID_Zero pins the
// :required check for id: passing the zero value of
// string must produce ErrInvalidLearnerID.
func TestNewLearner_Rejects_ID_Zero(t *testing.T) {
	_, err := NewLearner("", "x")
	if err == nil {
		t.Fatal("expected ErrInvalidLearnerID, got nil")
	}
	// #3418: assert the SPECIFIC sentinel, not just err != nil — a constructor
	// returning the wrong sentinel (e.g. a neighbouring field's) would otherwise
	// pass silently despite the failure message naming this field's error.
	if !errors.Is(err, ErrInvalidLearnerID) {
		t.Errorf("expected ErrInvalidLearnerID, got %v", err)
	}
}
