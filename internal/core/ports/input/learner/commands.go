package learnerport

import (
	"bytes"
	"encoding/json"
	"io"
)

type CreateLearnerCommand struct {
	ID   string `json:"id"`
	Name string `json:"name"`
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
func (c *CreateLearnerCommand) DecodeJSON(r io.Reader) error {
	data, err := io.ReadAll(r)
	if err != nil {
		return err
	}
	dec := json.NewDecoder(bytes.NewReader(data))
	dec.DisallowUnknownFields()
	return dec.Decode(c)
}

type UpdateLearnerCommand struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// DecodeJSON parses a JSON body into the command with the same probe-
// then-strict-decode shape as the Create variant. ID is path-bound
// (set by the handler from r.PathValue / gRPC request id), so it is
// never expected in the body and never wire-probed.
func (c *UpdateLearnerCommand) DecodeJSON(r io.Reader) error {
	data, err := io.ReadAll(r)
	if err != nil {
		return err
	}
	dec := json.NewDecoder(bytes.NewReader(data))
	dec.DisallowUnknownFields()
	return dec.Decode(c)
}

type DeleteLearnerCommand struct {
	ID string `json:"id"`
}
