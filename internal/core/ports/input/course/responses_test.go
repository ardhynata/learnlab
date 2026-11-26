package courseport

import (
	"encoding/json"
	"strings"
	"testing"
	"time"
)

// TestResponseJSONRoundTrip pins the wire-level JSON shape of
// CourseResponse. The struct is the contract clients see — a
// regen that drops a tag or renames a field changes the API
// silently. This test marshals a zero-ish value and asserts the
// expected JSON tags are present.
//
// The unmarshal-and-round-trip half is conditional: when the response
// embeds user-declared value-object types, the user may have authored
// a strict UnmarshalJSON on the VO that rejects empty / zero values
// (e.g. an enum alias rejecting ""). Round-tripping a zero-value
// fixture would then trip that user invariant — a test failure that
// has nothing to do with the response shape this template owns. We
// keep the marshal-side asserts (the load-bearing JSON-tag check) and
// drop the round-trip half in that case.
//
// Encrypted fields (declared `encrypted: true` in the spec) must be
// absent from JSON output — the json:"-" tag prevents ciphertext or
// plaintext PII from leaking over the REST API (issue #1247 + #1298).
func TestResponseJSONRoundTrip(t *testing.T) {
	now := time.Now().UTC().Truncate(time.Second)
	r := CourseResponse{
		CreatedAt: now,
		UpdatedAt: now,
	}
	b, err := json.Marshal(&r)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	if !strings.Contains(string(b), `"created_at"`) {
		t.Errorf("missing created_at in JSON: %s", string(b))
	}
	if !strings.Contains(string(b), `"updated_at"`) {
		t.Errorf("missing updated_at in JSON: %s", string(b))
	}

	var got CourseResponse
	if err := json.Unmarshal(b, &got); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if !got.CreatedAt.Equal(now) {
		t.Errorf("CreatedAt round-trip mismatch: got %v, want %v", got.CreatedAt, now)
	}
	if !got.UpdatedAt.Equal(now) {
		t.Errorf("UpdatedAt round-trip mismatch: got %v, want %v", got.UpdatedAt, now)
	}
}
