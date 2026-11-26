package progressrepo

import (
	"context"
	"errors"
	"time"

	domain "example.com/learnlab/internal/core/domain/progress"
)

// Repository-level sentinels. Adapter implementations return these; the
// service layer translates them into the input-port (use-case) errors.
var (
	ErrNotFound      = errors.New("progress repository: not found")
	ErrAlreadyExists = errors.New("progress repository: already exists")
)

// ProgressRepository is the outbound port for persisting/fetching Progress aggregates.
// Implementations live in internal/adapter/outbound/progress.
type ProgressRepository interface {
	Save(ctx context.Context, e *domain.Progress) error
	// FindByID is emitted when GetByID OR Update is requested: the
	// GetByID use-case reads through it AND the service's Update branch
	// loads the aggregate via s.repo.FindByID before applying the
	// mutation. Gating on GetByID alone (the pre-#1120 behavior) made
	// any Update-without-GetByID spec uncompilable.
	FindByID(ctx context.Context, id string) (*domain.Progress, error)
	List(ctx context.Context, limit, offset int) ([]*domain.Progress, error)
	// ListByLearner returns Progress rows whose LearnerID equals refID,
	// honoring the standard limit/offset paging. Auto-emitted from the
	// `ref: Learner` field declaration on this entity (#403 sub-3) so
	// consumers don't fall back to `List(limit=1000)+filter`.
	ListByLearner(ctx context.Context, refID string, limit, offset int) ([]*domain.Progress, error)
	// CountByLearner returns the total number of progress rows whose
	// LearnerID equals refID, without limit/offset. Used by the REST handler
	// to populate the `total` field in the {data, total} envelope with the
	// true dataset-wide count (#2202).
	CountByLearner(ctx context.Context, refID string) (int, error)
	// ListByLearnerSince returns up to limit Progress rows whose
	// LearnerID equals refID, ordered created_at DESC, id ASC (the
	// SAME order ListByLearner applies), KEYSET-paginated instead of
	// offset-paginated: when afterID is non-empty, only rows strictly AFTER
	// the (afterCreatedAt, afterID) cursor in that order are returned; an
	// empty afterID starts from the top.
	//
	// This is the derive-rows-reader's internal complete-rollup scan
	// surface (#4237) — NOT part of the general REST/gRPC/HTMX
	// limit/offset listing surface, which keeps its numbered-page UX
	// unchanged. An OFFSET-paged loop pages by POSITION: a row inserted
	// mid-scan shifts every later row's offset by +1, so the next page
	// re-reads the previous page's last row (a duplicate) while the new
	// row — now at position 0 — is never covered by any page (a silent
	// skip), with no error. A keyset cursor pages by VALUE instead of
	// position: a row concurrently inserted after the scan begins always
	// sorts ABOVE (newer created_at, or equal created_at with a
	// tie-broken id) any cursor the scan has already advanced past, so it
	// can never re-enter an already-fetched page or open a position gap —
	// no long-lived transaction or snapshot isolation level required.
	ListByLearnerSince(ctx context.Context, refID string, afterCreatedAt time.Time, afterID string, limit int) ([]*domain.Progress, error)
	// ListByLesson returns Progress rows whose LessonID equals refID,
	// honoring the standard limit/offset paging. Auto-emitted from the
	// `ref: Lesson` field declaration on this entity (#403 sub-3) so
	// consumers don't fall back to `List(limit=1000)+filter`.
	ListByLesson(ctx context.Context, refID string, limit, offset int) ([]*domain.Progress, error)
	// CountByLesson returns the total number of progress rows whose
	// LessonID equals refID, without limit/offset. Used by the REST handler
	// to populate the `total` field in the {data, total} envelope with the
	// true dataset-wide count (#2202).
	CountByLesson(ctx context.Context, refID string) (int, error)
	// ListByLessonSince returns up to limit Progress rows whose
	// LessonID equals refID, ordered created_at DESC, id ASC (the
	// SAME order ListByLesson applies), KEYSET-paginated instead of
	// offset-paginated: when afterID is non-empty, only rows strictly AFTER
	// the (afterCreatedAt, afterID) cursor in that order are returned; an
	// empty afterID starts from the top.
	//
	// This is the derive-rows-reader's internal complete-rollup scan
	// surface (#4237) — NOT part of the general REST/gRPC/HTMX
	// limit/offset listing surface, which keeps its numbered-page UX
	// unchanged. An OFFSET-paged loop pages by POSITION: a row inserted
	// mid-scan shifts every later row's offset by +1, so the next page
	// re-reads the previous page's last row (a duplicate) while the new
	// row — now at position 0 — is never covered by any page (a silent
	// skip), with no error. A keyset cursor pages by VALUE instead of
	// position: a row concurrently inserted after the scan begins always
	// sorts ABOVE (newer created_at, or equal created_at with a
	// tie-broken id) any cursor the scan has already advanced past, so it
	// can never re-enter an already-fetched page or open a position gap —
	// no long-lived transaction or snapshot isolation level required.
	ListByLessonSince(ctx context.Context, refID string, afterCreatedAt time.Time, afterID string, limit int) ([]*domain.Progress, error)
	Update(ctx context.Context, e *domain.Progress) error
	Delete(ctx context.Context, id string) error
}
