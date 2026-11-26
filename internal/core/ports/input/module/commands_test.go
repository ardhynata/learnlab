package moduleport

import (
	"errors"
	"strings"
	"testing"
)

// TestCreateModuleCommandDecodeJSON_RejectsMalformedJSON pins
// that DecodeJSON surfaces a parse error rather than silently
// constructing a zero-valued command. Tested via malformed bytes so
// the test stays valid regardless of which fields the spec declares
// (a wire-required test would need spec-aware field names; a malformed
// body fails earlier and is field-set-agnostic).
func TestCreateModuleCommandDecodeJSON_RejectsMalformedJSON(t *testing.T) {
	body := strings.NewReader(`not-json`)
	var c CreateModuleCommand
	err := c.DecodeJSON(body)
	if err == nil {
		t.Fatal("expected DecodeJSON to reject malformed JSON, got nil")
	}
}

// TestCreateModuleCommandDecodeJSON_MissingRequired pins the
// wire-presence contract: every spec-declared `required: true` field
// that is not Auto must surface as ErrRequiredFieldMissing wrapped
// with the field name. The category (BadRequest) is preserved so
// adapters route to 400.
func TestCreateModuleCommandDecodeJSON_MissingRequired(t *testing.T) {
	body := strings.NewReader(`{}`)
	var c CreateModuleCommand
	err := c.DecodeJSON(body)
	if err == nil {
		t.Fatal("expected DecodeJSON to reject empty body, got nil")
	}
	if !errors.Is(err, ErrRequiredFieldMissing) {
		t.Errorf("expected ErrRequiredFieldMissing, got: %v", err)
	}
}

// TestCreateModuleCommandDecodeJSON_WireKeyCaseInsensitive pins #5312:
// the strict json.Decoder matches a field regardless of the key's case, so the
// wire-presence probe must too. A required key sent in upper case is
// present; it used to be reported as a false "required field missing" 400.
func TestCreateModuleCommandDecodeJSON_WireKeyCaseInsensitive(t *testing.T) {
	body := strings.NewReader("{" + strings.Join([]string{
		`"` + strings.ToUpper("course_id") + `":"x"`,
		`"` + strings.ToUpper("slug") + `":"x"`,
		`"` + strings.ToUpper("title") + `":"x"`,
	}, ",") + "}")
	var c CreateModuleCommand
	if err := c.DecodeJSON(body); err != nil {
		t.Fatalf("upper-case required keys must satisfy the wire-presence probe: %v", err)
	}
}

// TestUpdateModuleCommandDecodeJSON_RejectsMalformedJSON pins
// that DecodeJSON surfaces a parse error for Update as well. ID is
// path-bound and not part of the JSON body.
func TestUpdateModuleCommandDecodeJSON_RejectsMalformedJSON(t *testing.T) {
	body := strings.NewReader(`not-json`)
	var c UpdateModuleCommand
	err := c.DecodeJSON(body)
	if err == nil {
		t.Fatal("expected DecodeJSON to reject malformed JSON, got nil")
	}
}

// TestUpdateModuleCommandDecodeJSON_MissingRequired pins the
// wire-presence contract for Update — same as Create, minus the
// path-bound ID.
func TestUpdateModuleCommandDecodeJSON_MissingRequired(t *testing.T) {
	body := strings.NewReader(`{}`)
	var c UpdateModuleCommand
	err := c.DecodeJSON(body)
	if err == nil {
		t.Fatal("expected DecodeJSON to reject empty body, got nil")
	}
	if !errors.Is(err, ErrRequiredFieldMissing) {
		t.Errorf("expected ErrRequiredFieldMissing, got: %v", err)
	}
}

// TestUpdateModuleCommandDecodeJSON_WireKeyCaseInsensitive pins #5312
// for Update: the probe matches keys the way the strict decoder does, so a
// required key sent in upper case is present, not "required field missing".
func TestUpdateModuleCommandDecodeJSON_WireKeyCaseInsensitive(t *testing.T) {
	body := strings.NewReader("{" + strings.Join([]string{
		`"` + strings.ToUpper("course_id") + `":"x"`,
		`"` + strings.ToUpper("slug") + `":"x"`,
		`"` + strings.ToUpper("title") + `":"x"`,
	}, ",") + "}")
	var c UpdateModuleCommand
	if err := c.DecodeJSON(body); err != nil {
		t.Fatalf("upper-case required keys must satisfy the wire-presence probe: %v", err)
	}
}

// TestDeleteModuleCommandShape pins the field set of the
// Delete command. ID is path-bound; the struct itself just carries
// it from handler to service.
func TestDeleteModuleCommandShape(t *testing.T) {
	c := DeleteModuleCommand{ID: "abc"}
	if c.ID != "abc" {
		t.Errorf("ID round-trip mismatch: got %q, want %q", c.ID, "abc")
	}
}
