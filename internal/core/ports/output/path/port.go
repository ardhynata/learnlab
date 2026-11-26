package pathrepo

import (
	"context"
	"errors"

	domain "example.com/learnlab/internal/core/domain/path"
)

// Repository-level sentinels. Adapter implementations return these; the
// service layer translates them into the input-port (use-case) errors.
var (
	ErrNotFound      = errors.New("path repository: not found")
	ErrAlreadyExists = errors.New("path repository: already exists")
)

// PathOptionRow is the at-rest projection a `[{id, label}]`
// dropdown source needs (#403 sub-5). Drivers project rows into this
// shape — the service layer maps each row into the inputport's
// `<Entity>Option` for transport.
type PathOptionRow struct {
	ID    string
	Label string
}

// PathRepository is the outbound port for persisting/fetching Path aggregates.
// Implementations live in internal/adapter/outbound/path.
type PathRepository interface {
	Save(ctx context.Context, e *domain.Path) error
	// FindByID is emitted when GetByID OR Update is requested: the
	// GetByID use-case reads through it AND the service's Update branch
	// loads the aggregate via s.repo.FindByID before applying the
	// mutation. Gating on GetByID alone (the pre-#1120 behavior) made
	// any Update-without-GetByID spec uncompilable.
	FindByID(ctx context.Context, id string) (*domain.Path, error)
	List(ctx context.Context, limit, offset int) ([]*domain.Path, error)
	// ListFiltered is auto-emitted when filter.searchable is set AND a
	// filter field named "search" or "q" is declared (#1300), OR when the
	// entity has at least one enum-equality filter (UX-B enum dropdowns).
	// Implementations must apply a substring match (ILIKE / LIKE) on the
	// spec's searchable columns for the given search string AND an equality
	// match on each enumFilters[<col>] entry whose value is non-empty (the two
	// AND-compose). The caller (service.List) routes here when the query's
	// search param is non-empty or any enum filter is active; falls
	// back to List otherwise.
	ListFiltered(ctx context.Context, search string, enumFilters map[string]string, limit, offset int) ([]*domain.Path, error)
	// ListOptions returns up to 1000 rows for use by `<select>`-style
	// dropdown population (#403 sub-5). Auto-emitted when the spec
	// declares `display_field:`.
	ListOptions(ctx context.Context) ([]PathOptionRow, error)
	Update(ctx context.Context, e *domain.Path) error
	Delete(ctx context.Context, id string) error
}

// PathOptionsFilter narrows an options listing at the store (#5078).
// Both fields are applied BEFORE the store's 1000-row LIMIT, so a row past
// the first 1000 labels is reachable by text or by id. A zero filter selects
// every row, like ListOptions.
type PathOptionsFilter struct {
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

// PathOptionsSearcher is the OPTIONAL options-search capability of an
// output adapter (#5078). It is a separate interface — NOT a method of
// PathRepository — so a hand-written or frozen adapter that predates it
// still satisfies the port: the service asserts this interface at call time
// and, when the adapter lacks it, degrades to the windowed ListOptions rows
// filtered in memory (the pre-#5078 behaviour). Every generated store
// (memory, sqlite, postgresql, mysql, mongodb) implements it; adding
// SearchOptions to a hand-written adapter opts it in.
type PathOptionsSearcher interface {
	SearchOptions(ctx context.Context, f PathOptionsFilter) ([]PathOptionRow, error)
}
