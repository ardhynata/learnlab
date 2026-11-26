package path

import "github.com/inxpired/hexago/runtime/errcat"

// The scope hint below tells the `hexago scaffold i18n` catalog harvester which
// kebab-cased entity these errcat.New validation sentinels belong to, so it can
// reconstruct the `<entity>.error.<slug>` i18n keys the HTMX adapter computes at
// render time (which no literal scan can see) and seed them into keys.go
// (#4483, docs/design/bilingual-ui-toggle.md §5). Presentation-only: the
// sentinel VALUES are never localized.
//hexago:i18n-scope path

// Validation errors — domain-layer rejections that map to 400 /
// codes.InvalidArgument via the errcat.BadRequest category. Sentinels
// are emitted only for fields whose constructor / ApplyUpdate path
// actually returns them: any field with Required (string/[]byte/time/
// pointer get a zero-value check), Nonzero (numeric `== 0` reject),
// Finite (float NaN/Inf reject), EnumValues (membership check, #1416), or
// any of the declarative constraints min/max/pattern/max_length (#4161,
// #4154 — bounds, regex match, rune-count cap). An entity-level
// `invariants.exactly_one_positive` rule (#4177) contributes ONE further
// sentinel here — not per-field, since the rule is cross-field.
// Pure optional fields with no rule generate nothing.
//
// To add a new domain error, declare it next to these sentinels with
// errcat.New(msg, errcat.<Category>) — every transport adapter routes
// it correctly without further wiring.
var (
	ErrInvalidPathID      = errcat.New("path: invalid id", errcat.BadRequest)
	ErrInvalidPathLevel   = errcat.New("path: invalid level", errcat.BadRequest)
	ErrInvalidPathSlug    = errcat.New("path: invalid slug", errcat.BadRequest)
	ErrInvalidPathSummary = errcat.New("path: invalid summary", errcat.BadRequest)
	ErrInvalidPathTitle   = errcat.New("path: invalid title", errcat.BadRequest)
)
