package lesson

import (
	"errors"
	"testing"
	"time"
)

// TestNewLesson_ValidInputs pins the happy-path constructor:
//
//   - Returns a non-nil entity and a nil error when every invariant
//     is satisfied.
//   - createdAt / updatedAt are set to the wall-clock time at
//     construction (never zero, always within a tight bracket of now).
//
// Per-field validation rejection paths are covered separately below;
// this test owns "the constructor accepts what the spec says is valid".
func TestNewLesson_ValidInputs(t *testing.T) {
	before := time.Now()
	e, err := NewLesson("x", "x", "x", "x", "x", int(1), int(1), "reading", "x", "x")
	after := time.Now()

	if err != nil {
		t.Fatalf("NewLesson with valid inputs returned error: %v", err)
	}
	if e == nil {
		t.Fatal("NewLesson returned nil entity with nil error")
		return
	}
	if got := e.CreatedAt(); got.IsZero() || got.Before(before) || got.After(after) {
		t.Errorf("CreatedAt() = %v, want within [%v, %v]", got, before, after)
	}
	if got := e.UpdatedAt(); got.IsZero() || got.Before(before) || got.After(after) {
		t.Errorf("UpdatedAt() = %v, want within [%v, %v]", got, before, after)
	}
}

// TestLoadLesson_BypassesValidation pins the friend-constructor
// contract: outbound adapters reconstruct an entity from at-rest state
// (row / doc / proto) WITHOUT re-running validation. A spec change
// that tightens an invariant must not retro-actively reject every
// already-stored record. LoadLesson therefore takes the same
// inputs as New but skips the checks and accepts caller-provided
// createdAt / updatedAt.
func TestLoadLesson_BypassesValidation(t *testing.T) {
	created := time.Date(2024, 1, 2, 3, 4, 5, 0, time.UTC)
	updated := time.Date(2024, 6, 7, 8, 9, 10, 0, time.UTC)
	e := LoadLesson("x", "x", "x", "x", "x", int(1), int(1), "reading", "x", "x", created, updated)
	if e == nil {
		t.Fatal("LoadLesson returned nil entity")
		return
	}
	if !e.CreatedAt().Equal(created) {
		t.Errorf("LoadLesson CreatedAt = %v, want %v", e.CreatedAt(), created)
	}
	if !e.UpdatedAt().Equal(updated) {
		t.Errorf("LoadLesson UpdatedAt = %v, want %v", e.UpdatedAt(), updated)
	}
}

// TestNewLesson_Rejects_ID_Zero pins the
// :required check for id: passing the zero value of
// string must produce ErrInvalidLessonID.
func TestNewLesson_Rejects_ID_Zero(t *testing.T) {
	_, err := NewLesson("", "x", "x", "x", "x", int(1), int(1), "reading", "x", "x")
	if err == nil {
		t.Fatal("expected ErrInvalidLessonID, got nil")
	}
	// #3418: assert the SPECIFIC sentinel, not just err != nil — a constructor
	// returning the wrong sentinel (e.g. a neighbouring field's) would otherwise
	// pass silently despite the failure message naming this field's error.
	if !errors.Is(err, ErrInvalidLessonID) {
		t.Errorf("expected ErrInvalidLessonID, got %v", err)
	}
}

// TestNewLesson_Rejects_CourseID_Zero pins the
// :required check for course_id: passing the zero value of
// string must produce ErrInvalidLessonCourseID.
func TestNewLesson_Rejects_CourseID_Zero(t *testing.T) {
	_, err := NewLesson("x", "", "x", "x", "x", int(1), int(1), "reading", "x", "x")
	if err == nil {
		t.Fatal("expected ErrInvalidLessonCourseID, got nil")
	}
	// #3418: assert the SPECIFIC sentinel, not just err != nil — a constructor
	// returning the wrong sentinel (e.g. a neighbouring field's) would otherwise
	// pass silently despite the failure message naming this field's error.
	if !errors.Is(err, ErrInvalidLessonCourseID) {
		t.Errorf("expected ErrInvalidLessonCourseID, got %v", err)
	}
}

// TestNewLesson_Rejects_Kind_Zero pins the
// :required check for kind: passing the zero value of
// string must produce ErrInvalidLessonKind.
func TestNewLesson_Rejects_Kind_Zero(t *testing.T) {
	_, err := NewLesson("x", "x", "x", "x", "x", int(1), int(1), "", "x", "x")
	if err == nil {
		t.Fatal("expected ErrInvalidLessonKind, got nil")
	}
	// #3418: assert the SPECIFIC sentinel, not just err != nil — a constructor
	// returning the wrong sentinel (e.g. a neighbouring field's) would otherwise
	// pass silently despite the failure message naming this field's error.
	if !errors.Is(err, ErrInvalidLessonKind) {
		t.Errorf("expected ErrInvalidLessonKind, got %v", err)
	}
}

// TestNewLesson_Rejects_Slug_Zero pins the
// :required check for slug: passing the zero value of
// string must produce ErrInvalidLessonSlug.
func TestNewLesson_Rejects_Slug_Zero(t *testing.T) {
	_, err := NewLesson("x", "x", "x", "", "x", int(1), int(1), "reading", "x", "x")
	if err == nil {
		t.Fatal("expected ErrInvalidLessonSlug, got nil")
	}
	// #3418: assert the SPECIFIC sentinel, not just err != nil — a constructor
	// returning the wrong sentinel (e.g. a neighbouring field's) would otherwise
	// pass silently despite the failure message naming this field's error.
	if !errors.Is(err, ErrInvalidLessonSlug) {
		t.Errorf("expected ErrInvalidLessonSlug, got %v", err)
	}
}

// TestNewLesson_Rejects_Title_Zero pins the
// :required check for title: passing the zero value of
// string must produce ErrInvalidLessonTitle.
func TestNewLesson_Rejects_Title_Zero(t *testing.T) {
	_, err := NewLesson("x", "x", "x", "x", "", int(1), int(1), "reading", "x", "x")
	if err == nil {
		t.Fatal("expected ErrInvalidLessonTitle, got nil")
	}
	// #3418: assert the SPECIFIC sentinel, not just err != nil — a constructor
	// returning the wrong sentinel (e.g. a neighbouring field's) would otherwise
	// pass silently despite the failure message naming this field's error.
	if !errors.Is(err, ErrInvalidLessonTitle) {
		t.Errorf("expected ErrInvalidLessonTitle, got %v", err)
	}
}
