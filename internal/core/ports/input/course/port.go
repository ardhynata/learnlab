package courseport

import (
	"context"
	"time"
)

// CourseService is the inbound port describing the Course use-cases.
// Implementations live in internal/core/service/course.
type CourseService interface {
	Create(ctx context.Context, cmd CreateCourseCommand) (*CourseResponse, error)
	GetByID(ctx context.Context, q GetCourseByIDQuery) (*CourseResponse, error)
	List(ctx context.Context, q ListCourseQuery) ([]*CourseResponse, error)
	ListByPath(ctx context.Context, q ListCourseByPathQuery) ([]*CourseResponse, error)
	// CountByPath returns the total number of course rows whose
	// PathID equals PathID, ignoring limit/offset. The
	// listByPath REST handler uses this to populate the `total` field in
	// the {data, total} envelope with the true dataset-wide count rather than
	// the page size (#2202).
	CountByPath(ctx context.Context, q ListCourseByPathQuery) (int, error)
	// ListByPathSince is the keyset-paginated sibling of
	// ListByPath (#4237): the gRPC ListByPathSince RPC handler
	// calls this for a cross-service `derive:` rollup's internal
	// complete-scan loop, so a producer-side row inserted mid-scan can never
	// shift an already-fetched page (see ListByPathSince's godoc on
	// the output port for the full mechanism). afterID == "" starts from
	// the top; a non-empty afterID resumes strictly after that (created_at,
	// id) cursor. Not part of the general REST/HTMX listing surface.
	ListByPathSince(ctx context.Context, refID string, afterCreatedAt time.Time, afterID string, limit int) ([]*CourseResponse, error)
	Options(ctx context.Context, q CourseOptionsQuery) ([]CourseOption, error)
	Update(ctx context.Context, cmd UpdateCourseCommand) (*CourseResponse, error)
	Delete(ctx context.Context, cmd DeleteCourseCommand) error
}
