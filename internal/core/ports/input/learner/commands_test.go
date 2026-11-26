package learnerport

import (
	"strings"
	"testing"
)

// TestCreateLearnerCommandDecodeJSON_RejectsMalformedJSON pins
// that DecodeJSON surfaces a parse error rather than silently
// constructing a zero-valued command. Tested via malformed bytes so
// the test stays valid regardless of which fields the spec declares
// (a wire-required test would need spec-aware field names; a malformed
// body fails earlier and is field-set-agnostic).
func TestCreateLearnerCommandDecodeJSON_RejectsMalformedJSON(t *testing.T) {
	body := strings.NewReader(`not-json`)
	var c CreateLearnerCommand
	err := c.DecodeJSON(body)
	if err == nil {
		t.Fatal("expected DecodeJSON to reject malformed JSON, got nil")
	}
}

// TestUpdateLearnerCommandDecodeJSON_RejectsMalformedJSON pins
// that DecodeJSON surfaces a parse error for Update as well. ID is
// path-bound and not part of the JSON body.
func TestUpdateLearnerCommandDecodeJSON_RejectsMalformedJSON(t *testing.T) {
	body := strings.NewReader(`not-json`)
	var c UpdateLearnerCommand
	err := c.DecodeJSON(body)
	if err == nil {
		t.Fatal("expected DecodeJSON to reject malformed JSON, got nil")
	}
}

// TestDeleteLearnerCommandShape pins the field set of the
// Delete command. ID is path-bound; the struct itself just carries
// it from handler to service.
func TestDeleteLearnerCommandShape(t *testing.T) {
	c := DeleteLearnerCommand{ID: "abc"}
	if c.ID != "abc" {
		t.Errorf("ID round-trip mismatch: got %q, want %q", c.ID, "abc")
	}
}
