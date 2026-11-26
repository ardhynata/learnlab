package lessontextport

import (
	"errors"
	"strings"
	"testing"
)

// TestCreateLessonTextCommandDecodeJSON_RejectsMalformedJSON pins
// that DecodeJSON surfaces a parse error rather than silently
// constructing a zero-valued command. Tested via malformed bytes so
// the test stays valid regardless of which fields the spec declares
// (a wire-required test would need spec-aware field names; a malformed
// body fails earlier and is field-set-agnostic).
func TestCreateLessonTextCommandDecodeJSON_RejectsMalformedJSON(t *testing.T) {
	body := strings.NewReader(`not-json`)
	var c CreateLessonTextCommand
	err := c.DecodeJSON(body)
	if err == nil {
		t.Fatal("expected DecodeJSON to reject malformed JSON, got nil")
	}
}

// TestCreateLessonTextCommandDecodeJSON_MissingRequired pins the
// wire-presence contract: every spec-declared `required: true` field
// that is not Auto must surface as ErrRequiredFieldMissing wrapped
// with the field name. The category (BadRequest) is preserved so
// adapters route to 400.
func TestCreateLessonTextCommandDecodeJSON_MissingRequired(t *testing.T) {
	body := strings.NewReader(`{}`)
	var c CreateLessonTextCommand
	err := c.DecodeJSON(body)
	if err == nil {
		t.Fatal("expected DecodeJSON to reject empty body, got nil")
	}
	if !errors.Is(err, ErrRequiredFieldMissing) {
		t.Errorf("expected ErrRequiredFieldMissing, got: %v", err)
	}
}

// TestCreateLessonTextCommandDecodeJSON_WireKeyCaseInsensitive pins #5312:
// the strict json.Decoder matches a field regardless of the key's case, so the
// wire-presence probe must too. A required key sent in upper case is
// present; it used to be reported as a false "required field missing" 400.
func TestCreateLessonTextCommandDecodeJSON_WireKeyCaseInsensitive(t *testing.T) {
	body := strings.NewReader("{" + strings.Join([]string{
		`"` + strings.ToUpper("lesson_id") + `":"x"`,
		`"` + strings.ToUpper("locale") + `":"x"`,
		`"` + strings.ToUpper("title") + `":"x"`,
	}, ",") + "}")
	var c CreateLessonTextCommand
	if err := c.DecodeJSON(body); err != nil {
		t.Fatalf("upper-case required keys must satisfy the wire-presence probe: %v", err)
	}
}

// TestUpdateLessonTextCommandDecodeJSON_RejectsMalformedJSON pins
// that DecodeJSON surfaces a parse error for Update as well. ID is
// path-bound and not part of the JSON body.
func TestUpdateLessonTextCommandDecodeJSON_RejectsMalformedJSON(t *testing.T) {
	body := strings.NewReader(`not-json`)
	var c UpdateLessonTextCommand
	err := c.DecodeJSON(body)
	if err == nil {
		t.Fatal("expected DecodeJSON to reject malformed JSON, got nil")
	}
}

// TestUpdateLessonTextCommandDecodeJSON_MissingRequired pins the
// wire-presence contract for Update — same as Create, minus the
// path-bound ID.
func TestUpdateLessonTextCommandDecodeJSON_MissingRequired(t *testing.T) {
	body := strings.NewReader(`{}`)
	var c UpdateLessonTextCommand
	err := c.DecodeJSON(body)
	if err == nil {
		t.Fatal("expected DecodeJSON to reject empty body, got nil")
	}
	if !errors.Is(err, ErrRequiredFieldMissing) {
		t.Errorf("expected ErrRequiredFieldMissing, got: %v", err)
	}
}

// TestUpdateLessonTextCommandDecodeJSON_WireKeyCaseInsensitive pins #5312
// for Update: the probe matches keys the way the strict decoder does, so a
// required key sent in upper case is present, not "required field missing".
func TestUpdateLessonTextCommandDecodeJSON_WireKeyCaseInsensitive(t *testing.T) {
	body := strings.NewReader("{" + strings.Join([]string{
		`"` + strings.ToUpper("lesson_id") + `":"x"`,
		`"` + strings.ToUpper("locale") + `":"x"`,
		`"` + strings.ToUpper("title") + `":"x"`,
	}, ",") + "}")
	var c UpdateLessonTextCommand
	if err := c.DecodeJSON(body); err != nil {
		t.Fatalf("upper-case required keys must satisfy the wire-presence probe: %v", err)
	}
}

// TestDeleteLessonTextCommandShape pins the field set of the
// Delete command. ID is path-bound; the struct itself just carries
// it from handler to service.
func TestDeleteLessonTextCommandShape(t *testing.T) {
	c := DeleteLessonTextCommand{ID: "abc"}
	if c.ID != "abc" {
		t.Errorf("ID round-trip mismatch: got %q, want %q", c.ID, "abc")
	}
}
