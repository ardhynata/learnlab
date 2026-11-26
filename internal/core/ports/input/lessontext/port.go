package lessontextport

import (
	"context"
	"time"
)

// LessonTextService is the inbound port describing the LessonText use-cases.
// Implementations live in internal/core/service/lessontext.
type LessonTextService interface {
	Create(ctx context.Context, cmd CreateLessonTextCommand) (*LessonTextResponse, error)
	GetByID(ctx context.Context, q GetLessonTextByIDQuery) (*LessonTextResponse, error)
	List(ctx context.Context, q ListLessonTextQuery) ([]*LessonTextResponse, error)
	ListByLesson(ctx context.Context, q ListLessonTextByLessonQuery) ([]*LessonTextResponse, error)
	// CountByLesson returns the total number of lessontext rows whose
	// LessonID equals LessonID, ignoring limit/offset. The
	// listByLesson REST handler uses this to populate the `total` field in
	// the {data, total} envelope with the true dataset-wide count rather than
	// the page size (#2202).
	CountByLesson(ctx context.Context, q ListLessonTextByLessonQuery) (int, error)
	// ListByLessonSince is the keyset-paginated sibling of
	// ListByLesson (#4237): the gRPC ListByLessonSince RPC handler
	// calls this for a cross-service `derive:` rollup's internal
	// complete-scan loop, so a producer-side row inserted mid-scan can never
	// shift an already-fetched page (see ListByLessonSince's godoc on
	// the output port for the full mechanism). afterID == "" starts from
	// the top; a non-empty afterID resumes strictly after that (created_at,
	// id) cursor. Not part of the general REST/HTMX listing surface.
	ListByLessonSince(ctx context.Context, refID string, afterCreatedAt time.Time, afterID string, limit int) ([]*LessonTextResponse, error)
	Options(ctx context.Context, q LessonTextOptionsQuery) ([]LessonTextOption, error)
	Update(ctx context.Context, cmd UpdateLessonTextCommand) (*LessonTextResponse, error)
	Delete(ctx context.Context, cmd DeleteLessonTextCommand) error
}
