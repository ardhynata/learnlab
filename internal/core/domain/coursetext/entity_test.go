package coursetext

import (
	"errors"
	"testing"
	"time"
)

// TestNewCourseText_ValidInputs pins the happy-path constructor:
//
//   - Returns a non-nil entity and a nil error when every invariant
//     is satisfied.
//   - createdAt / updatedAt are set to the wall-clock time at
//     construction (never zero, always within a tight bracket of now).
//
// Per-field validation rejection paths are covered separately below;
// this test owns "the constructor accepts what the spec says is valid".
func TestNewCourseText_ValidInputs(t *testing.T) {
	before := time.Now()
	e, err := NewCourseText("x", "x", "x", "x", "x")
	after := time.Now()

	if err != nil {
		t.Fatalf("NewCourseText with valid inputs returned error: %v", err)
	}
	if e == nil {
		t.Fatal("NewCourseText returned nil entity with nil error")
		return
	}
	if got := e.CreatedAt(); got.IsZero() || got.Before(before) || got.After(after) {
		t.Errorf("CreatedAt() = %v, want within [%v, %v]", got, before, after)
	}
	if got := e.UpdatedAt(); got.IsZero() || got.Before(before) || got.After(after) {
		t.Errorf("UpdatedAt() = %v, want within [%v, %v]", got, before, after)
	}
}

// TestLoadCourseText_BypassesValidation pins the friend-constructor
// contract: outbound adapters reconstruct an entity from at-rest state
// (row / doc / proto) WITHOUT re-running validation. A spec change
// that tightens an invariant must not retro-actively reject every
// already-stored record. LoadCourseText therefore takes the same
// inputs as New but skips the checks and accepts caller-provided
// createdAt / updatedAt.
func TestLoadCourseText_BypassesValidation(t *testing.T) {
	created := time.Date(2024, 1, 2, 3, 4, 5, 0, time.UTC)
	updated := time.Date(2024, 6, 7, 8, 9, 10, 0, time.UTC)
	e := LoadCourseText("x", "x", "x", "x", "x", created, updated)
	if e == nil {
		t.Fatal("LoadCourseText returned nil entity")
		return
	}
	if !e.CreatedAt().Equal(created) {
		t.Errorf("LoadCourseText CreatedAt = %v, want %v", e.CreatedAt(), created)
	}
	if !e.UpdatedAt().Equal(updated) {
		t.Errorf("LoadCourseText UpdatedAt = %v, want %v", e.UpdatedAt(), updated)
	}
}

// TestNewCourseText_Rejects_ID_Zero pins the
// :required check for id: passing the zero value of
// string must produce ErrInvalidCourseTextID.
func TestNewCourseText_Rejects_ID_Zero(t *testing.T) {
	_, err := NewCourseText("", "x", "x", "x", "x")
	if err == nil {
		t.Fatal("expected ErrInvalidCourseTextID, got nil")
	}
	// #3418: assert the SPECIFIC sentinel, not just err != nil — a constructor
	// returning the wrong sentinel (e.g. a neighbouring field's) would otherwise
	// pass silently despite the failure message naming this field's error.
	if !errors.Is(err, ErrInvalidCourseTextID) {
		t.Errorf("expected ErrInvalidCourseTextID, got %v", err)
	}
}

// TestNewCourseText_Rejects_CourseID_Zero pins the
// :required check for course_id: passing the zero value of
// string must produce ErrInvalidCourseTextCourseID.
func TestNewCourseText_Rejects_CourseID_Zero(t *testing.T) {
	_, err := NewCourseText("x", "", "x", "x", "x")
	if err == nil {
		t.Fatal("expected ErrInvalidCourseTextCourseID, got nil")
	}
	// #3418: assert the SPECIFIC sentinel, not just err != nil — a constructor
	// returning the wrong sentinel (e.g. a neighbouring field's) would otherwise
	// pass silently despite the failure message naming this field's error.
	if !errors.Is(err, ErrInvalidCourseTextCourseID) {
		t.Errorf("expected ErrInvalidCourseTextCourseID, got %v", err)
	}
}

// TestNewCourseText_Rejects_Locale_Zero pins the
// :required check for locale: passing the zero value of
// string must produce ErrInvalidCourseTextLocale.
func TestNewCourseText_Rejects_Locale_Zero(t *testing.T) {
	_, err := NewCourseText("x", "x", "", "x", "x")
	if err == nil {
		t.Fatal("expected ErrInvalidCourseTextLocale, got nil")
	}
	// #3418: assert the SPECIFIC sentinel, not just err != nil — a constructor
	// returning the wrong sentinel (e.g. a neighbouring field's) would otherwise
	// pass silently despite the failure message naming this field's error.
	if !errors.Is(err, ErrInvalidCourseTextLocale) {
		t.Errorf("expected ErrInvalidCourseTextLocale, got %v", err)
	}
}

// TestNewCourseText_Rejects_Title_Zero pins the
// :required check for title: passing the zero value of
// string must produce ErrInvalidCourseTextTitle.
func TestNewCourseText_Rejects_Title_Zero(t *testing.T) {
	_, err := NewCourseText("x", "x", "x", "", "x")
	if err == nil {
		t.Fatal("expected ErrInvalidCourseTextTitle, got nil")
	}
	// #3418: assert the SPECIFIC sentinel, not just err != nil — a constructor
	// returning the wrong sentinel (e.g. a neighbouring field's) would otherwise
	// pass silently despite the failure message naming this field's error.
	if !errors.Is(err, ErrInvalidCourseTextTitle) {
		t.Errorf("expected ErrInvalidCourseTextTitle, got %v", err)
	}
}
