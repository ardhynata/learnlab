package pathport

import (
	"errors"
	"strings"
	"testing"
)

// TestCreatePathCommandDecodeJSON_RejectsMalformedJSON pins
// that DecodeJSON surfaces a parse error rather than silently
// constructing a zero-valued command. Tested via malformed bytes so
// the test stays valid regardless of which fields the spec declares
// (a wire-required test would need spec-aware field names; a malformed
// body fails earlier and is field-set-agnostic).
func TestCreatePathCommandDecodeJSON_RejectsMalformedJSON(t *testing.T) {
	body := strings.NewReader(`not-json`)
	var c CreatePathCommand
	err := c.DecodeJSON(body)
	if err == nil {
		t.Fatal("expected DecodeJSON to reject malformed JSON, got nil")
	}
}

// TestCreatePathCommandDecodeJSON_MissingRequired pins the
// wire-presence contract: every spec-declared `required: true` field
// that is not Auto must surface as ErrRequiredFieldMissing wrapped
// with the field name. The category (BadRequest) is preserved so
// adapters route to 400.
func TestCreatePathCommandDecodeJSON_MissingRequired(t *testing.T) {
	body := strings.NewReader(`{}`)
	var c CreatePathCommand
	err := c.DecodeJSON(body)
	if err == nil {
		t.Fatal("expected DecodeJSON to reject empty body, got nil")
	}
	if !errors.Is(err, ErrRequiredFieldMissing) {
		t.Errorf("expected ErrRequiredFieldMissing, got: %v", err)
	}
}

// TestCreatePathCommandDecodeJSON_WireKeyCaseInsensitive pins #5312:
// the strict json.Decoder matches a field regardless of the key's case, so the
// wire-presence probe must too. A required key sent in upper case is
// present; it used to be reported as a false "required field missing" 400.
func TestCreatePathCommandDecodeJSON_WireKeyCaseInsensitive(t *testing.T) {
	body := strings.NewReader("{" + strings.Join([]string{
		`"` + strings.ToUpper("level") + `":"x"`,
		`"` + strings.ToUpper("slug") + `":"x"`,
		`"` + strings.ToUpper("summary") + `":"x"`,
		`"` + strings.ToUpper("title") + `":"x"`,
	}, ",") + "}")
	var c CreatePathCommand
	if err := c.DecodeJSON(body); err != nil {
		t.Fatalf("upper-case required keys must satisfy the wire-presence probe: %v", err)
	}
}

// TestUpdatePathCommandDecodeJSON_RejectsMalformedJSON pins
// that DecodeJSON surfaces a parse error for Update as well. ID is
// path-bound and not part of the JSON body.
func TestUpdatePathCommandDecodeJSON_RejectsMalformedJSON(t *testing.T) {
	body := strings.NewReader(`not-json`)
	var c UpdatePathCommand
	err := c.DecodeJSON(body)
	if err == nil {
		t.Fatal("expected DecodeJSON to reject malformed JSON, got nil")
	}
}

// TestUpdatePathCommandDecodeJSON_MissingRequired pins the
// wire-presence contract for Update — same as Create, minus the
// path-bound ID.
func TestUpdatePathCommandDecodeJSON_MissingRequired(t *testing.T) {
	body := strings.NewReader(`{}`)
	var c UpdatePathCommand
	err := c.DecodeJSON(body)
	if err == nil {
		t.Fatal("expected DecodeJSON to reject empty body, got nil")
	}
	if !errors.Is(err, ErrRequiredFieldMissing) {
		t.Errorf("expected ErrRequiredFieldMissing, got: %v", err)
	}
}

// TestUpdatePathCommandDecodeJSON_WireKeyCaseInsensitive pins #5312
// for Update: the probe matches keys the way the strict decoder does, so a
// required key sent in upper case is present, not "required field missing".
func TestUpdatePathCommandDecodeJSON_WireKeyCaseInsensitive(t *testing.T) {
	body := strings.NewReader("{" + strings.Join([]string{
		`"` + strings.ToUpper("level") + `":"x"`,
		`"` + strings.ToUpper("slug") + `":"x"`,
		`"` + strings.ToUpper("summary") + `":"x"`,
		`"` + strings.ToUpper("title") + `":"x"`,
	}, ",") + "}")
	var c UpdatePathCommand
	if err := c.DecodeJSON(body); err != nil {
		t.Fatalf("upper-case required keys must satisfy the wire-presence probe: %v", err)
	}
}

// TestDeletePathCommandShape pins the field set of the
// Delete command. ID is path-bound; the struct itself just carries
// it from handler to service.
func TestDeletePathCommandShape(t *testing.T) {
	c := DeletePathCommand{ID: "abc"}
	if c.ID != "abc" {
		t.Errorf("ID round-trip mismatch: got %q, want %q", c.ID, "abc")
	}
}
