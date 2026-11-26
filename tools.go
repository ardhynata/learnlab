//go:build tools

// Package tools pins build-time tool dependencies via blank imports so
// `go mod tidy` keeps them in go.mod / go.sum even though no runtime code
// imports them. The `tools` build tag excludes this file from regular
// compilation — it exists purely to anchor module versions.
//
// Why this matters: the `make migrate-*` targets shell out to a versioned
// migration binary (`go run <module>@<version>`) and we want the version
// to come from go.mod (one source of truth) instead of being hard-coded
// in the Makefile. Without a blank import here, `go mod tidy` would prune
// the migration library as unused.
//
// Pattern documented in https://go.dev/wiki/Modules#how-can-i-track-tool-dependencies-for-a-module.
package tools

import (
	// Pinning the goose LIBRARY (not the CLI command). Rationale: the CLI
	// imports drivers for ten databases (clickhouse, vertica, mssql, ydb,
	// turso, …) — pinning that whole graph would balloon go.mod/go.sum
	// with dependencies this project never uses.
	//
	// The Makefile's migrate-* targets use the versioned form
	// `go run github.com/pressly/goose/v3/cmd/goose@<version>`, which
	// resolves CLI deps in an isolated module cache without polluting
	// this project's module graph. The version in the Makefile MUST match
	// the version pinned here so `go mod tidy` and the CLI agree.
	_ "github.com/pressly/goose/v3"
)
