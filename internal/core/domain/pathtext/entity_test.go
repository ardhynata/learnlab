package pathtext

import (
	"errors"
	"testing"
	"time"
)

// TestNewPathText_ValidInputs pins the happy-path constructor:
//
//   - Returns a non-nil entity and a nil error when every invariant
//     is satisfied.
//   - createdAt / updatedAt are set to the wall-clock time at
//     construction (never zero, always within a tight bracket of now).
//
// Per-field validation rejection paths are covered separately below;
// this test owns "the constructor accepts what the spec says is valid".
func TestNewPathText_ValidInputs(t *testing.T) {
	before := time.Now()
	e, err := NewPathText("x", "x", "x", "x", "x")
	after := time.Now()

	if err != nil {
		t.Fatalf("NewPathText with valid inputs returned error: %v", err)
	}
	if e == nil {
		t.Fatal("NewPathText returned nil entity with nil error")
		return
	}
	if got := e.CreatedAt(); got.IsZero() || got.Before(before) || got.After(after) {
		t.Errorf("CreatedAt() = %v, want within [%v, %v]", got, before, after)
	}
	if got := e.UpdatedAt(); got.IsZero() || got.Before(before) || got.After(after) {
		t.Errorf("UpdatedAt() = %v, want within [%v, %v]", got, before, after)
	}
}

// TestLoadPathText_BypassesValidation pins the friend-constructor
// contract: outbound adapters reconstruct an entity from at-rest state
// (row / doc / proto) WITHOUT re-running validation. A spec change
// that tightens an invariant must not retro-actively reject every
// already-stored record. LoadPathText therefore takes the same
// inputs as New but skips the checks and accepts caller-provided
// createdAt / updatedAt.
func TestLoadPathText_BypassesValidation(t *testing.T) {
	created := time.Date(2024, 1, 2, 3, 4, 5, 0, time.UTC)
	updated := time.Date(2024, 6, 7, 8, 9, 10, 0, time.UTC)
	e := LoadPathText("x", "x", "x", "x", "x", created, updated)
	if e == nil {
		t.Fatal("LoadPathText returned nil entity")
		return
	}
	if !e.CreatedAt().Equal(created) {
		t.Errorf("LoadPathText CreatedAt = %v, want %v", e.CreatedAt(), created)
	}
	if !e.UpdatedAt().Equal(updated) {
		t.Errorf("LoadPathText UpdatedAt = %v, want %v", e.UpdatedAt(), updated)
	}
}

// TestNewPathText_Rejects_ID_Zero pins the
// :required check for id: passing the zero value of
// string must produce ErrInvalidPathTextID.
func TestNewPathText_Rejects_ID_Zero(t *testing.T) {
	_, err := NewPathText("", "x", "x", "x", "x")
	if err == nil {
		t.Fatal("expected ErrInvalidPathTextID, got nil")
	}
	// #3418: assert the SPECIFIC sentinel, not just err != nil — a constructor
	// returning the wrong sentinel (e.g. a neighbouring field's) would otherwise
	// pass silently despite the failure message naming this field's error.
	if !errors.Is(err, ErrInvalidPathTextID) {
		t.Errorf("expected ErrInvalidPathTextID, got %v", err)
	}
}

// TestNewPathText_Rejects_Locale_Zero pins the
// :required check for locale: passing the zero value of
// string must produce ErrInvalidPathTextLocale.
func TestNewPathText_Rejects_Locale_Zero(t *testing.T) {
	_, err := NewPathText("x", "x", "", "x", "x")
	if err == nil {
		t.Fatal("expected ErrInvalidPathTextLocale, got nil")
	}
	// #3418: assert the SPECIFIC sentinel, not just err != nil — a constructor
	// returning the wrong sentinel (e.g. a neighbouring field's) would otherwise
	// pass silently despite the failure message naming this field's error.
	if !errors.Is(err, ErrInvalidPathTextLocale) {
		t.Errorf("expected ErrInvalidPathTextLocale, got %v", err)
	}
}

// TestNewPathText_Rejects_PathID_Zero pins the
// :required check for path_id: passing the zero value of
// string must produce ErrInvalidPathTextPathID.
func TestNewPathText_Rejects_PathID_Zero(t *testing.T) {
	_, err := NewPathText("x", "", "x", "x", "x")
	if err == nil {
		t.Fatal("expected ErrInvalidPathTextPathID, got nil")
	}
	// #3418: assert the SPECIFIC sentinel, not just err != nil — a constructor
	// returning the wrong sentinel (e.g. a neighbouring field's) would otherwise
	// pass silently despite the failure message naming this field's error.
	if !errors.Is(err, ErrInvalidPathTextPathID) {
		t.Errorf("expected ErrInvalidPathTextPathID, got %v", err)
	}
}

// TestNewPathText_Rejects_Title_Zero pins the
// :required check for title: passing the zero value of
// string must produce ErrInvalidPathTextTitle.
func TestNewPathText_Rejects_Title_Zero(t *testing.T) {
	_, err := NewPathText("x", "x", "x", "", "x")
	if err == nil {
		t.Fatal("expected ErrInvalidPathTextTitle, got nil")
	}
	// #3418: assert the SPECIFIC sentinel, not just err != nil — a constructor
	// returning the wrong sentinel (e.g. a neighbouring field's) would otherwise
	// pass silently despite the failure message naming this field's error.
	if !errors.Is(err, ErrInvalidPathTextTitle) {
		t.Errorf("expected ErrInvalidPathTextTitle, got %v", err)
	}
}
