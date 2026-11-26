package pathtextport

import (
	"errors"
	"strings"
	"testing"
)

// TestCreatePathTextCommandDecodeJSON_RejectsMalformedJSON pins
// that DecodeJSON surfaces a parse error rather than silently
// constructing a zero-valued command. Tested via malformed bytes so
// the test stays valid regardless of which fields the spec declares
// (a wire-required test would need spec-aware field names; a malformed
// body fails earlier and is field-set-agnostic).
func TestCreatePathTextCommandDecodeJSON_RejectsMalformedJSON(t *testing.T) {
	body := strings.NewReader(`not-json`)
	var c CreatePathTextCommand
	err := c.DecodeJSON(body)
	if err == nil {
		t.Fatal("expected DecodeJSON to reject malformed JSON, got nil")
	}
}

// TestCreatePathTextCommandDecodeJSON_MissingRequired pins the
// wire-presence contract: every spec-declared `required: true` field
// that is not Auto must surface as ErrRequiredFieldMissing wrapped
// with the field name. The category (BadRequest) is preserved so
// adapters route to 400.
func TestCreatePathTextCommandDecodeJSON_MissingRequired(t *testing.T) {
	body := strings.NewReader(`{}`)
	var c CreatePathTextCommand
	err := c.DecodeJSON(body)
	if err == nil {
		t.Fatal("expected DecodeJSON to reject empty body, got nil")
	}
	if !errors.Is(err, ErrRequiredFieldMissing) {
		t.Errorf("expected ErrRequiredFieldMissing, got: %v", err)
	}
}

// TestCreatePathTextCommandDecodeJSON_WireKeyCaseInsensitive pins #5312:
// the strict json.Decoder matches a field regardless of the key's case, so the
// wire-presence probe must too. A required key sent in upper case is
// present; it used to be reported as a false "required field missing" 400.
func TestCreatePathTextCommandDecodeJSON_WireKeyCaseInsensitive(t *testing.T) {
	body := strings.NewReader("{" + strings.Join([]string{
		`"` + strings.ToUpper("locale") + `":"x"`,
		`"` + strings.ToUpper("path_id") + `":"x"`,
		`"` + strings.ToUpper("title") + `":"x"`,
	}, ",") + "}")
	var c CreatePathTextCommand
	if err := c.DecodeJSON(body); err != nil {
		t.Fatalf("upper-case required keys must satisfy the wire-presence probe: %v", err)
	}
}

// TestUpdatePathTextCommandDecodeJSON_RejectsMalformedJSON pins
// that DecodeJSON surfaces a parse error for Update as well. ID is
// path-bound and not part of the JSON body.
func TestUpdatePathTextCommandDecodeJSON_RejectsMalformedJSON(t *testing.T) {
	body := strings.NewReader(`not-json`)
	var c UpdatePathTextCommand
	err := c.DecodeJSON(body)
	if err == nil {
		t.Fatal("expected DecodeJSON to reject malformed JSON, got nil")
	}
}

// TestUpdatePathTextCommandDecodeJSON_MissingRequired pins the
// wire-presence contract for Update — same as Create, minus the
// path-bound ID.
func TestUpdatePathTextCommandDecodeJSON_MissingRequired(t *testing.T) {
	body := strings.NewReader(`{}`)
	var c UpdatePathTextCommand
	err := c.DecodeJSON(body)
	if err == nil {
		t.Fatal("expected DecodeJSON to reject empty body, got nil")
	}
	if !errors.Is(err, ErrRequiredFieldMissing) {
		t.Errorf("expected ErrRequiredFieldMissing, got: %v", err)
	}
}

// TestUpdatePathTextCommandDecodeJSON_WireKeyCaseInsensitive pins #5312
// for Update: the probe matches keys the way the strict decoder does, so a
// required key sent in upper case is present, not "required field missing".
func TestUpdatePathTextCommandDecodeJSON_WireKeyCaseInsensitive(t *testing.T) {
	body := strings.NewReader("{" + strings.Join([]string{
		`"` + strings.ToUpper("locale") + `":"x"`,
		`"` + strings.ToUpper("path_id") + `":"x"`,
		`"` + strings.ToUpper("title") + `":"x"`,
	}, ",") + "}")
	var c UpdatePathTextCommand
	if err := c.DecodeJSON(body); err != nil {
		t.Fatalf("upper-case required keys must satisfy the wire-presence probe: %v", err)
	}
}

// TestDeletePathTextCommandShape pins the field set of the
// Delete command. ID is path-bound; the struct itself just carries
// it from handler to service.
func TestDeletePathTextCommandShape(t *testing.T) {
	c := DeletePathTextCommand{ID: "abc"}
	if c.ID != "abc" {
		t.Errorf("ID round-trip mismatch: got %q, want %q", c.ID, "abc")
	}
}
