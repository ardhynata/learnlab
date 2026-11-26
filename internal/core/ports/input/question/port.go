package questionport

import (
	"context"
	"time"
)

// QuestionService is the inbound port describing the Question use-cases.
// Implementations live in internal/core/service/question.
type QuestionService interface {
	Create(ctx context.Context, cmd CreateQuestionCommand) (*QuestionResponse, error)
	GetByID(ctx context.Context, q GetQuestionByIDQuery) (*QuestionResponse, error)
	List(ctx context.Context, q ListQuestionQuery) ([]*QuestionResponse, error)
	ListByLesson(ctx context.Context, q ListQuestionByLessonQuery) ([]*QuestionResponse, error)
	// CountByLesson returns the total number of question rows whose
	// LessonID equals LessonID, ignoring limit/offset. The
	// listByLesson REST handler uses this to populate the `total` field in
	// the {data, total} envelope with the true dataset-wide count rather than
	// the page size (#2202).
	CountByLesson(ctx context.Context, q ListQuestionByLessonQuery) (int, error)
	// ListByLessonSince is the keyset-paginated sibling of
	// ListByLesson (#4237): the gRPC ListByLessonSince RPC handler
	// calls this for a cross-service `derive:` rollup's internal
	// complete-scan loop, so a producer-side row inserted mid-scan can never
	// shift an already-fetched page (see ListByLessonSince's godoc on
	// the output port for the full mechanism). afterID == "" starts from
	// the top; a non-empty afterID resumes strictly after that (created_at,
	// id) cursor. Not part of the general REST/HTMX listing surface.
	ListByLessonSince(ctx context.Context, refID string, afterCreatedAt time.Time, afterID string, limit int) ([]*QuestionResponse, error)
	Options(ctx context.Context, q QuestionOptionsQuery) ([]QuestionOption, error)
	Update(ctx context.Context, cmd UpdateQuestionCommand) (*QuestionResponse, error)
	Delete(ctx context.Context, cmd DeleteQuestionCommand) error
}
