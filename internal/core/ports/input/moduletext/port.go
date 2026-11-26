package moduletextport

import (
	"context"
	"time"
)

// ModuleTextService is the inbound port describing the ModuleText use-cases.
// Implementations live in internal/core/service/moduletext.
type ModuleTextService interface {
	Create(ctx context.Context, cmd CreateModuleTextCommand) (*ModuleTextResponse, error)
	GetByID(ctx context.Context, q GetModuleTextByIDQuery) (*ModuleTextResponse, error)
	List(ctx context.Context, q ListModuleTextQuery) ([]*ModuleTextResponse, error)
	ListByModule(ctx context.Context, q ListModuleTextByModuleQuery) ([]*ModuleTextResponse, error)
	// CountByModule returns the total number of moduletext rows whose
	// ModuleID equals ModuleID, ignoring limit/offset. The
	// listByModule REST handler uses this to populate the `total` field in
	// the {data, total} envelope with the true dataset-wide count rather than
	// the page size (#2202).
	CountByModule(ctx context.Context, q ListModuleTextByModuleQuery) (int, error)
	// ListByModuleSince is the keyset-paginated sibling of
	// ListByModule (#4237): the gRPC ListByModuleSince RPC handler
	// calls this for a cross-service `derive:` rollup's internal
	// complete-scan loop, so a producer-side row inserted mid-scan can never
	// shift an already-fetched page (see ListByModuleSince's godoc on
	// the output port for the full mechanism). afterID == "" starts from
	// the top; a non-empty afterID resumes strictly after that (created_at,
	// id) cursor. Not part of the general REST/HTMX listing surface.
	ListByModuleSince(ctx context.Context, refID string, afterCreatedAt time.Time, afterID string, limit int) ([]*ModuleTextResponse, error)
	Options(ctx context.Context, q ModuleTextOptionsQuery) ([]ModuleTextOption, error)
	Update(ctx context.Context, cmd UpdateModuleTextCommand) (*ModuleTextResponse, error)
	Delete(ctx context.Context, cmd DeleteModuleTextCommand) error
}
