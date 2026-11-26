//go:build tools

// tools_test.go runs only under `-tags tools` (matching the build tag
// on tools.go itself, so the two files compile in the same unit). The
// test parses tools.go from disk and asserts the documented blank
// imports are present — pinning the migration-library pinning contract
// that `make migrate-*` relies on. Without the matching build tag this
// file is silently dropped from default `go test` runs; that's fine —
// the version invariant is exercised when we explicitly opt in.
package tools

import (
	"go/parser"
	"go/token"
	"testing"
)

// TestToolsImportsMigrationLibrary pins the contract documented in
// tools.go: a blank import of the project's migration library anchors
// the version in go.mod so the Makefile's `migrate-*` `go run …@<ver>`
// invocations resolve against the project's pinned version. SQL
// projects pin pressly/goose; mongodb projects pin
// golang-migrate/migrate (and its mongodb driver, which registers the
// mongo:// scheme handler).
func TestToolsImportsMigrationLibrary(t *testing.T) {
	fset := token.NewFileSet()
	f, err := parser.ParseFile(fset, "tools.go", nil, parser.ImportsOnly)
	if err != nil {
		t.Fatalf("parse tools.go: %v", err)
	}
	wants := []string{
		`"github.com/pressly/goose/v3"`,
	}
	have := map[string]bool{}
	for _, imp := range f.Imports {
		if imp.Name == nil || imp.Name.Name != "_" {
			continue
		}
		have[imp.Path.Value] = true
	}
	for _, want := range wants {
		if !have[want] {
			t.Errorf("tools.go missing blank import of %s; migration-version pin would drift on `go mod tidy`", want)
		}
	}
}
