package courseport

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"strings"
)

// foldProbeKeys re-keys a wire-presence probe map with every key case-folded
// the way encoding/json folds field names when it matches a key to a struct
// field: simple case folding plus the two non-ASCII characters that fold to
// ASCII letters (U+017F long s -> s, U+212A Kelvin sign -> k). The strict
// decoder behind DecodeJSON fills a field from "Qty" or "QTY" as readily as
// from "qty", so the exact-key probe lookups below ({"Qty":0} on a required
// numeric field with a default was not recorded as provided and the default
// overwrote the explicit 0; {"Name":"x"} got a false "required field
// missing" 400) must look keys up folded too. The wanted names are all
// lower-case snake_case. (#5312)
func foldProbeKeys(probe map[string]json.RawMessage) map[string]json.RawMessage {
	folded := make(map[string]json.RawMessage, len(probe))
	for k, v := range probe {
		k = strings.ReplaceAll(k, "\u017f", "s")
		k = strings.ReplaceAll(k, "\u212a", "k")
		folded[strings.ToLower(k)] = v
	}
	return folded
}

type CreateCourseCommand struct {
	ID       string `json:"id"`
	Level    string `json:"level"`
	PathID   string `json:"path_id"`
	Position int    `json:"position"`
	Slug     string `json:"slug"`
	Summary  string `json:"summary"`
	Title    string `json:"title"`
	Topic    string `json:"topic"`
}

// DecodeJSON parses a JSON body into the command. It enforces both
// (a) wire-presence — every spec-declared `required: true` field that
// is not Auto must appear as a JSON key; missing fields return
// ErrRequiredFieldMissing wrapped with the offending field name; and
// (b) strict-mode — unknown JSON keys are rejected by the underlying
// json.Decoder's DisallowUnknownFields setting (mapped to 400 by the
// transport adapter via httperr/grpcerr).
//
// The two-pass shape (probe-then-decode) preserves the split between
// "client forgot a field" (ErrRequiredFieldMissing) and "client sent
// an unusable value" (domain-level ErrInvalid<E><F>). Both carry
// errcat.BadRequest so adapters route them to the same status code,
// but observability can distinguish them.
//
// An older shape used `func (c *Cmd) UnmarshalJSON(...)` to do the
// probe inline — that hook is invoked by `json.Decoder.Decode` but
// internally calls a fresh `json.Unmarshal` that does NOT inherit the
// outer decoder's strictness flag, silently dropping unknown fields.
// The strict-mode contract leaked. Defining a sibling method instead
// of overriding UnmarshalJSON keeps the strictness contract intact.
func (c *CreateCourseCommand) DecodeJSON(r io.Reader) error {
	data, err := io.ReadAll(r)
	if err != nil {
		return err
	}
	var probe map[string]json.RawMessage
	if err := json.Unmarshal(data, &probe); err != nil {
		return err
	}
	probe = foldProbeKeys(probe)
	if _, ok := probe["level"]; !ok {
		return fmt.Errorf("%w: level", ErrRequiredFieldMissing)
	}
	if _, ok := probe["slug"]; !ok {
		return fmt.Errorf("%w: slug", ErrRequiredFieldMissing)
	}
	if _, ok := probe["summary"]; !ok {
		return fmt.Errorf("%w: summary", ErrRequiredFieldMissing)
	}
	if _, ok := probe["title"]; !ok {
		return fmt.Errorf("%w: title", ErrRequiredFieldMissing)
	}
	if _, ok := probe["topic"]; !ok {
		return fmt.Errorf("%w: topic", ErrRequiredFieldMissing)
	}
	dec := json.NewDecoder(bytes.NewReader(data))
	dec.DisallowUnknownFields()
	return dec.Decode(c)
}

type UpdateCourseCommand struct {
	ID       string `json:"id"`
	Level    string `json:"level"`
	PathID   string `json:"path_id"`
	Position int    `json:"position"`
	Slug     string `json:"slug"`
	Summary  string `json:"summary"`
	Title    string `json:"title"`
	Topic    string `json:"topic"`
}

// DecodeJSON parses a JSON body into the command with the same probe-
// then-strict-decode shape as the Create variant. ID is path-bound
// (set by the handler from r.PathValue / gRPC request id), so it is
// never expected in the body and never wire-probed.
func (c *UpdateCourseCommand) DecodeJSON(r io.Reader) error {
	data, err := io.ReadAll(r)
	if err != nil {
		return err
	}
	var probe map[string]json.RawMessage
	if err := json.Unmarshal(data, &probe); err != nil {
		return err
	}
	probe = foldProbeKeys(probe)
	if _, ok := probe["level"]; !ok {
		return fmt.Errorf("%w: level", ErrRequiredFieldMissing)
	}
	if _, ok := probe["slug"]; !ok {
		return fmt.Errorf("%w: slug", ErrRequiredFieldMissing)
	}
	if _, ok := probe["summary"]; !ok {
		return fmt.Errorf("%w: summary", ErrRequiredFieldMissing)
	}
	if _, ok := probe["title"]; !ok {
		return fmt.Errorf("%w: title", ErrRequiredFieldMissing)
	}
	if _, ok := probe["topic"]; !ok {
		return fmt.Errorf("%w: topic", ErrRequiredFieldMissing)
	}
	dec := json.NewDecoder(bytes.NewReader(data))
	dec.DisallowUnknownFields()
	return dec.Decode(c)
}

type DeleteCourseCommand struct {
	ID string `json:"id"`
}
