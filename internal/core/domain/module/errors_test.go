package module

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
		err := ErrInvalidModuleID
		if err == nil {
			t.Fatal("sentinel is nil")
		}
		if !errors.Is(err, ErrInvalidModuleID) {
			t.Errorf("errors.Is(self) = false; sentinel identity broken")
		}
		wrapped := fmt.Errorf("ctx: %w", err)
		if !errors.Is(wrapped, ErrInvalidModuleID) {
			t.Errorf("errors.Is through wrap = false; %%w chain broken")
		}
		if got := errcat.CategoryOf(err); got != errcat.BadRequest {
			t.Errorf("CategoryOf(%v) = %v, want BadRequest", err, got)
		}
	})
	t.Run("CourseID", func(t *testing.T) {
		err := ErrInvalidModuleCourseID
		if err == nil {
			t.Fatal("sentinel is nil")
		}
		if !errors.Is(err, ErrInvalidModuleCourseID) {
			t.Errorf("errors.Is(self) = false; sentinel identity broken")
		}
		wrapped := fmt.Errorf("ctx: %w", err)
		if !errors.Is(wrapped, ErrInvalidModuleCourseID) {
			t.Errorf("errors.Is through wrap = false; %%w chain broken")
		}
		if got := errcat.CategoryOf(err); got != errcat.BadRequest {
			t.Errorf("CategoryOf(%v) = %v, want BadRequest", err, got)
		}
	})
	t.Run("Slug", func(t *testing.T) {
		err := ErrInvalidModuleSlug
		if err == nil {
			t.Fatal("sentinel is nil")
		}
		if !errors.Is(err, ErrInvalidModuleSlug) {
			t.Errorf("errors.Is(self) = false; sentinel identity broken")
		}
		wrapped := fmt.Errorf("ctx: %w", err)
		if !errors.Is(wrapped, ErrInvalidModuleSlug) {
			t.Errorf("errors.Is through wrap = false; %%w chain broken")
		}
		if got := errcat.CategoryOf(err); got != errcat.BadRequest {
			t.Errorf("CategoryOf(%v) = %v, want BadRequest", err, got)
		}
	})
	t.Run("Title", func(t *testing.T) {
		err := ErrInvalidModuleTitle
		if err == nil {
			t.Fatal("sentinel is nil")
		}
		if !errors.Is(err, ErrInvalidModuleTitle) {
			t.Errorf("errors.Is(self) = false; sentinel identity broken")
		}
		wrapped := fmt.Errorf("ctx: %w", err)
		if !errors.Is(wrapped, ErrInvalidModuleTitle) {
			t.Errorf("errors.Is through wrap = false; %%w chain broken")
		}
		if got := errcat.CategoryOf(err); got != errcat.BadRequest {
			t.Errorf("CategoryOf(%v) = %v, want BadRequest", err, got)
		}
	})
}
