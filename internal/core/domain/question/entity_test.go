package question

import (
	"errors"
	"testing"
	"time"
)

// TestNewQuestion_ValidInputs pins the happy-path constructor:
//
//   - Returns a non-nil entity and a nil error when every invariant
//     is satisfied.
//   - createdAt / updatedAt are set to the wall-clock time at
//     construction (never zero, always within a tight bracket of now).
//
// Per-field validation rejection paths are covered separately below;
// this test owns "the constructor accepts what the spec says is valid".
func TestNewQuestion_ValidInputs(t *testing.T) {
	before := time.Now()
	e, err := NewQuestion("x", "x", int(1), "x", *new([]string), int(1), "x")
	after := time.Now()

	if err != nil {
		t.Fatalf("NewQuestion with valid inputs returned error: %v", err)
	}
	if e == nil {
		t.Fatal("NewQuestion returned nil entity with nil error")
		return
	}
	if got := e.CreatedAt(); got.IsZero() || got.Before(before) || got.After(after) {
		t.Errorf("CreatedAt() = %v, want within [%v, %v]", got, before, after)
	}
	if got := e.UpdatedAt(); got.IsZero() || got.Before(before) || got.After(after) {
		t.Errorf("UpdatedAt() = %v, want within [%v, %v]", got, before, after)
	}
}

// TestLoadQuestion_BypassesValidation pins the friend-constructor
// contract: outbound adapters reconstruct an entity from at-rest state
// (row / doc / proto) WITHOUT re-running validation. A spec change
// that tightens an invariant must not retro-actively reject every
// already-stored record. LoadQuestion therefore takes the same
// inputs as New but skips the checks and accepts caller-provided
// createdAt / updatedAt.
func TestLoadQuestion_BypassesValidation(t *testing.T) {
	created := time.Date(2024, 1, 2, 3, 4, 5, 0, time.UTC)
	updated := time.Date(2024, 6, 7, 8, 9, 10, 0, time.UTC)
	e := LoadQuestion("x", "x", int(1), "x", *new([]string), int(1), "x", created, updated)
	if e == nil {
		t.Fatal("LoadQuestion returned nil entity")
		return
	}
	if !e.CreatedAt().Equal(created) {
		t.Errorf("LoadQuestion CreatedAt = %v, want %v", e.CreatedAt(), created)
	}
	if !e.UpdatedAt().Equal(updated) {
		t.Errorf("LoadQuestion UpdatedAt = %v, want %v", e.UpdatedAt(), updated)
	}
}

// TestNewQuestion_Rejects_ID_Zero pins the
// :required check for id: passing the zero value of
// string must produce ErrInvalidQuestionID.
func TestNewQuestion_Rejects_ID_Zero(t *testing.T) {
	_, err := NewQuestion("", "x", int(1), "x", *new([]string), int(1), "x")
	if err == nil {
		t.Fatal("expected ErrInvalidQuestionID, got nil")
	}
	// #3418: assert the SPECIFIC sentinel, not just err != nil — a constructor
	// returning the wrong sentinel (e.g. a neighbouring field's) would otherwise
	// pass silently despite the failure message naming this field's error.
	if !errors.Is(err, ErrInvalidQuestionID) {
		t.Errorf("expected ErrInvalidQuestionID, got %v", err)
	}
}

// TestNewQuestion_Rejects_LessonID_Zero pins the
// :required check for lesson_id: passing the zero value of
// string must produce ErrInvalidQuestionLessonID.
func TestNewQuestion_Rejects_LessonID_Zero(t *testing.T) {
	_, err := NewQuestion("x", "", int(1), "x", *new([]string), int(1), "x")
	if err == nil {
		t.Fatal("expected ErrInvalidQuestionLessonID, got nil")
	}
	// #3418: assert the SPECIFIC sentinel, not just err != nil — a constructor
	// returning the wrong sentinel (e.g. a neighbouring field's) would otherwise
	// pass silently despite the failure message naming this field's error.
	if !errors.Is(err, ErrInvalidQuestionLessonID) {
		t.Errorf("expected ErrInvalidQuestionLessonID, got %v", err)
	}
}

// TestNewQuestion_Rejects_Prompt_Zero pins the
// :required check for prompt: passing the zero value of
// string must produce ErrInvalidQuestionPrompt.
func TestNewQuestion_Rejects_Prompt_Zero(t *testing.T) {
	_, err := NewQuestion("x", "x", int(1), "", *new([]string), int(1), "x")
	if err == nil {
		t.Fatal("expected ErrInvalidQuestionPrompt, got nil")
	}
	// #3418: assert the SPECIFIC sentinel, not just err != nil — a constructor
	// returning the wrong sentinel (e.g. a neighbouring field's) would otherwise
	// pass silently despite the failure message naming this field's error.
	if !errors.Is(err, ErrInvalidQuestionPrompt) {
		t.Errorf("expected ErrInvalidQuestionPrompt, got %v", err)
	}
}
