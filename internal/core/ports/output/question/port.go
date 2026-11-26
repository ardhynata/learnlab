package questionrepo

import (
	"context"
	"errors"
	"time"

	domain "example.com/learnlab/internal/core/domain/question"
)

// Repository-level sentinels. Adapter implementations return these; the
// service layer translates them into the input-port (use-case) errors.
var (
	ErrNotFound      = errors.New("question repository: not found")
	ErrAlreadyExists = errors.New("question repository: already exists")
)

// QuestionOptionRow is the at-rest projection a `[{id, label}]`
// dropdown source needs (#403 sub-5). Drivers project rows into this
// shape — the service layer maps each row into the inputport's
// `<Entity>Option` for transport.
type QuestionOptionRow struct {
	ID    string
	Label string
}

// QuestionRepository is the outbound port for persisting/fetching Question aggregates.
// Implementations live in internal/adapter/outbound/question.
type QuestionRepository interface {
	Save(ctx context.Context, e *domain.Question) error
	// FindByID is emitted when GetByID OR Update is requested: the
	// GetByID use-case reads through it AND the service's Update branch
	// loads the aggregate via s.repo.FindByID before applying the
	// mutation. Gating on GetByID alone (the pre-#1120 behavior) made
	// any Update-without-GetByID spec uncompilable.
	FindByID(ctx context.Context, id string) (*domain.Question, error)
	List(ctx context.Context, limit, offset int) ([]*domain.Question, error)
	// ListFiltered is auto-emitted when filter.searchable is set AND a
	// filter field named "search" or "q" is declared (#1300), OR when the
	// entity has at least one enum-equality filter (UX-B enum dropdowns).
	// Implementations must apply a substring match (ILIKE / LIKE) on the
	// spec's searchable columns for the given search string. The caller (service.List) routes here when the query's
	// search param is non-empty; falls
	// back to List otherwise.
	ListFiltered(ctx context.Context, search string, limit, offset int) ([]*domain.Question, error)
	// ListByLesson returns Question rows whose LessonID equals refID,
	// honoring the standard limit/offset paging. Auto-emitted from the
	// `ref: Lesson` field declaration on this entity (#403 sub-3) so
	// consumers don't fall back to `List(limit=1000)+filter`.
	ListByLesson(ctx context.Context, refID string, limit, offset int) ([]*domain.Question, error)
	// CountByLesson returns the total number of question rows whose
	// LessonID equals refID, without limit/offset. Used by the REST handler
	// to populate the `total` field in the {data, total} envelope with the
	// true dataset-wide count (#2202).
	CountByLesson(ctx context.Context, refID string) (int, error)
	// ListByLessonSince returns up to limit Question rows whose
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
	ListByLessonSince(ctx context.Context, refID string, afterCreatedAt time.Time, afterID string, limit int) ([]*domain.Question, error)
	// ListOptions returns up to 1000 rows for use by `<select>`-style
	// dropdown population (#403 sub-5). Auto-emitted when the spec
	// declares `display_field:`.
	ListOptions(ctx context.Context) ([]QuestionOptionRow, error)
	Update(ctx context.Context, e *domain.Question) error
	Delete(ctx context.Context, id string) error
}

// QuestionOptionsFilter narrows an options listing at the store (#5078).
// Both fields are applied BEFORE the store's 1000-row LIMIT, so a row past
// the first 1000 labels is reachable by text or by id. A zero filter selects
// every row, like ListOptions.
type QuestionOptionsFilter struct {
	// Search keeps rows whose label contains the text, case-insensitively.
	// The text is a literal substring: %, _, backslash and quote characters
	// are matched as themselves, never as pattern syntax. Empty = no filter.
	// The service strips NUL bytes and invalid UTF-8 and cuts the text to 200
	// runes first (PostgreSQL and MongoDB reject a NUL; SQLite's LIKE and
	// MongoDB's regex refuse a very long pattern); a store called directly
	// must be handed text that is already clean.
	Search string
	// IDs keeps only rows with one of these ids. The service de-duplicates
	// the list and then caps it at 1000 (the page size) before it reaches a
	// store, so a store may assume a distinct, bounded list. Empty = NO
	// filter, not "match nothing": a caller with no ids must skip the call.
	IDs []string
}

// QuestionOptionsSearcher is the OPTIONAL options-search capability of an
// output adapter (#5078). It is a separate interface — NOT a method of
// QuestionRepository — so a hand-written or frozen adapter that predates it
// still satisfies the port: the service asserts this interface at call time
// and, when the adapter lacks it, degrades to the windowed ListOptions rows
// filtered in memory (the pre-#5078 behaviour). Every generated store
// (memory, sqlite, postgresql, mysql, mongodb) implements it; adding
// SearchOptions to a hand-written adapter opts it in.
type QuestionOptionsSearcher interface {
	SearchOptions(ctx context.Context, f QuestionOptionsFilter) ([]QuestionOptionRow, error)
}
