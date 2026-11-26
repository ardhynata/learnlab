package module

import (
	"errors"
	"testing"
	"time"
)

// TestNewModule_ValidInputs pins the happy-path constructor:
//
//   - Returns a non-nil entity and a nil error when every invariant
//     is satisfied.
//   - createdAt / updatedAt are set to the wall-clock time at
//     construction (never zero, always within a tight bracket of now).
//
// Per-field validation rejection paths are covered separately below;
// this test owns "the constructor accepts what the spec says is valid".
func TestNewModule_ValidInputs(t *testing.T) {
	before := time.Now()
	e, err := NewModule("x", "x", "x", "x", "x", int(1))
	after := time.Now()

	if err != nil {
		t.Fatalf("NewModule with valid inputs returned error: %v", err)
	}
	if e == nil {
		t.Fatal("NewModule returned nil entity with nil error")
		return
	}
	if got := e.CreatedAt(); got.IsZero() || got.Before(before) || got.After(after) {
		t.Errorf("CreatedAt() = %v, want within [%v, %v]", got, before, after)
	}
	if got := e.UpdatedAt(); got.IsZero() || got.Before(before) || got.After(after) {
		t.Errorf("UpdatedAt() = %v, want within [%v, %v]", got, before, after)
	}
}

// TestLoadModule_BypassesValidation pins the friend-constructor
// contract: outbound adapters reconstruct an entity from at-rest state
// (row / doc / proto) WITHOUT re-running validation. A spec change
// that tightens an invariant must not retro-actively reject every
// already-stored record. LoadModule therefore takes the same
// inputs as New but skips the checks and accepts caller-provided
// createdAt / updatedAt.
func TestLoadModule_BypassesValidation(t *testing.T) {
	created := time.Date(2024, 1, 2, 3, 4, 5, 0, time.UTC)
	updated := time.Date(2024, 6, 7, 8, 9, 10, 0, time.UTC)
	e := LoadModule("x", "x", "x", "x", "x", int(1), created, updated)
	if e == nil {
		t.Fatal("LoadModule returned nil entity")
		return
	}
	if !e.CreatedAt().Equal(created) {
		t.Errorf("LoadModule CreatedAt = %v, want %v", e.CreatedAt(), created)
	}
	if !e.UpdatedAt().Equal(updated) {
		t.Errorf("LoadModule UpdatedAt = %v, want %v", e.UpdatedAt(), updated)
	}
}

// TestNewModule_Rejects_ID_Zero pins the
// :required check for id: passing the zero value of
// string must produce ErrInvalidModuleID.
func TestNewModule_Rejects_ID_Zero(t *testing.T) {
	_, err := NewModule("", "x", "x", "x", "x", int(1))
	if err == nil {
		t.Fatal("expected ErrInvalidModuleID, got nil")
	}
	// #3418: assert the SPECIFIC sentinel, not just err != nil — a constructor
	// returning the wrong sentinel (e.g. a neighbouring field's) would otherwise
	// pass silently despite the failure message naming this field's error.
	if !errors.Is(err, ErrInvalidModuleID) {
		t.Errorf("expected ErrInvalidModuleID, got %v", err)
	}
}

// TestNewModule_Rejects_CourseID_Zero pins the
// :required check for course_id: passing the zero value of
// string must produce ErrInvalidModuleCourseID.
func TestNewModule_Rejects_CourseID_Zero(t *testing.T) {
	_, err := NewModule("x", "", "x", "x", "x", int(1))
	if err == nil {
		t.Fatal("expected ErrInvalidModuleCourseID, got nil")
	}
	// #3418: assert the SPECIFIC sentinel, not just err != nil — a constructor
	// returning the wrong sentinel (e.g. a neighbouring field's) would otherwise
	// pass silently despite the failure message naming this field's error.
	if !errors.Is(err, ErrInvalidModuleCourseID) {
		t.Errorf("expected ErrInvalidModuleCourseID, got %v", err)
	}
}

// TestNewModule_Rejects_Slug_Zero pins the
// :required check for slug: passing the zero value of
// string must produce ErrInvalidModuleSlug.
func TestNewModule_Rejects_Slug_Zero(t *testing.T) {
	_, err := NewModule("x", "x", "", "x", "x", int(1))
	if err == nil {
		t.Fatal("expected ErrInvalidModuleSlug, got nil")
	}
	// #3418: assert the SPECIFIC sentinel, not just err != nil — a constructor
	// returning the wrong sentinel (e.g. a neighbouring field's) would otherwise
	// pass silently despite the failure message naming this field's error.
	if !errors.Is(err, ErrInvalidModuleSlug) {
		t.Errorf("expected ErrInvalidModuleSlug, got %v", err)
	}
}

// TestNewModule_Rejects_Title_Zero pins the
// :required check for title: passing the zero value of
// string must produce ErrInvalidModuleTitle.
func TestNewModule_Rejects_Title_Zero(t *testing.T) {
	_, err := NewModule("x", "x", "x", "", "x", int(1))
	if err == nil {
		t.Fatal("expected ErrInvalidModuleTitle, got nil")
	}
	// #3418: assert the SPECIFIC sentinel, not just err != nil — a constructor
	// returning the wrong sentinel (e.g. a neighbouring field's) would otherwise
	// pass silently despite the failure message naming this field's error.
	if !errors.Is(err, ErrInvalidModuleTitle) {
		t.Errorf("expected ErrInvalidModuleTitle, got %v", err)
	}
}
