package lessontext

import (
	"errors"
	"testing"
	"time"
)

// TestNewLessonText_ValidInputs pins the happy-path constructor:
//
//   - Returns a non-nil entity and a nil error when every invariant
//     is satisfied.
//   - createdAt / updatedAt are set to the wall-clock time at
//     construction (never zero, always within a tight bracket of now).
//
// Per-field validation rejection paths are covered separately below;
// this test owns "the constructor accepts what the spec says is valid".
func TestNewLessonText_ValidInputs(t *testing.T) {
	before := time.Now()
	e, err := NewLessonText("x", "x", "x", "x", "x")
	after := time.Now()

	if err != nil {
		t.Fatalf("NewLessonText with valid inputs returned error: %v", err)
	}
	if e == nil {
		t.Fatal("NewLessonText returned nil entity with nil error")
		return
	}
	if got := e.CreatedAt(); got.IsZero() || got.Before(before) || got.After(after) {
		t.Errorf("CreatedAt() = %v, want within [%v, %v]", got, before, after)
	}
	if got := e.UpdatedAt(); got.IsZero() || got.Before(before) || got.After(after) {
		t.Errorf("UpdatedAt() = %v, want within [%v, %v]", got, before, after)
	}
}

// TestLoadLessonText_BypassesValidation pins the friend-constructor
// contract: outbound adapters reconstruct an entity from at-rest state
// (row / doc / proto) WITHOUT re-running validation. A spec change
// that tightens an invariant must not retro-actively reject every
// already-stored record. LoadLessonText therefore takes the same
// inputs as New but skips the checks and accepts caller-provided
// createdAt / updatedAt.
func TestLoadLessonText_BypassesValidation(t *testing.T) {
	created := time.Date(2024, 1, 2, 3, 4, 5, 0, time.UTC)
	updated := time.Date(2024, 6, 7, 8, 9, 10, 0, time.UTC)
	e := LoadLessonText("x", "x", "x", "x", "x", created, updated)
	if e == nil {
		t.Fatal("LoadLessonText returned nil entity")
		return
	}
	if !e.CreatedAt().Equal(created) {
		t.Errorf("LoadLessonText CreatedAt = %v, want %v", e.CreatedAt(), created)
	}
	if !e.UpdatedAt().Equal(updated) {
		t.Errorf("LoadLessonText UpdatedAt = %v, want %v", e.UpdatedAt(), updated)
	}
}

// TestNewLessonText_Rejects_ID_Zero pins the
// :required check for id: passing the zero value of
// string must produce ErrInvalidLessonTextID.
func TestNewLessonText_Rejects_ID_Zero(t *testing.T) {
	_, err := NewLessonText("", "x", "x", "x", "x")
	if err == nil {
		t.Fatal("expected ErrInvalidLessonTextID, got nil")
	}
	// #3418: assert the SPECIFIC sentinel, not just err != nil — a constructor
	// returning the wrong sentinel (e.g. a neighbouring field's) would otherwise
	// pass silently despite the failure message naming this field's error.
	if !errors.Is(err, ErrInvalidLessonTextID) {
		t.Errorf("expected ErrInvalidLessonTextID, got %v", err)
	}
}

// TestNewLessonText_Rejects_LessonID_Zero pins the
// :required check for lesson_id: passing the zero value of
// string must produce ErrInvalidLessonTextLessonID.
func TestNewLessonText_Rejects_LessonID_Zero(t *testing.T) {
	_, err := NewLessonText("x", "", "x", "x", "x")
	if err == nil {
		t.Fatal("expected ErrInvalidLessonTextLessonID, got nil")
	}
	// #3418: assert the SPECIFIC sentinel, not just err != nil — a constructor
	// returning the wrong sentinel (e.g. a neighbouring field's) would otherwise
	// pass silently despite the failure message naming this field's error.
	if !errors.Is(err, ErrInvalidLessonTextLessonID) {
		t.Errorf("expected ErrInvalidLessonTextLessonID, got %v", err)
	}
}

// TestNewLessonText_Rejects_Locale_Zero pins the
// :required check for locale: passing the zero value of
// string must produce ErrInvalidLessonTextLocale.
func TestNewLessonText_Rejects_Locale_Zero(t *testing.T) {
	_, err := NewLessonText("x", "x", "", "x", "x")
	if err == nil {
		t.Fatal("expected ErrInvalidLessonTextLocale, got nil")
	}
	// #3418: assert the SPECIFIC sentinel, not just err != nil — a constructor
	// returning the wrong sentinel (e.g. a neighbouring field's) would otherwise
	// pass silently despite the failure message naming this field's error.
	if !errors.Is(err, ErrInvalidLessonTextLocale) {
		t.Errorf("expected ErrInvalidLessonTextLocale, got %v", err)
	}
}

// TestNewLessonText_Rejects_Title_Zero pins the
// :required check for title: passing the zero value of
// string must produce ErrInvalidLessonTextTitle.
func TestNewLessonText_Rejects_Title_Zero(t *testing.T) {
	_, err := NewLessonText("x", "x", "x", "", "x")
	if err == nil {
		t.Fatal("expected ErrInvalidLessonTextTitle, got nil")
	}
	// #3418: assert the SPECIFIC sentinel, not just err != nil — a constructor
	// returning the wrong sentinel (e.g. a neighbouring field's) would otherwise
	// pass silently despite the failure message naming this field's error.
	if !errors.Is(err, ErrInvalidLessonTextTitle) {
		t.Errorf("expected ErrInvalidLessonTextTitle, got %v", err)
	}
}
