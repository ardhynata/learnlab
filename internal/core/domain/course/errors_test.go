package course

import (
	"errors"
	"fmt"
	"testing"

	"github.com/inxpired/hexago-runtime/errcat"
)

// TestErrInvalid_IdentityAndCategory pins the contract every domain
// sentinel emitted from errors.go must satisfy:
//
//  1. Identity — errors.Is matches the sentinel itself, and continues
//     to match when wrapped via fmt.Errorf("%w"). Service-layer code
//     and adapters wrap these sentinels routinely; this guards the
//     walk-the-chain behavior callers depend on.
//  2. Category — every sentinel here carries errcat.BadRequest, so
//     every transport adapter routes it to the right HTTP/gRPC code
//     without per-error wiring.
//
// Sentinels for fields that have no validation path (pure optional, no
// :required / :nonzero / :finite and no enum_values membership check) are
// not emitted at all — this gate mirrors the emission gate in errors.go
// exactly (Required / Nonzero / Finite / len(EnumValues) > 0), so every
// enum-only entity exercises its ErrInvalid<Entity><Field> sentinel too
// (#3395).
func TestErrInvalid_IdentityAndCategory(t *testing.T) {
	t.Run("ID", func(t *testing.T) {
		err := ErrInvalidCourseID
		if err == nil {
			t.Fatal("sentinel is nil")
		}
		if !errors.Is(err, ErrInvalidCourseID) {
			t.Errorf("errors.Is(self) = false; sentinel identity broken")
		}
		wrapped := fmt.Errorf("ctx: %w", err)
		if !errors.Is(wrapped, ErrInvalidCourseID) {
			t.Errorf("errors.Is through wrap = false; %%w chain broken")
		}
		if got := errcat.CategoryOf(err); got != errcat.BadRequest {
			t.Errorf("CategoryOf(%v) = %v, want BadRequest", err, got)
		}
	})
	t.Run("Level", func(t *testing.T) {
		err := ErrInvalidCourseLevel
		if err == nil {
			t.Fatal("sentinel is nil")
		}
		if !errors.Is(err, ErrInvalidCourseLevel) {
			t.Errorf("errors.Is(self) = false; sentinel identity broken")
		}
		wrapped := fmt.Errorf("ctx: %w", err)
		if !errors.Is(wrapped, ErrInvalidCourseLevel) {
			t.Errorf("errors.Is through wrap = false; %%w chain broken")
		}
		if got := errcat.CategoryOf(err); got != errcat.BadRequest {
			t.Errorf("CategoryOf(%v) = %v, want BadRequest", err, got)
		}
	})
	t.Run("Slug", func(t *testing.T) {
		err := ErrInvalidCourseSlug
		if err == nil {
			t.Fatal("sentinel is nil")
		}
		if !errors.Is(err, ErrInvalidCourseSlug) {
			t.Errorf("errors.Is(self) = false; sentinel identity broken")
		}
		wrapped := fmt.Errorf("ctx: %w", err)
		if !errors.Is(wrapped, ErrInvalidCourseSlug) {
			t.Errorf("errors.Is through wrap = false; %%w chain broken")
		}
		if got := errcat.CategoryOf(err); got != errcat.BadRequest {
			t.Errorf("CategoryOf(%v) = %v, want BadRequest", err, got)
		}
	})
	t.Run("Summary", func(t *testing.T) {
		err := ErrInvalidCourseSummary
		if err == nil {
			t.Fatal("sentinel is nil")
		}
		if !errors.Is(err, ErrInvalidCourseSummary) {
			t.Errorf("errors.Is(self) = false; sentinel identity broken")
		}
		wrapped := fmt.Errorf("ctx: %w", err)
		if !errors.Is(wrapped, ErrInvalidCourseSummary) {
			t.Errorf("errors.Is through wrap = false; %%w chain broken")
		}
		if got := errcat.CategoryOf(err); got != errcat.BadRequest {
			t.Errorf("CategoryOf(%v) = %v, want BadRequest", err, got)
		}
	})
	t.Run("Title", func(t *testing.T) {
		err := ErrInvalidCourseTitle
		if err == nil {
			t.Fatal("sentinel is nil")
		}
		if !errors.Is(err, ErrInvalidCourseTitle) {
			t.Errorf("errors.Is(self) = false; sentinel identity broken")
		}
		wrapped := fmt.Errorf("ctx: %w", err)
		if !errors.Is(wrapped, ErrInvalidCourseTitle) {
			t.Errorf("errors.Is through wrap = false; %%w chain broken")
		}
		if got := errcat.CategoryOf(err); got != errcat.BadRequest {
			t.Errorf("CategoryOf(%v) = %v, want BadRequest", err, got)
		}
	})
	t.Run("Topic", func(t *testing.T) {
		err := ErrInvalidCourseTopic
		if err == nil {
			t.Fatal("sentinel is nil")
		}
		if !errors.Is(err, ErrInvalidCourseTopic) {
			t.Errorf("errors.Is(self) = false; sentinel identity broken")
		}
		wrapped := fmt.Errorf("ctx: %w", err)
		if !errors.Is(wrapped, ErrInvalidCourseTopic) {
			t.Errorf("errors.Is through wrap = false; %%w chain broken")
		}
		if got := errcat.CategoryOf(err); got != errcat.BadRequest {
			t.Errorf("CategoryOf(%v) = %v, want BadRequest", err, got)
		}
	})
}
