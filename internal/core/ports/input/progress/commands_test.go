package progressport

import (
	"errors"
	"strings"
	"testing"
)

// TestCreateProgressCommandDecodeJSON_RejectsMalformedJSON pins
// that DecodeJSON surfaces a parse error rather than silently
// constructing a zero-valued command. Tested via malformed bytes so
// the test stays valid regardless of which fields the spec declares
// (a wire-required test would need spec-aware field names; a malformed
// body fails earlier and is field-set-agnostic).
func TestCreateProgressCommandDecodeJSON_RejectsMalformedJSON(t *testing.T) {
	body := strings.NewReader(`not-json`)
	var c CreateProgressCommand
	err := c.DecodeJSON(body)
	if err == nil {
		t.Fatal("expected DecodeJSON to reject malformed JSON, got nil")
	}
}

// TestCreateProgressCommandDecodeJSON_MissingRequired pins the
// wire-presence contract: every spec-declared `required: true` field
// that is not Auto must surface as ErrRequiredFieldMissing wrapped
// with the field name. The category (BadRequest) is preserved so
// adapters route to 400.
func TestCreateProgressCommandDecodeJSON_MissingRequired(t *testing.T) {
	body := strings.NewReader(`{}`)
	var c CreateProgressCommand
	err := c.DecodeJSON(body)
	if err == nil {
		t.Fatal("expected DecodeJSON to reject empty body, got nil")
	}
	if !errors.Is(err, ErrRequiredFieldMissing) {
		t.Errorf("expected ErrRequiredFieldMissing, got: %v", err)
	}
}

// TestCreateProgressCommandDecodeJSON_WireKeyCaseInsensitive pins #5312:
// the strict json.Decoder matches a field regardless of the key's case, so the
// wire-presence probe must too. A required key sent in upper case is
// present; it used to be reported as a false "required field missing" 400.
func TestCreateProgressCommandDecodeJSON_WireKeyCaseInsensitive(t *testing.T) {
	body := strings.NewReader("{" + strings.Join([]string{
		`"` + strings.ToUpper("learner_id") + `":"x"`,
		`"` + strings.ToUpper("lesson_id") + `":"x"`,
	}, ",") + "}")
	var c CreateProgressCommand
	if err := c.DecodeJSON(body); err != nil {
		t.Fatalf("upper-case required keys must satisfy the wire-presence probe: %v", err)
	}
}

// TestUpdateProgressCommandDecodeJSON_RejectsMalformedJSON pins
// that DecodeJSON surfaces a parse error for Update as well. ID is
// path-bound and not part of the JSON body.
func TestUpdateProgressCommandDecodeJSON_RejectsMalformedJSON(t *testing.T) {
	body := strings.NewReader(`not-json`)
	var c UpdateProgressCommand
	err := c.DecodeJSON(body)
	if err == nil {
		t.Fatal("expected DecodeJSON to reject malformed JSON, got nil")
	}
}

// TestUpdateProgressCommandDecodeJSON_MissingRequired pins the
// wire-presence contract for Update — same as Create, minus the
// path-bound ID.
func TestUpdateProgressCommandDecodeJSON_MissingRequired(t *testing.T) {
	body := strings.NewReader(`{}`)
	var c UpdateProgressCommand
	err := c.DecodeJSON(body)
	if err == nil {
		t.Fatal("expected DecodeJSON to reject empty body, got nil")
	}
	if !errors.Is(err, ErrRequiredFieldMissing) {
		t.Errorf("expected ErrRequiredFieldMissing, got: %v", err)
	}
}

// TestUpdateProgressCommandDecodeJSON_WireKeyCaseInsensitive pins #5312
// for Update: the probe matches keys the way the strict decoder does, so a
// required key sent in upper case is present, not "required field missing".
func TestUpdateProgressCommandDecodeJSON_WireKeyCaseInsensitive(t *testing.T) {
	body := strings.NewReader("{" + strings.Join([]string{
		`"` + strings.ToUpper("learner_id") + `":"x"`,
		`"` + strings.ToUpper("lesson_id") + `":"x"`,
	}, ",") + "}")
	var c UpdateProgressCommand
	if err := c.DecodeJSON(body); err != nil {
		t.Fatalf("upper-case required keys must satisfy the wire-presence probe: %v", err)
	}
}

// TestDeleteProgressCommandShape pins the field set of the
// Delete command. ID is path-bound; the struct itself just carries
// it from handler to service.
func TestDeleteProgressCommandShape(t *testing.T) {
	c := DeleteProgressCommand{ID: "abc"}
	if c.ID != "abc" {
		t.Errorf("ID round-trip mismatch: got %q, want %q", c.ID, "abc")
	}
}
