package lessontextport

import "testing"

// TestGetLessonTextByIDQueryShape pins the field set of the
// GetByID query. The handler binds the path-segment into ID; a regen
// that renamed the field would silently break that binding.
func TestGetLessonTextByIDQueryShape(t *testing.T) {
	q := GetLessonTextByIDQuery{ID: "abc"}
	if q.ID != "abc" {
		t.Errorf("ID round-trip mismatch: got %q, want %q", q.ID, "abc")
	}
}

// TestListLessonTextQueryShape pins the pagination fields. The
// handler binds query-string ?limit=&offset= into these; renaming or
// retyping silently would break the wire contract.
func TestListLessonTextQueryShape(t *testing.T) {
	q := ListLessonTextQuery{Limit: 10, Offset: 20}
	if q.Limit != 10 || q.Offset != 20 {
		t.Errorf("query field round-trip mismatch: %+v", q)
	}
}
