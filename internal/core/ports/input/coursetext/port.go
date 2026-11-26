package coursetextport

import (
	"context"
	"time"
)

// CourseTextService is the inbound port describing the CourseText use-cases.
// Implementations live in internal/core/service/coursetext.
type CourseTextService interface {
	Create(ctx context.Context, cmd CreateCourseTextCommand) (*CourseTextResponse, error)
	GetByID(ctx context.Context, q GetCourseTextByIDQuery) (*CourseTextResponse, error)
	List(ctx context.Context, q ListCourseTextQuery) ([]*CourseTextResponse, error)
	ListByCourse(ctx context.Context, q ListCourseTextByCourseQuery) ([]*CourseTextResponse, error)
	// CountByCourse returns the total number of coursetext rows whose
	// CourseID equals CourseID, ignoring limit/offset. The
	// listByCourse REST handler uses this to populate the `total` field in
	// the {data, total} envelope with the true dataset-wide count rather than
	// the page size (#2202).
	CountByCourse(ctx context.Context, q ListCourseTextByCourseQuery) (int, error)
	// ListByCourseSince is the keyset-paginated sibling of
	// ListByCourse (#4237): the gRPC ListByCourseSince RPC handler
	// calls this for a cross-service `derive:` rollup's internal
	// complete-scan loop, so a producer-side row inserted mid-scan can never
	// shift an already-fetched page (see ListByCourseSince's godoc on
	// the output port for the full mechanism). afterID == "" starts from
	// the top; a non-empty afterID resumes strictly after that (created_at,
	// id) cursor. Not part of the general REST/HTMX listing surface.
	ListByCourseSince(ctx context.Context, refID string, afterCreatedAt time.Time, afterID string, limit int) ([]*CourseTextResponse, error)
	Options(ctx context.Context, q CourseTextOptionsQuery) ([]CourseTextOption, error)
	Update(ctx context.Context, cmd UpdateCourseTextCommand) (*CourseTextResponse, error)
	Delete(ctx context.Context, cmd DeleteCourseTextCommand) error
}
