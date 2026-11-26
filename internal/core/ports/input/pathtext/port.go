package pathtextport

import (
	"context"
	"time"
)

// PathTextService is the inbound port describing the PathText use-cases.
// Implementations live in internal/core/service/pathtext.
type PathTextService interface {
	Create(ctx context.Context, cmd CreatePathTextCommand) (*PathTextResponse, error)
	GetByID(ctx context.Context, q GetPathTextByIDQuery) (*PathTextResponse, error)
	List(ctx context.Context, q ListPathTextQuery) ([]*PathTextResponse, error)
	ListByPath(ctx context.Context, q ListPathTextByPathQuery) ([]*PathTextResponse, error)
	// CountByPath returns the total number of pathtext rows whose
	// PathID equals PathID, ignoring limit/offset. The
	// listByPath REST handler uses this to populate the `total` field in
	// the {data, total} envelope with the true dataset-wide count rather than
	// the page size (#2202).
	CountByPath(ctx context.Context, q ListPathTextByPathQuery) (int, error)
	// ListByPathSince is the keyset-paginated sibling of
	// ListByPath (#4237): the gRPC ListByPathSince RPC handler
	// calls this for a cross-service `derive:` rollup's internal
	// complete-scan loop, so a producer-side row inserted mid-scan can never
	// shift an already-fetched page (see ListByPathSince's godoc on
	// the output port for the full mechanism). afterID == "" starts from
	// the top; a non-empty afterID resumes strictly after that (created_at,
	// id) cursor. Not part of the general REST/HTMX listing surface.
	ListByPathSince(ctx context.Context, refID string, afterCreatedAt time.Time, afterID string, limit int) ([]*PathTextResponse, error)
	Options(ctx context.Context, q PathTextOptionsQuery) ([]PathTextOption, error)
	Update(ctx context.Context, cmd UpdatePathTextCommand) (*PathTextResponse, error)
	Delete(ctx context.Context, cmd DeletePathTextCommand) error
}
