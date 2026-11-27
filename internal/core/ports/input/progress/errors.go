package progressport

import "github.com/inxpired/hexago-runtime/errcat"

// The scope hint below tells the `hexago scaffold i18n` catalog harvester which
// kebab-cased entity these errcat.New sentinels belong to. The HTMX adapter
// localizes each sentinel at RENDER time under a COMPUTED key
// (`<entity>.error.<slug>` / `error.<slug>` — see humanizeValidationMessage),
// which no literal call-site scan can see; the harvester reconstructs those keys
// from the sentinel messages here + this scope, so a translator is told about
// every error string the surface can render (#4483,
// docs/design/bilingual-ui-toggle.md §5). Presentation-only: the sentinel
// VALUES are never localized (they are the log line, the JSON body and the
// string fieldForError matches on).
//hexago:i18n-scope progress

// Service-level outcomes. Categories are part of the sentinel itself —
// every transport adapter (REST, HTMX, gRPC) reads the category at the
// handler boundary without per-entity mapper plumbing. To add a new
// port-level error, declare it here with errcat.New(msg, errcat.<Cat>)
// and the adapter generation picks it up automatically.
var (
	ErrProgressNotFound                  = errcat.New("progress: not found", errcat.NotFound)
	ErrProgressAlreadyExists             = errcat.New("progress: already exists", errcat.Conflict)
	ErrProgressLearnerIDInvalidReference = errcat.New("progress: invalid learnerid reference", errcat.BadRequest)
	ErrProgressLessonIDInvalidReference  = errcat.New("progress: invalid lessonid reference", errcat.BadRequest)
)

// ErrRequiredFieldMissing reports that the wire payload (JSON body,
// gRPC request, form post) did not carry a field declared
// `required: true` in the spec. Callers wrap with the offending field
// name:
//
//	fmt.Errorf("%w: title", inputport.ErrRequiredFieldMissing)
//
// Distinct from the domain-level ErrInvalid<E><F> sentinels: those
// fire when a field WAS sent but failed a value check (empty string,
// zero time, etc.). Both carry errcat.BadRequest, so adapters route
// them to the same status code; keeping them split lets observability
// distinguish "client forgot a field" from "client sent an unusable
// value."
var ErrRequiredFieldMissing = errcat.New("required field missing", errcat.BadRequest)

// ErrFieldOutOfRange reports that a wire value was present but fell outside
// the range representable by the field's declared narrow integer type
// (int8/int16/int32/uint8/uint16/uint32). The gRPC handler wraps it with the
// offending field name + Go type:
//
//	fmt.Errorf("%w: score (int8)", inputport.ErrFieldOutOfRange)
//
// It carries errcat.BadRequest, so adapters route it to 400 / InvalidArgument.
// This closes the gap where the gRPC handler silently narrowed an int64/uint64
// wire value into a smaller Go integer (e.g. int8(200) == -56) with no bounds
// check — parity with the REST/HTMX strconv.ParseInt bitSize guard (#3392).
var ErrFieldOutOfRange = errcat.New("field value out of range", errcat.BadRequest)

// ErrInvalidTimestamp reports that a wire value for a time field was
// present (non-empty) but failed RFC3339Nano parsing. The gRPC handler
// wraps it with the offending field name:
//
//	fmt.Errorf("%w: due_at", inputport.ErrInvalidTimestamp)
//
// It carries errcat.BadRequest, so adapters route it to 400 / InvalidArgument.
// This closes the gap where the gRPC handler's rfc3339PtrOrNil/rfc3339OrZero
// helpers swallowed a parse error into nil/zero-time — the same signal as
// "field not set" — so a malformed non-empty timestamp was silently accepted
// (and on Update, silently CLEARED a previously-set field) instead of being
// rejected, unlike REST/HTMX's strict encoding/json decode (#3888).
var ErrInvalidTimestamp = errcat.New("invalid timestamp", errcat.BadRequest)
