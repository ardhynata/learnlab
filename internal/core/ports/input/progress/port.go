package progressport

import (
	"context"
	"time"
)

// ProgressService is the inbound port describing the Progress use-cases.
// Implementations live in internal/core/service/progress.
type ProgressService interface {
	Create(ctx context.Context, cmd CreateProgressCommand) (*ProgressResponse, error)
	GetByID(ctx context.Context, q GetProgressByIDQuery) (*ProgressResponse, error)
	List(ctx context.Context, q ListProgressQuery) ([]*ProgressResponse, error)
	ListByLearner(ctx context.Context, q ListProgressByLearnerQuery) ([]*ProgressResponse, error)
	// CountByLearner returns the total number of progress rows whose
	// LearnerID equals LearnerID, ignoring limit/offset. The
	// listByLearner REST handler uses this to populate the `total` field in
	// the {data, total} envelope with the true dataset-wide count rather than
	// the page size (#2202).
	CountByLearner(ctx context.Context, q ListProgressByLearnerQuery) (int, error)
	// ListByLearnerSince is the keyset-paginated sibling of
	// ListByLearner (#4237): the gRPC ListByLearnerSince RPC handler
	// calls this for a cross-service `derive:` rollup's internal
	// complete-scan loop, so a producer-side row inserted mid-scan can never
	// shift an already-fetched page (see ListByLearnerSince's godoc on
	// the output port for the full mechanism). afterID == "" starts from
	// the top; a non-empty afterID resumes strictly after that (created_at,
	// id) cursor. Not part of the general REST/HTMX listing surface.
	ListByLearnerSince(ctx context.Context, refID string, afterCreatedAt time.Time, afterID string, limit int) ([]*ProgressResponse, error)
	ListByLesson(ctx context.Context, q ListProgressByLessonQuery) ([]*ProgressResponse, error)
	// CountByLesson returns the total number of progress rows whose
	// LessonID equals LessonID, ignoring limit/offset. The
	// listByLesson REST handler uses this to populate the `total` field in
	// the {data, total} envelope with the true dataset-wide count rather than
	// the page size (#2202).
	CountByLesson(ctx context.Context, q ListProgressByLessonQuery) (int, error)
	// ListByLessonSince is the keyset-paginated sibling of
	// ListByLesson (#4237): the gRPC ListByLessonSince RPC handler
	// calls this for a cross-service `derive:` rollup's internal
	// complete-scan loop, so a producer-side row inserted mid-scan can never
	// shift an already-fetched page (see ListByLessonSince's godoc on
	// the output port for the full mechanism). afterID == "" starts from
	// the top; a non-empty afterID resumes strictly after that (created_at,
	// id) cursor. Not part of the general REST/HTMX listing surface.
	ListByLessonSince(ctx context.Context, refID string, afterCreatedAt time.Time, afterID string, limit int) ([]*ProgressResponse, error)
	Update(ctx context.Context, cmd UpdateProgressCommand) (*ProgressResponse, error)
	Delete(ctx context.Context, cmd DeleteProgressCommand) error
}
