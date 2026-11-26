package path

import (
	"errors"
	"testing"
	"time"
)

// TestNewPath_ValidInputs pins the happy-path constructor:
//
//   - Returns a non-nil entity and a nil error when every invariant
//     is satisfied.
//   - createdAt / updatedAt are set to the wall-clock time at
//     construction (never zero, always within a tight bracket of now).
//
// Per-field validation rejection paths are covered separately below;
// this test owns "the constructor accepts what the spec says is valid".
func TestNewPath_ValidInputs(t *testing.T) {
	before := time.Now()
	e, err := NewPath("x", "x", "x", "x", "beginner", int(1), *new([]string))
	after := time.Now()

	if err != nil {
		t.Fatalf("NewPath with valid inputs returned error: %v", err)
	}
	if e == nil {
		t.Fatal("NewPath returned nil entity with nil error")
		return
	}
	if got := e.CreatedAt(); got.IsZero() || got.Before(before) || got.After(after) {
		t.Errorf("CreatedAt() = %v, want within [%v, %v]", got, before, after)
	}
	if got := e.UpdatedAt(); got.IsZero() || got.Before(before) || got.After(after) {
		t.Errorf("UpdatedAt() = %v, want within [%v, %v]", got, before, after)
	}
}

// TestLoadPath_BypassesValidation pins the friend-constructor
// contract: outbound adapters reconstruct an entity from at-rest state
// (row / doc / proto) WITHOUT re-running validation. A spec change
// that tightens an invariant must not retro-actively reject every
// already-stored record. LoadPath therefore takes the same
// inputs as New but skips the checks and accepts caller-provided
// createdAt / updatedAt.
func TestLoadPath_BypassesValidation(t *testing.T) {
	created := time.Date(2024, 1, 2, 3, 4, 5, 0, time.UTC)
	updated := time.Date(2024, 6, 7, 8, 9, 10, 0, time.UTC)
	e := LoadPath("x", "x", "x", "x", "beginner", int(1), *new([]string), created, updated)
	if e == nil {
		t.Fatal("LoadPath returned nil entity")
		return
	}
	if !e.CreatedAt().Equal(created) {
		t.Errorf("LoadPath CreatedAt = %v, want %v", e.CreatedAt(), created)
	}
	if !e.UpdatedAt().Equal(updated) {
		t.Errorf("LoadPath UpdatedAt = %v, want %v", e.UpdatedAt(), updated)
	}
}

// TestNewPath_Rejects_ID_Zero pins the
// :required check for id: passing the zero value of
// string must produce ErrInvalidPathID.
func TestNewPath_Rejects_ID_Zero(t *testing.T) {
	_, err := NewPath("", "x", "x", "x", "beginner", int(1), *new([]string))
	if err == nil {
		t.Fatal("expected ErrInvalidPathID, got nil")
	}
	// #3418: assert the SPECIFIC sentinel, not just err != nil — a constructor
	// returning the wrong sentinel (e.g. a neighbouring field's) would otherwise
	// pass silently despite the failure message naming this field's error.
	if !errors.Is(err, ErrInvalidPathID) {
		t.Errorf("expected ErrInvalidPathID, got %v", err)
	}
}

// TestNewPath_Rejects_Level_Zero pins the
// :required check for level: passing the zero value of
// string must produce ErrInvalidPathLevel.
func TestNewPath_Rejects_Level_Zero(t *testing.T) {
	_, err := NewPath("x", "x", "x", "x", "", int(1), *new([]string))
	if err == nil {
		t.Fatal("expected ErrInvalidPathLevel, got nil")
	}
	// #3418: assert the SPECIFIC sentinel, not just err != nil — a constructor
	// returning the wrong sentinel (e.g. a neighbouring field's) would otherwise
	// pass silently despite the failure message naming this field's error.
	if !errors.Is(err, ErrInvalidPathLevel) {
		t.Errorf("expected ErrInvalidPathLevel, got %v", err)
	}
}

// TestNewPath_Rejects_Slug_Zero pins the
// :required check for slug: passing the zero value of
// string must produce ErrInvalidPathSlug.
func TestNewPath_Rejects_Slug_Zero(t *testing.T) {
	_, err := NewPath("x", "", "x", "x", "beginner", int(1), *new([]string))
	if err == nil {
		t.Fatal("expected ErrInvalidPathSlug, got nil")
	}
	// #3418: assert the SPECIFIC sentinel, not just err != nil — a constructor
	// returning the wrong sentinel (e.g. a neighbouring field's) would otherwise
	// pass silently despite the failure message naming this field's error.
	if !errors.Is(err, ErrInvalidPathSlug) {
		t.Errorf("expected ErrInvalidPathSlug, got %v", err)
	}
}

// TestNewPath_Rejects_Summary_Zero pins the
// :required check for summary: passing the zero value of
// string must produce ErrInvalidPathSummary.
func TestNewPath_Rejects_Summary_Zero(t *testing.T) {
	_, err := NewPath("x", "x", "x", "", "beginner", int(1), *new([]string))
	if err == nil {
		t.Fatal("expected ErrInvalidPathSummary, got nil")
	}
	// #3418: assert the SPECIFIC sentinel, not just err != nil — a constructor
	// returning the wrong sentinel (e.g. a neighbouring field's) would otherwise
	// pass silently despite the failure message naming this field's error.
	if !errors.Is(err, ErrInvalidPathSummary) {
		t.Errorf("expected ErrInvalidPathSummary, got %v", err)
	}
}

// TestNewPath_Rejects_Title_Zero pins the
// :required check for title: passing the zero value of
// string must produce ErrInvalidPathTitle.
func TestNewPath_Rejects_Title_Zero(t *testing.T) {
	_, err := NewPath("x", "x", "", "x", "beginner", int(1), *new([]string))
	if err == nil {
		t.Fatal("expected ErrInvalidPathTitle, got nil")
	}
	// #3418: assert the SPECIFIC sentinel, not just err != nil — a constructor
	// returning the wrong sentinel (e.g. a neighbouring field's) would otherwise
	// pass silently despite the failure message naming this field's error.
	if !errors.Is(err, ErrInvalidPathTitle) {
		t.Errorf("expected ErrInvalidPathTitle, got %v", err)
	}
}
