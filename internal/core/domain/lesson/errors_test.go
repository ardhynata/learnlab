package lesson

import (
	"errors"
	"fmt"
	"testing"

	"github.com/inxpired/hexago/runtime/errcat"
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
		err := ErrInvalidLessonID
		if err == nil {
			t.Fatal("sentinel is nil")
		}
		if !errors.Is(err, ErrInvalidLessonID) {
			t.Errorf("errors.Is(self) = false; sentinel identity broken")
		}
		wrapped := fmt.Errorf("ctx: %w", err)
		if !errors.Is(wrapped, ErrInvalidLessonID) {
			t.Errorf("errors.Is through wrap = false; %%w chain broken")
		}
		if got := errcat.CategoryOf(err); got != errcat.BadRequest {
			t.Errorf("CategoryOf(%v) = %v, want BadRequest", err, got)
		}
	})
	t.Run("CourseID", func(t *testing.T) {
		err := ErrInvalidLessonCourseID
		if err == nil {
			t.Fatal("sentinel is nil")
		}
		if !errors.Is(err, ErrInvalidLessonCourseID) {
			t.Errorf("errors.Is(self) = false; sentinel identity broken")
		}
		wrapped := fmt.Errorf("ctx: %w", err)
		if !errors.Is(wrapped, ErrInvalidLessonCourseID) {
			t.Errorf("errors.Is through wrap = false; %%w chain broken")
		}
		if got := errcat.CategoryOf(err); got != errcat.BadRequest {
			t.Errorf("CategoryOf(%v) = %v, want BadRequest", err, got)
		}
	})
	t.Run("Kind", func(t *testing.T) {
		err := ErrInvalidLessonKind
		if err == nil {
			t.Fatal("sentinel is nil")
		}
		if !errors.Is(err, ErrInvalidLessonKind) {
			t.Errorf("errors.Is(self) = false; sentinel identity broken")
		}
		wrapped := fmt.Errorf("ctx: %w", err)
		if !errors.Is(wrapped, ErrInvalidLessonKind) {
			t.Errorf("errors.Is through wrap = false; %%w chain broken")
		}
		if got := errcat.CategoryOf(err); got != errcat.BadRequest {
			t.Errorf("CategoryOf(%v) = %v, want BadRequest", err, got)
		}
	})
	t.Run("Slug", func(t *testing.T) {
		err := ErrInvalidLessonSlug
		if err == nil {
			t.Fatal("sentinel is nil")
		}
		if !errors.Is(err, ErrInvalidLessonSlug) {
			t.Errorf("errors.Is(self) = false; sentinel identity broken")
		}
		wrapped := fmt.Errorf("ctx: %w", err)
		if !errors.Is(wrapped, ErrInvalidLessonSlug) {
			t.Errorf("errors.Is through wrap = false; %%w chain broken")
		}
		if got := errcat.CategoryOf(err); got != errcat.BadRequest {
			t.Errorf("CategoryOf(%v) = %v, want BadRequest", err, got)
		}
	})
	t.Run("Title", func(t *testing.T) {
		err := ErrInvalidLessonTitle
		if err == nil {
			t.Fatal("sentinel is nil")
		}
		if !errors.Is(err, ErrInvalidLessonTitle) {
			t.Errorf("errors.Is(self) = false; sentinel identity broken")
		}
		wrapped := fmt.Errorf("ctx: %w", err)
		if !errors.Is(wrapped, ErrInvalidLessonTitle) {
			t.Errorf("errors.Is through wrap = false; %%w chain broken")
		}
		if got := errcat.CategoryOf(err); got != errcat.BadRequest {
			t.Errorf("CategoryOf(%v) = %v, want BadRequest", err, got)
		}
	})
}
