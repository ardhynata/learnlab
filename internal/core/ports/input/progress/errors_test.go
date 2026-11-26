package progressport

import (
	"errors"
	"fmt"
	"testing"

	"github.com/inxpired/hexago/runtime/errcat"
)

// TestServiceSentinels pins the identity and category of every
// service-level sentinel emitted by the input_errors template.
// Adapters route status codes off the sentinel's errcat category, so
// a future regen that flips a category silently would change client-
// facing status codes — this test catches that.
func TestServiceSentinels(t *testing.T) {
	cases := []struct {
		name string
		err  error
		cat  errcat.Category
	}{
		{"not-found", ErrProgressNotFound, errcat.NotFound},
		{"already-exists", ErrProgressAlreadyExists, errcat.Conflict},
		{"learnerid-invalid-reference", ErrProgressLearnerIDInvalidReference, errcat.BadRequest},
		{"lessonid-invalid-reference", ErrProgressLessonIDInvalidReference, errcat.BadRequest},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if tc.err == nil {
				t.Fatal("sentinel is nil")
			}
			if !errors.Is(tc.err, tc.err) {
				t.Errorf("sentinel does not match itself: %v", tc.err)
			}
			if got := errcat.CategoryOf(tc.err); got != tc.cat {
				t.Errorf("category mismatch for %v: got %v, want %v", tc.err, got, tc.cat)
			}
		})
	}
}

// TestErrRequiredFieldMissingWrapping pins the wrap shape every
// generated DecodeJSON method emits. Callers wrap with the offending
// field name via `fmt.Errorf("%w: <field>", ErrRequiredFieldMissing)`;
// `errors.Is` on the wrapped value must continue to match.
func TestErrRequiredFieldMissingWrapping(t *testing.T) {
	if ErrRequiredFieldMissing == nil {
		t.Fatal("ErrRequiredFieldMissing is nil")
		return
	}
	wrapped := fmt.Errorf("%w: title", ErrRequiredFieldMissing)
	if !errors.Is(wrapped, ErrRequiredFieldMissing) {
		t.Errorf("wrapped error does not match ErrRequiredFieldMissing")
	}
	if got := errcat.CategoryOf(ErrRequiredFieldMissing); got != errcat.BadRequest {
		t.Errorf("ErrRequiredFieldMissing should be BadRequest, got %v", got)
	}
}
