package lessonport

import (
	"context"
	"time"
)

// LessonService is the inbound port describing the Lesson use-cases.
// Implementations live in internal/core/service/lesson.
type LessonService interface {
	Create(ctx context.Context, cmd CreateLessonCommand) (*LessonResponse, error)
	GetByID(ctx context.Context, q GetLessonByIDQuery) (*LessonResponse, error)
	List(ctx context.Context, q ListLessonQuery) ([]*LessonResponse, error)
	ListByCourse(ctx context.Context, q ListLessonByCourseQuery) ([]*LessonResponse, error)
	// CountByCourse returns the total number of lesson rows whose
	// CourseID equals CourseID, ignoring limit/offset. The
	// listByCourse REST handler uses this to populate the `total` field in
	// the {data, total} envelope with the true dataset-wide count rather than
	// the page size (#2202).
	CountByCourse(ctx context.Context, q ListLessonByCourseQuery) (int, error)
	// ListByCourseSince is the keyset-paginated sibling of
	// ListByCourse (#4237): the gRPC ListByCourseSince RPC handler
	// calls this for a cross-service `derive:` rollup's internal
	// complete-scan loop, so a producer-side row inserted mid-scan can never
	// shift an already-fetched page (see ListByCourseSince's godoc on
	// the output port for the full mechanism). afterID == "" starts from
	// the top; a non-empty afterID resumes strictly after that (created_at,
	// id) cursor. Not part of the general REST/HTMX listing surface.
	ListByCourseSince(ctx context.Context, refID string, afterCreatedAt time.Time, afterID string, limit int) ([]*LessonResponse, error)
	ListByModule(ctx context.Context, q ListLessonByModuleQuery) ([]*LessonResponse, error)
	// CountByModule returns the total number of lesson rows whose
	// ModuleID equals ModuleID, ignoring limit/offset. The
	// listByModule REST handler uses this to populate the `total` field in
	// the {data, total} envelope with the true dataset-wide count rather than
	// the page size (#2202).
	CountByModule(ctx context.Context, q ListLessonByModuleQuery) (int, error)
	// ListByModuleSince is the keyset-paginated sibling of
	// ListByModule (#4237): the gRPC ListByModuleSince RPC handler
	// calls this for a cross-service `derive:` rollup's internal
	// complete-scan loop, so a producer-side row inserted mid-scan can never
	// shift an already-fetched page (see ListByModuleSince's godoc on
	// the output port for the full mechanism). afterID == "" starts from
	// the top; a non-empty afterID resumes strictly after that (created_at,
	// id) cursor. Not part of the general REST/HTMX listing surface.
	ListByModuleSince(ctx context.Context, refID string, afterCreatedAt time.Time, afterID string, limit int) ([]*LessonResponse, error)
	Options(ctx context.Context, q LessonOptionsQuery) ([]LessonOption, error)
	Update(ctx context.Context, cmd UpdateLessonCommand) (*LessonResponse, error)
	Delete(ctx context.Context, cmd DeleteLessonCommand) error
}
