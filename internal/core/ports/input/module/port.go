package moduleport

import (
	"context"
	"time"
)

// ModuleService is the inbound port describing the Module use-cases.
// Implementations live in internal/core/service/module.
type ModuleService interface {
	Create(ctx context.Context, cmd CreateModuleCommand) (*ModuleResponse, error)
	GetByID(ctx context.Context, q GetModuleByIDQuery) (*ModuleResponse, error)
	List(ctx context.Context, q ListModuleQuery) ([]*ModuleResponse, error)
	ListByCourse(ctx context.Context, q ListModuleByCourseQuery) ([]*ModuleResponse, error)
	// CountByCourse returns the total number of module rows whose
	// CourseID equals CourseID, ignoring limit/offset. The
	// listByCourse REST handler uses this to populate the `total` field in
	// the {data, total} envelope with the true dataset-wide count rather than
	// the page size (#2202).
	CountByCourse(ctx context.Context, q ListModuleByCourseQuery) (int, error)
	// ListByCourseSince is the keyset-paginated sibling of
	// ListByCourse (#4237): the gRPC ListByCourseSince RPC handler
	// calls this for a cross-service `derive:` rollup's internal
	// complete-scan loop, so a producer-side row inserted mid-scan can never
	// shift an already-fetched page (see ListByCourseSince's godoc on
	// the output port for the full mechanism). afterID == "" starts from
	// the top; a non-empty afterID resumes strictly after that (created_at,
	// id) cursor. Not part of the general REST/HTMX listing surface.
	ListByCourseSince(ctx context.Context, refID string, afterCreatedAt time.Time, afterID string, limit int) ([]*ModuleResponse, error)
	Options(ctx context.Context, q ModuleOptionsQuery) ([]ModuleOption, error)
	Update(ctx context.Context, cmd UpdateModuleCommand) (*ModuleResponse, error)
	Delete(ctx context.Context, cmd DeleteModuleCommand) error
}
