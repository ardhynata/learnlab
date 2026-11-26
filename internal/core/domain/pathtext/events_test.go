package pathtext

import "testing"

// PathText declares no events, so events.go emits only the
// DomainEvent interface itself. The placeholder test keeps the file
// syntactically valid; add real event-shape tests when you declare
// events in the spec.
func TestEvents_NoneDeclared(t *testing.T) {
	t.Skip("no events declared for PathText")
}
