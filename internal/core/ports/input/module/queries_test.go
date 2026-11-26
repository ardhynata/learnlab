package moduleport

import "testing"

// TestGetModuleByIDQueryShape pins the field set of the
// GetByID query. The handler binds the path-segment into ID; a regen
// that renamed the field would silently break that binding.
func TestGetModuleByIDQueryShape(t *testing.T) {
	q := GetModuleByIDQuery{ID: "abc"}
	if q.ID != "abc" {
		t.Errorf("ID round-trip mismatch: got %q, want %q", q.ID, "abc")
	}
}

// TestListModuleQueryShape pins the pagination fields. The
// handler binds query-string ?limit=&offset= into these; renaming or
// retyping silently would break the wire contract.
func TestListModuleQueryShape(t *testing.T) {
	q := ListModuleQuery{Limit: 10, Offset: 20}
	if q.Limit != 10 || q.Offset != 20 {
		t.Errorf("query field round-trip mismatch: %+v", q)
	}
}
