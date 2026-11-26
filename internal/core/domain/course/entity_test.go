package course

import (
	"errors"
	"testing"
	"time"
)

// TestNewCourse_ValidInputs pins the happy-path constructor:
//
//   - Returns a non-nil entity and a nil error when every invariant
//     is satisfied.
//   - createdAt / updatedAt are set to the wall-clock time at
//     construction (never zero, always within a tight bracket of now).
//
// Per-field validation rejection paths are covered separately below;
// this test owns "the constructor accepts what the spec says is valid".
func TestNewCourse_ValidInputs(t *testing.T) {
	before := time.Now()
	e, err := NewCourse("x", "x", "x", "x", "x", "x", "beginner", int(1))
	after := time.Now()

	if err != nil {
		t.Fatalf("NewCourse with valid inputs returned error: %v", err)
	}
	if e == nil {
		t.Fatal("NewCourse returned nil entity with nil error")
		return
	}
	if got := e.CreatedAt(); got.IsZero() || got.Before(before) || got.After(after) {
		t.Errorf("CreatedAt() = %v, want within [%v, %v]", got, before, after)
	}
	if got := e.UpdatedAt(); got.IsZero() || got.Before(before) || got.After(after) {
		t.Errorf("UpdatedAt() = %v, want within [%v, %v]", got, before, after)
	}
}

// TestLoadCourse_BypassesValidation pins the friend-constructor
// contract: outbound adapters reconstruct an entity from at-rest state
// (row / doc / proto) WITHOUT re-running validation. A spec change
// that tightens an invariant must not retro-actively reject every
// already-stored record. LoadCourse therefore takes the same
// inputs as New but skips the checks and accepts caller-provided
// createdAt / updatedAt.
func TestLoadCourse_BypassesValidation(t *testing.T) {
	created := time.Date(2024, 1, 2, 3, 4, 5, 0, time.UTC)
	updated := time.Date(2024, 6, 7, 8, 9, 10, 0, time.UTC)
	e := LoadCourse("x", "x", "x", "x", "x", "x", "beginner", int(1), created, updated)
	if e == nil {
		t.Fatal("LoadCourse returned nil entity")
		return
	}
	if !e.CreatedAt().Equal(created) {
		t.Errorf("LoadCourse CreatedAt = %v, want %v", e.CreatedAt(), created)
	}
	if !e.UpdatedAt().Equal(updated) {
		t.Errorf("LoadCourse UpdatedAt = %v, want %v", e.UpdatedAt(), updated)
	}
}

// TestNewCourse_Rejects_ID_Zero pins the
// :required check for id: passing the zero value of
// string must produce ErrInvalidCourseID.
func TestNewCourse_Rejects_ID_Zero(t *testing.T) {
	_, err := NewCourse("", "x", "x", "x", "x", "x", "beginner", int(1))
	if err == nil {
		t.Fatal("expected ErrInvalidCourseID, got nil")
	}
	// #3418: assert the SPECIFIC sentinel, not just err != nil — a constructor
	// returning the wrong sentinel (e.g. a neighbouring field's) would otherwise
	// pass silently despite the failure message naming this field's error.
	if !errors.Is(err, ErrInvalidCourseID) {
		t.Errorf("expected ErrInvalidCourseID, got %v", err)
	}
}

// TestNewCourse_Rejects_Level_Zero pins the
// :required check for level: passing the zero value of
// string must produce ErrInvalidCourseLevel.
func TestNewCourse_Rejects_Level_Zero(t *testing.T) {
	_, err := NewCourse("x", "x", "x", "x", "x", "x", "", int(1))
	if err == nil {
		t.Fatal("expected ErrInvalidCourseLevel, got nil")
	}
	// #3418: assert the SPECIFIC sentinel, not just err != nil — a constructor
	// returning the wrong sentinel (e.g. a neighbouring field's) would otherwise
	// pass silently despite the failure message naming this field's error.
	if !errors.Is(err, ErrInvalidCourseLevel) {
		t.Errorf("expected ErrInvalidCourseLevel, got %v", err)
	}
}

// TestNewCourse_Rejects_Slug_Zero pins the
// :required check for slug: passing the zero value of
// string must produce ErrInvalidCourseSlug.
func TestNewCourse_Rejects_Slug_Zero(t *testing.T) {
	_, err := NewCourse("x", "x", "", "x", "x", "x", "beginner", int(1))
	if err == nil {
		t.Fatal("expected ErrInvalidCourseSlug, got nil")
	}
	// #3418: assert the SPECIFIC sentinel, not just err != nil — a constructor
	// returning the wrong sentinel (e.g. a neighbouring field's) would otherwise
	// pass silently despite the failure message naming this field's error.
	if !errors.Is(err, ErrInvalidCourseSlug) {
		t.Errorf("expected ErrInvalidCourseSlug, got %v", err)
	}
}

// TestNewCourse_Rejects_Summary_Zero pins the
// :required check for summary: passing the zero value of
// string must produce ErrInvalidCourseSummary.
func TestNewCourse_Rejects_Summary_Zero(t *testing.T) {
	_, err := NewCourse("x", "x", "x", "x", "", "x", "beginner", int(1))
	if err == nil {
		t.Fatal("expected ErrInvalidCourseSummary, got nil")
	}
	// #3418: assert the SPECIFIC sentinel, not just err != nil — a constructor
	// returning the wrong sentinel (e.g. a neighbouring field's) would otherwise
	// pass silently despite the failure message naming this field's error.
	if !errors.Is(err, ErrInvalidCourseSummary) {
		t.Errorf("expected ErrInvalidCourseSummary, got %v", err)
	}
}

// TestNewCourse_Rejects_Title_Zero pins the
// :required check for title: passing the zero value of
// string must produce ErrInvalidCourseTitle.
func TestNewCourse_Rejects_Title_Zero(t *testing.T) {
	_, err := NewCourse("x", "x", "x", "", "x", "x", "beginner", int(1))
	if err == nil {
		t.Fatal("expected ErrInvalidCourseTitle, got nil")
	}
	// #3418: assert the SPECIFIC sentinel, not just err != nil — a constructor
	// returning the wrong sentinel (e.g. a neighbouring field's) would otherwise
	// pass silently despite the failure message naming this field's error.
	if !errors.Is(err, ErrInvalidCourseTitle) {
		t.Errorf("expected ErrInvalidCourseTitle, got %v", err)
	}
}

// TestNewCourse_Rejects_Topic_Zero pins the
// :required check for topic: passing the zero value of
// string must produce ErrInvalidCourseTopic.
func TestNewCourse_Rejects_Topic_Zero(t *testing.T) {
	_, err := NewCourse("x", "x", "x", "x", "x", "", "beginner", int(1))
	if err == nil {
		t.Fatal("expected ErrInvalidCourseTopic, got nil")
	}
	// #3418: assert the SPECIFIC sentinel, not just err != nil — a constructor
	// returning the wrong sentinel (e.g. a neighbouring field's) would otherwise
	// pass silently despite the failure message naming this field's error.
	if !errors.Is(err, ErrInvalidCourseTopic) {
		t.Errorf("expected ErrInvalidCourseTopic, got %v", err)
	}
}
