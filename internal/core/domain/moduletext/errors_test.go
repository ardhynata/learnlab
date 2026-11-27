package moduletext

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
		err := ErrInvalidModuleTextID
		if err == nil {
			t.Fatal("sentinel is nil")
		}
		if !errors.Is(err, ErrInvalidModuleTextID) {
			t.Errorf("errors.Is(self) = false; sentinel identity broken")
		}
		wrapped := fmt.Errorf("ctx: %w", err)
		if !errors.Is(wrapped, ErrInvalidModuleTextID) {
			t.Errorf("errors.Is through wrap = false; %%w chain broken")
		}
		if got := errcat.CategoryOf(err); got != errcat.BadRequest {
			t.Errorf("CategoryOf(%v) = %v, want BadRequest", err, got)
		}
	})
	t.Run("Locale", func(t *testing.T) {
		err := ErrInvalidModuleTextLocale
		if err == nil {
			t.Fatal("sentinel is nil")
		}
		if !errors.Is(err, ErrInvalidModuleTextLocale) {
			t.Errorf("errors.Is(self) = false; sentinel identity broken")
		}
		wrapped := fmt.Errorf("ctx: %w", err)
		if !errors.Is(wrapped, ErrInvalidModuleTextLocale) {
			t.Errorf("errors.Is through wrap = false; %%w chain broken")
		}
		if got := errcat.CategoryOf(err); got != errcat.BadRequest {
			t.Errorf("CategoryOf(%v) = %v, want BadRequest", err, got)
		}
	})
	t.Run("ModuleID", func(t *testing.T) {
		err := ErrInvalidModuleTextModuleID
		if err == nil {
			t.Fatal("sentinel is nil")
		}
		if !errors.Is(err, ErrInvalidModuleTextModuleID) {
			t.Errorf("errors.Is(self) = false; sentinel identity broken")
		}
		wrapped := fmt.Errorf("ctx: %w", err)
		if !errors.Is(wrapped, ErrInvalidModuleTextModuleID) {
			t.Errorf("errors.Is through wrap = false; %%w chain broken")
		}
		if got := errcat.CategoryOf(err); got != errcat.BadRequest {
			t.Errorf("CategoryOf(%v) = %v, want BadRequest", err, got)
		}
	})
	t.Run("Title", func(t *testing.T) {
		err := ErrInvalidModuleTextTitle
		if err == nil {
			t.Fatal("sentinel is nil")
		}
		if !errors.Is(err, ErrInvalidModuleTextTitle) {
			t.Errorf("errors.Is(self) = false; sentinel identity broken")
		}
		wrapped := fmt.Errorf("ctx: %w", err)
		if !errors.Is(wrapped, ErrInvalidModuleTextTitle) {
			t.Errorf("errors.Is through wrap = false; %%w chain broken")
		}
		if got := errcat.CategoryOf(err); got != errcat.BadRequest {
			t.Errorf("CategoryOf(%v) = %v, want BadRequest", err, got)
		}
	})
}
