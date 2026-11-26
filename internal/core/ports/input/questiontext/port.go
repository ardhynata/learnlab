package questiontextport

import (
	"context"
	"time"
)

// QuestionTextService is the inbound port describing the QuestionText use-cases.
// Implementations live in internal/core/service/questiontext.
type QuestionTextService interface {
	Create(ctx context.Context, cmd CreateQuestionTextCommand) (*QuestionTextResponse, error)
	GetByID(ctx context.Context, q GetQuestionTextByIDQuery) (*QuestionTextResponse, error)
	List(ctx context.Context, q ListQuestionTextQuery) ([]*QuestionTextResponse, error)
	ListByLesson(ctx context.Context, q ListQuestionTextByLessonQuery) ([]*QuestionTextResponse, error)
	// CountByLesson returns the total number of questiontext rows whose
	// LessonID equals LessonID, ignoring limit/offset. The
	// listByLesson REST handler uses this to populate the `total` field in
	// the {data, total} envelope with the true dataset-wide count rather than
	// the page size (#2202).
	CountByLesson(ctx context.Context, q ListQuestionTextByLessonQuery) (int, error)
	// ListByLessonSince is the keyset-paginated sibling of
	// ListByLesson (#4237): the gRPC ListByLessonSince RPC handler
	// calls this for a cross-service `derive:` rollup's internal
	// complete-scan loop, so a producer-side row inserted mid-scan can never
	// shift an already-fetched page (see ListByLessonSince's godoc on
	// the output port for the full mechanism). afterID == "" starts from
	// the top; a non-empty afterID resumes strictly after that (created_at,
	// id) cursor. Not part of the general REST/HTMX listing surface.
	ListByLessonSince(ctx context.Context, refID string, afterCreatedAt time.Time, afterID string, limit int) ([]*QuestionTextResponse, error)
	Options(ctx context.Context, q QuestionTextOptionsQuery) ([]QuestionTextOption, error)
	Update(ctx context.Context, cmd UpdateQuestionTextCommand) (*QuestionTextResponse, error)
	Delete(ctx context.Context, cmd DeleteQuestionTextCommand) error
}
