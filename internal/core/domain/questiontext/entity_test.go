package questiontext

import (
	"errors"
	"testing"
	"time"
)

// TestNewQuestionText_ValidInputs pins the happy-path constructor:
//
//   - Returns a non-nil entity and a nil error when every invariant
//     is satisfied.
//   - createdAt / updatedAt are set to the wall-clock time at
//     construction (never zero, always within a tight bracket of now).
//
// Per-field validation rejection paths are covered separately below;
// this test owns "the constructor accepts what the spec says is valid".
func TestNewQuestionText_ValidInputs(t *testing.T) {
	before := time.Now()
	e, err := NewQuestionText("x", "x", int(1), "x", "x", *new([]string), "x")
	after := time.Now()

	if err != nil {
		t.Fatalf("NewQuestionText with valid inputs returned error: %v", err)
	}
	if e == nil {
		t.Fatal("NewQuestionText returned nil entity with nil error")
		return
	}
	if got := e.CreatedAt(); got.IsZero() || got.Before(before) || got.After(after) {
		t.Errorf("CreatedAt() = %v, want within [%v, %v]", got, before, after)
	}
	if got := e.UpdatedAt(); got.IsZero() || got.Before(before) || got.After(after) {
		t.Errorf("UpdatedAt() = %v, want within [%v, %v]", got, before, after)
	}
}

// TestLoadQuestionText_BypassesValidation pins the friend-constructor
// contract: outbound adapters reconstruct an entity from at-rest state
// (row / doc / proto) WITHOUT re-running validation. A spec change
// that tightens an invariant must not retro-actively reject every
// already-stored record. LoadQuestionText therefore takes the same
// inputs as New but skips the checks and accepts caller-provided
// createdAt / updatedAt.
func TestLoadQuestionText_BypassesValidation(t *testing.T) {
	created := time.Date(2024, 1, 2, 3, 4, 5, 0, time.UTC)
	updated := time.Date(2024, 6, 7, 8, 9, 10, 0, time.UTC)
	e := LoadQuestionText("x", "x", int(1), "x", "x", *new([]string), "x", created, updated)
	if e == nil {
		t.Fatal("LoadQuestionText returned nil entity")
		return
	}
	if !e.CreatedAt().Equal(created) {
		t.Errorf("LoadQuestionText CreatedAt = %v, want %v", e.CreatedAt(), created)
	}
	if !e.UpdatedAt().Equal(updated) {
		t.Errorf("LoadQuestionText UpdatedAt = %v, want %v", e.UpdatedAt(), updated)
	}
}

// TestNewQuestionText_Rejects_ID_Zero pins the
// :required check for id: passing the zero value of
// string must produce ErrInvalidQuestionTextID.
func TestNewQuestionText_Rejects_ID_Zero(t *testing.T) {
	_, err := NewQuestionText("", "x", int(1), "x", "x", *new([]string), "x")
	if err == nil {
		t.Fatal("expected ErrInvalidQuestionTextID, got nil")
	}
	// #3418: assert the SPECIFIC sentinel, not just err != nil — a constructor
	// returning the wrong sentinel (e.g. a neighbouring field's) would otherwise
	// pass silently despite the failure message naming this field's error.
	if !errors.Is(err, ErrInvalidQuestionTextID) {
		t.Errorf("expected ErrInvalidQuestionTextID, got %v", err)
	}
}

// TestNewQuestionText_Rejects_LessonID_Zero pins the
// :required check for lesson_id: passing the zero value of
// string must produce ErrInvalidQuestionTextLessonID.
func TestNewQuestionText_Rejects_LessonID_Zero(t *testing.T) {
	_, err := NewQuestionText("x", "", int(1), "x", "x", *new([]string), "x")
	if err == nil {
		t.Fatal("expected ErrInvalidQuestionTextLessonID, got nil")
	}
	// #3418: assert the SPECIFIC sentinel, not just err != nil — a constructor
	// returning the wrong sentinel (e.g. a neighbouring field's) would otherwise
	// pass silently despite the failure message naming this field's error.
	if !errors.Is(err, ErrInvalidQuestionTextLessonID) {
		t.Errorf("expected ErrInvalidQuestionTextLessonID, got %v", err)
	}
}

// TestNewQuestionText_Rejects_Locale_Zero pins the
// :required check for locale: passing the zero value of
// string must produce ErrInvalidQuestionTextLocale.
func TestNewQuestionText_Rejects_Locale_Zero(t *testing.T) {
	_, err := NewQuestionText("x", "x", int(1), "", "x", *new([]string), "x")
	if err == nil {
		t.Fatal("expected ErrInvalidQuestionTextLocale, got nil")
	}
	// #3418: assert the SPECIFIC sentinel, not just err != nil — a constructor
	// returning the wrong sentinel (e.g. a neighbouring field's) would otherwise
	// pass silently despite the failure message naming this field's error.
	if !errors.Is(err, ErrInvalidQuestionTextLocale) {
		t.Errorf("expected ErrInvalidQuestionTextLocale, got %v", err)
	}
}

// TestNewQuestionText_Rejects_Prompt_Zero pins the
// :required check for prompt: passing the zero value of
// string must produce ErrInvalidQuestionTextPrompt.
func TestNewQuestionText_Rejects_Prompt_Zero(t *testing.T) {
	_, err := NewQuestionText("x", "x", int(1), "x", "", *new([]string), "x")
	if err == nil {
		t.Fatal("expected ErrInvalidQuestionTextPrompt, got nil")
	}
	// #3418: assert the SPECIFIC sentinel, not just err != nil — a constructor
	// returning the wrong sentinel (e.g. a neighbouring field's) would otherwise
	// pass silently despite the failure message naming this field's error.
	if !errors.Is(err, ErrInvalidQuestionTextPrompt) {
		t.Errorf("expected ErrInvalidQuestionTextPrompt, got %v", err)
	}
}
