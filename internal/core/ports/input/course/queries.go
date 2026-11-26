package courseport

type GetCourseByIDQuery struct {
	ID string
}
type ListCourseQuery struct {
	Limit  int
	Offset int
	Level  string
	Search string
}

// ListCourseByPathQuery carries the per-Path listing
// parameters (#403 sub-3). The PathID is path-bound on the REST
// route GET .../courses/by-path/{id};
// limit / offset come from the same `?limit=&offset=` query string the
// plain List query reads.
type ListCourseByPathQuery struct {
	PathID string
	Limit  int
	Offset int
}

// CourseOptionsQuery is the parameter shape for the auto-emitted
// `[{id, label}]` Options endpoint (#403 sub-5).
// The unfiltered query returns up to 1000 rows ordered by label; Search and
// IDs narrow it.
type CourseOptionsQuery struct {
	// Search narrows the listing to rows whose label CONTAINS this text
	// (case-insensitive, verbatim: the caller trims, and %, _ and quotes are
	// literal characters, never patterns). The store applies it BEFORE its
	// 1000-row LIMIT, so a match outside the first 1000 labels is still found
	// (#5078). Empty means no text filter. The service strips NUL bytes and
	// invalid UTF-8 and cuts the text to 200 runes before it reaches a store.
	Search string
	// IDs narrows the listing to exactly these rows (the by-id lookup the
	// list handler uses to label a page's references past the first 1000
	// rows, #5078). It composes with Search (both must match). Empty means NO
	// id filter, not "match nothing": a caller that has no ids to look up must
	// skip the call, or it receives the unfiltered listing. The service
	// de-duplicates the ids and then caps them at 1000, like the row limit.
	IDs []string
}

// CourseOption is one entry on the Options response. The label
// is sourced from the spec's `display_field:` (#403 sub-5).
type CourseOption struct {
	ID    string `json:"id"`
	Label string `json:"label"`
}
