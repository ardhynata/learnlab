// PostgreSQL outbound-adapter tests.
//
// Tests in this file:
//
//   - TestNewRepository_RejectsNilPool        — constructor nil-guard (always runs)
//   - TestClassifyWriteError_PgError          — every mapped SQLSTATE on a real *pgconn.PgError → its errcat category; unmapped stays Internal (always runs, #4972)
//   - TestClassifyReadError_DataErrors        — a class-22 data exception on a READ (NUL in an id / search term) → 400; ErrNoRows and server faults unchanged (always runs, #5451)
//   - TestClassifyWriteError_PgxEncodeRefusal — pgx's client-side out-of-range encode refusal → 400 naming the column (always runs, #4972)
//   - TestNewRepository_SchemaInit            — idempotent CREATE TABLE (DSN-gated)
//   - TestRepository_RoundTrip                — Save → FindByID (DSN-gated)
//   - TestRepository_List                     — List returns saved rows (DSN-gated)
//   - TestRepository_Update                   — Update mutates a saved row (DSN-gated)
//   - TestRepository_Update_NotFound          — Update with missing id → ErrNotFound (DSN-gated, #2099)
//   - TestRepository_Update_UniqueViolation   — Update onto another row's unique value → ErrAlreadyExists, on any unique index (DSN-gated, #4972)
//   - TestRepository_Delete                   — Delete removes a row (DSN-gated)
//   - TestRepository_DuplicateKey             — Save twice → ErrAlreadyExists (DSN-gated)
//   - TestRepository_FindByID_NotFound        — miss → ErrNotFound (DSN-gated)
//   - TestRepository_EncryptedRoundTrip       — encrypted Save → FindByID (DSN-gated, HasEncryptedFields)
//   - TestRepository_EncryptedDuplicateKey    — encrypted duplicate key (DSN-gated, HasEncryptedFields)
//   - TestRepository_EncryptedFindByID_NotFound — encrypted miss → ErrNotFound (DSN-gated, HasEncryptedFields)
//   - TestRepository_ListFiltered             — ListFiltered returns matching rows (DSN-gated, HasSearchFilterField)
//
// The schema-init and CRUD tests require a real Postgres instance. Set
// POSTGRESQL_TEST_DSN to a DSN pointing at a clean test schema and these
// tests will run; when the env var is unset (the common case in unit-test
// runs) they skip cleanly. CI sets this via the postgres service container.
// DSN format: "postgres://user:pass@localhost:5432/testdb?sslmode=disable"
//
// All tests use domain.LoadPath fixtures that bypass validation
// so the test bodies stay cheap regardless of how spec invariants evolve.
package pathpostgresql

import (
	"context"
	"errors"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/inxpired/hexago/runtime/errcat"
	"github.com/inxpired/hexago/runtime/sqlerr"

	domain "example.com/learnlab/internal/core/domain/path"
	outputport "example.com/learnlab/internal/core/ports/output/path"
)

// Compile-time assertion: Repository must satisfy the outbound port.
// Mirrors the production assertion already in repository.go but kept
// here so the test file alone fails fast when the port surface drifts.
var _ outputport.PathRepository = (*Repository)(nil)

// TestClassifyWriteError_PgError pins #4972 against the REAL *pgconn.PgError:
// every data / constraint SQLSTATE a client value can provoke classifies to
// its 4xx errcat category (a delete of a still-referenced row to 409), with
// a client-safe message that names the column when Postgres reported one and
// never carries the driver's text; the PgError stays reachable through
// errors.As. An SQLSTATE outside the table — the unique violation Save maps
// to ErrAlreadyExists itself included — comes back unchanged (Internal, 500).
// Runs without a database.
func TestClassifyWriteError_PgError(t *testing.T) {
	cases := []struct {
		name    string
		pgErr   *pgconn.PgError
		op      sqlerr.Op
		want    errcat.Category
		wantMsg string // "" = must come back unchanged
	}{
		{"22003 numeric_value_out_of_range", &pgconn.PgError{Code: "22003"}, sqlerr.Write, errcat.BadRequest, "field value out of range"},
		{"22001 string_data_right_truncation", &pgconn.PgError{Code: "22001"}, sqlerr.Write, errcat.BadRequest, "field value too long"},
		{"22007 invalid_datetime_format", &pgconn.PgError{Code: "22007"}, sqlerr.Write, errcat.BadRequest, "invalid field value"},
		{"22008 datetime_field_overflow", &pgconn.PgError{Code: "22008"}, sqlerr.Write, errcat.BadRequest, "invalid field value"},
		{"22P02 invalid_text_representation", &pgconn.PgError{Code: "22P02"}, sqlerr.Write, errcat.BadRequest, "invalid field value"},
		{"23502 not_null_violation", &pgconn.PgError{Code: "23502", ColumnName: "some_field"}, sqlerr.Write, errcat.BadRequest, "required field missing: some_field"},
		{"23514 check_violation", &pgconn.PgError{Code: "23514", ConstraintName: "t_ck_check"}, sqlerr.Write, errcat.BadRequest, "field value violates a check constraint"},
		{"23503 foreign_key_violation on write", &pgconn.PgError{Code: "23503", Detail: `Key (parent_id)=(p-9) is not present in table "parent".`}, sqlerr.Write, errcat.BadRequest, "invalid reference: parent_id"},
		{"23503 foreign_key_violation on delete", &pgconn.PgError{Code: "23503", Detail: `Key (id)=(p-9) is still referenced from table "child".`}, sqlerr.Delete, errcat.Conflict, "record is still referenced"},
		{"23505 unique_violation stays unclassified", &pgconn.PgError{Code: "23505"}, sqlerr.Write, errcat.Internal, ""},
		{"42601 syntax_error stays Internal", &pgconn.PgError{Code: "42601"}, sqlerr.Write, errcat.Internal, ""},
		{"40001 serialization_failure stays Internal", &pgconn.PgError{Code: "40001"}, sqlerr.Write, errcat.Internal, ""},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			tc.pgErr.Message = `value "3000000000" is out of range for type integer`
			got := classifyWriteError(tc.pgErr, tc.op, nil)
			if c := errcat.CategoryOf(got); c != tc.want {
				t.Fatalf("errcat.CategoryOf = %v, want %v (got %q)", c, tc.want, got)
			}
			var classified *sqlerr.Error
			if tc.wantMsg == "" {
				if errors.As(got, &classified) || !errors.Is(got, tc.pgErr) || got.Error() != tc.pgErr.Error() {
					t.Fatalf("an unmapped SQLSTATE must come back unchanged; got %v", got)
				}
				return
			}
			// The exact message proves it names the column and leaks none of
			// the driver's text (the statement, the value, the SQLSTATE).
			if got.Error() != tc.wantMsg {
				t.Errorf("message = %q, want %q", got.Error(), tc.wantMsg)
			}
			var back *pgconn.PgError
			if !errors.As(got, &classified) || !errors.As(got, &back) || !errors.Is(got, tc.pgErr) {
				t.Errorf("want a *sqlerr.Error that still reaches the original *pgconn.PgError through errors.As / errors.Is")
			}
		})
	}
}

// TestClassifyReadError_DataErrors pins #5451's read half against the REAL
// *pgconn.PgError: a class-22 data exception raised while a QUERY binds the
// caller's value (a NUL byte in an id, a search term or a ref id is 22021)
// classifies to a 400 exactly like the write path, while pgx.ErrNoRows, a
// server fault and a nil error come back unchanged. Runs without a database.
func TestClassifyReadError_DataErrors(t *testing.T) {
	for _, code := range []string{"22021", "22P05", "22P02", "22001"} {
		t.Run(code, func(t *testing.T) {
			pgErr := &pgconn.PgError{Code: code, Message: `invalid byte sequence for encoding "UTF8": 0x00`}
			got := classifyReadError(pgErr)
			if c := errcat.CategoryOf(got); c != errcat.BadRequest {
				t.Fatalf("errcat.CategoryOf = %v, want BadRequest (got %q)", c, got)
			}
			var classified *sqlerr.Error
			var back *pgconn.PgError
			if !errors.As(got, &classified) || !errors.As(got, &back) || !errors.Is(got, pgErr) {
				t.Errorf("want a *sqlerr.Error that still reaches the original *pgconn.PgError")
			}
			if strings.Contains(got.Error(), "0x00") {
				t.Errorf("the message must not carry the driver text: %q", got)
			}
		})
	}
	if err := classifyReadError(nil); err != nil {
		t.Errorf("classifyReadError(nil) = %v, want nil", err)
	}
	for name, in := range map[string]error{
		"no rows":           pgx.ErrNoRows,
		"syntax error":      &pgconn.PgError{Code: "42601"},
		"serialization":     &pgconn.PgError{Code: "40001"},
		"unique violation":  &pgconn.PgError{Code: "23505"},
		"connection failed": errors.New("connection reset"),
	} {
		var classified *sqlerr.Error
		if got := classifyReadError(in); !errors.Is(got, in) || errors.As(got, &classified) {
			t.Errorf("%s: want the error back unclassified, got %v", name, got)
		}
	}
}

// TestClassifyWriteError_PgxEncodeRefusal pins the shape #4972's consumer
// hit: under pgx's default statement-cache mode an int64 bound to an INTEGER
// column never reaches the server — pgx refuses to encode it (no SQLSTATE).
// The refusal is produced by pgx's OWN argument builder against an int4
// parameter, so the test follows whatever error chain this project's pgx
// version builds. The failing args[N] index names the column through
// argColumns; an encode failure that is not a range refusal (an unsupported
// Go type, a server bug) stays Internal — even when the value pgx quotes
// into the error text contains the range phrase. Runs without a database.
func TestClassifyWriteError_PgxEncodeRefusal(t *testing.T) {
	var eqb pgx.ExtendedQueryBuilder
	sd := &pgconn.StatementDescription{ParamOIDs: []uint32{pgtype.TextOID, pgtype.Int4OID}}
	refusal := eqb.Build(pgtype.NewMap(), sd, []any{"id-1", int64(3000000000)})
	if refusal == nil {
		t.Fatal("precondition: pgx must refuse to encode 3000000000 into an int4 parameter")
		return
	}
	got := classifyWriteError(refusal, sqlerr.Write, []string{"id", "some_count"})
	if c := errcat.CategoryOf(got); c != errcat.BadRequest {
		t.Fatalf("errcat.CategoryOf = %v, want BadRequest (got %q)", c, got)
	}
	if got.Error() != "field value out of range: some_count" {
		t.Errorf("message = %q, want %q", got.Error(), "field value out of range: some_count")
	}
	if !errors.Is(got, refusal) {
		t.Errorf("errors.Is must still reach the original pgx error")
	}
	// An unsupported Go type whose quoted value carries the range phrase:
	// pgx's "cannot find encode plan" — a server bug, not a client value.
	type note struct{ Text string }
	notRange := eqb.Build(pgtype.NewMap(), sd, []any{note{Text: "5 is greater than maximum value for int4"}, int64(1)})
	if notRange == nil {
		t.Fatal("precondition: pgx must refuse to encode a struct into a text parameter")
		return
	}
	if got := classifyWriteError(notRange, sqlerr.Write, []string{"id", "some_count"}); errcat.CategoryOf(got) != errcat.Internal || got.Error() != notRange.Error() {
		t.Errorf("a non-range encode failure must come back unchanged; got %v", got)
	}
}

// openTestPool returns a connected *pgxpool.Pool or skips the test.
// POSTGRESQL_TEST_DSN must be a DSN pointing at a clean test schema.
// When the env var is unset the integration tests skip so unit-test
// runs and local dev are unaffected.
func openTestPool(t *testing.T) *pgxpool.Pool {
	t.Helper()
	dsn := os.Getenv("POSTGRESQL_TEST_DSN")
	if dsn == "" {
		t.Skip("POSTGRESQL_TEST_DSN unset — skipping PostgreSQL integration test")
	}
	pool, err := pgxpool.New(context.Background(), dsn)
	if err != nil {
		t.Fatalf("pgxpool.New: %v", err)
	}
	if err := pool.Ping(context.Background()); err != nil {
		t.Fatalf("ping postgres: %v", err)
	}
	t.Cleanup(func() {
		_, _ = pool.Exec(context.Background(), `DROP TABLE IF EXISTS "path"`)
		pool.Close()
	})
	return pool
}

// fixture builds a single Path via LoadPath for the
// CRUD round-trip tests. LoadPath bypasses validation so the
// fixture stays cheap regardless of how the spec's invariants evolve.
// Build IDs differ by suffix so duplicate-key tests can exercise the
// already-exists path without colliding with the happy-path row.
func fixture(id string) *domain.Path {
	return fixtureAt(id, time.Date(2024, 1, 2, 3, 4, 5, 0, time.UTC))
}

// fixtureAt is fixture with a caller-chosen updatedAt. TestRepository_Update
// saves a row at one updatedAt then Updates it to a DIFFERENT one, so the
// post-Update FindByID proves the stored row was actually rewritten — the two
// fixtures differ only in updatedAt (which Update overwrites), letting the test
// distinguish a live update from a stale-read / no-op Update (#3469).
func fixtureAt(id string, updatedAt time.Time) *domain.Path {
	now := time.Date(2024, 1, 2, 3, 4, 5, 0, time.UTC)
	return domain.LoadPath(id, id, "x", "x", "x", int(1), *new([]string), now, updatedAt)
}

// TestNewRepository_RejectsNilPool pins the constructor's nil-guard:
// passing nil *pgxpool.Pool returns an error that names the package,
// instead of returning a half-constructed *Repository whose first call
// panics. Wiring mistakes surface at boot time, not at first-request
// time.
func TestNewRepository_RejectsNilPool(t *testing.T) {
	_, err := NewRepository(nil)
	if err == nil {
		t.Fatal("NewRepository(nil) returned nil error; want non-nil")
	}
}

// TestNewRepository_SchemaInit pins the boot contract: NewRepository
// runs CREATE TABLE IF NOT EXISTS once and returns a working repo. A
// second call against the same DB is a no-op (the IF NOT EXISTS branch).
// It then inspects information_schema.columns: every expected column must
// exist, so a DDL regression that drops or renames a column is caught —
// CREATE TABLE IF NOT EXISTS otherwise succeeds regardless of column shape,
// leaving a boot-returns-nil-error check blind to it (#3471).
func TestNewRepository_SchemaInit(t *testing.T) {
	pool := openTestPool(t)
	if _, err := NewRepository(pool); err != nil {
		t.Fatalf("NewRepository (first): %v", err)
	}
	if _, err := NewRepository(pool); err != nil {
		t.Errorf("NewRepository (second; should be idempotent): %v", err)
	}
	// Inspect the created schema: every expected column must exist.
	colRows, err := pool.Query(context.Background(),
		`SELECT column_name FROM information_schema.columns WHERE table_name = $1`,
		"path")
	if err != nil {
		t.Fatalf("information_schema.columns query: %v", err)
	}
	defer colRows.Close()
	schemaCols := map[string]bool{}
	for colRows.Next() {
		var name string
		if err := colRows.Scan(&name); err != nil {
			t.Fatalf("scan column_name: %v", err)
		}
		schemaCols[name] = true
	}
	if err := colRows.Err(); err != nil {
		t.Fatalf("iterate information_schema.columns: %v", err)
	}
	if !schemaCols["id"] {
		t.Errorf("schema missing column %q", "id")
	}
	if !schemaCols["level"] {
		t.Errorf("schema missing column %q", "level")
	}
	if !schemaCols["position"] {
		t.Errorf("schema missing column %q", "position")
	}
	if !schemaCols["requires"] {
		t.Errorf("schema missing column %q", "requires")
	}
	if !schemaCols["slug"] {
		t.Errorf("schema missing column %q", "slug")
	}
	if !schemaCols["summary"] {
		t.Errorf("schema missing column %q", "summary")
	}
	if !schemaCols["title"] {
		t.Errorf("schema missing column %q", "title")
	}
	if !schemaCols["created_at"] {
		t.Errorf("schema missing column %q", "created_at")
	}
	if !schemaCols["updated_at"] {
		t.Errorf("schema missing column %q", "updated_at")
	}
}

// TestRepository_RoundTrip is the integration smoke: Save → FindByID
// against a real Postgres instance. The returned entity must be non-nil
// and carry the same id that was Saved.
func TestRepository_RoundTrip(t *testing.T) {
	pool := openTestPool(t)
	r, err := NewRepository(pool)
	if err != nil {
		t.Fatalf("NewRepository: %v", err)
	}
	ctx := context.Background()
	want := fixture("rt-1")
	if err := r.Save(ctx, want); err != nil {
		t.Fatalf("Save: %v", err)
	}
	got, err := r.FindByID(ctx, "rt-1")
	if err != nil {
		t.Fatalf("FindByID after Save: %v", err)
	}
	if got == nil {
		t.Fatal("FindByID returned nil entity after Save")
		return
	}
	if got.ID() != "rt-1" {
		t.Errorf("FindByID returned id %q, want rt-1", got.ID())
	}
	// Field-fidelity: every fixture-populated scalar column must survive the
	// Save→FindByID round-trip. Asserting only the ID would let a fromRow
	// mapping regression that drops every non-ID field pass (#3468).
	if got.Slug() != want.Slug() {
		t.Errorf("round-trip slug = %v, want %v", got.Slug(), want.Slug())
	}
	if got.Title() != want.Title() {
		t.Errorf("round-trip title = %v, want %v", got.Title(), want.Title())
	}
	if got.Summary() != want.Summary() {
		t.Errorf("round-trip summary = %v, want %v", got.Summary(), want.Summary())
	}
	if got.Level() != want.Level() {
		t.Errorf("round-trip level = %v, want %v", got.Level(), want.Level())
	}
	if got.Position() != want.Position() {
		t.Errorf("round-trip position = %v, want %v", got.Position(), want.Position())
	}
}

// TestRepository_DuplicateKey pins the SQLSTATE-23505-→ErrAlreadyExists
// mapping. Saving a second entity with the same ID must surface
// outputport.ErrAlreadyExists so the service layer can return HTTP 409
// instead of an opaque internal error.
func TestRepository_DuplicateKey(t *testing.T) {
	pool := openTestPool(t)
	r, err := NewRepository(pool)
	if err != nil {
		t.Fatalf("NewRepository: %v", err)
	}
	ctx := context.Background()
	if err := r.Save(ctx, fixture("dup-1")); err != nil {
		t.Fatalf("first Save: %v", err)
	}
	err = r.Save(ctx, fixture("dup-1"))
	if !errors.Is(err, outputport.ErrAlreadyExists) {
		t.Errorf("second Save err = %v, want errors.Is ErrAlreadyExists", err)
	}
}

// TestRepository_FindByID_NotFound pins the not-found sentinel identity.
// The service layer routes outputport.ErrNotFound into the input-port
// ErrPathNotFound that the transport maps to HTTP 404; a bare
// errors.New replacement would silently break that mapping.
func TestRepository_FindByID_NotFound(t *testing.T) {
	pool := openTestPool(t)
	r, err := NewRepository(pool)
	if err != nil {
		t.Fatalf("NewRepository: %v", err)
	}
	_, err = r.FindByID(context.Background(), "missing")
	if !errors.Is(err, outputport.ErrNotFound) {
		t.Errorf("FindByID(missing) err = %v, want errors.Is ErrNotFound", err)
	}
}

// TestRepository_List pins the basic List contract: after saving N entities,
// List(ctx, 0, 0) returns all N rows newest-first (created_at DESC with the
// id tiebreak — W4). This is the minimum viable List smoke — it does not
// exercise LIMIT/OFFSET because the row count is small; edge-case pagination
// is out of v1 test scope.
func TestRepository_List(t *testing.T) {
	pool := openTestPool(t)
	r, err := NewRepository(pool)
	if err != nil {
		t.Fatalf("NewRepository: %v", err)
	}
	ctx := context.Background()
	// Save list-b FIRST, then list-a: list-a is the newer row AND the smaller
	// id, so it ranks first under created_at DESC whether or not the two
	// timestamps tie (the id tiebreak breaks a coarse-clock tie the same way).
	for _, id := range []string{"list-b", "list-a"} {
		if err := r.Save(ctx, fixture(id)); err != nil {
			t.Fatalf("Save(%s): %v", id, err)
		}
	}
	rows, err := r.List(ctx, 0, 0)
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if len(rows) < 2 {
		t.Fatalf("List returned %d rows, want at least 2", len(rows))
	}
	// Verify the two saved IDs appear in the results.
	ids := make(map[string]bool, len(rows))
	for _, e := range rows {
		ids[e.ID()] = true
	}
	for _, want := range []string{"list-a", "list-b"} {
		if !ids[want] {
			t.Errorf("List result missing id %q", want)
		}
	}
	// W4 newest-first contract: list-a was saved AFTER list-b, so it must
	// precede list-b under created_at DESC; on a created_at tie (coarse
	// clock) the ascending-id tiebreak ranks "list-a" first too, so the
	// relative order is deterministic either way.
	posA, posB := -1, -1
	for i, e := range rows {
		switch e.ID() {
		case "list-a":
			posA = i
		case "list-b":
			posB = i
		}
	}
	if posA > posB {
		t.Errorf("List order: want newest-first (list-a before list-b), got a=%d b=%d", posA, posB)
	}
}

// TestRepository_Update pins the Update contract: after an Update, FindByID
// returns the UPDATED row, not the stale original. The saved and updated
// fixtures differ in updated_at (which Update overwrites), so the post-Update
// read must observe the new value — a no-op Update or a stale read would
// return the original timestamp and fail here. Asserting only the ID, as the
// previous version did, let that whole bug class pass because it reused a
// byte-identical fixture for Save and Update (#3469).
func TestRepository_Update(t *testing.T) {
	pool := openTestPool(t)
	r, err := NewRepository(pool)
	if err != nil {
		t.Fatalf("NewRepository: %v", err)
	}
	ctx := context.Background()
	original := fixture("upd-1")
	if err := r.Save(ctx, original); err != nil {
		t.Fatalf("Save: %v", err)
	}
	// Update the same id with a DIFFERENT updated_at so a real write is
	// distinguishable from a stale read.
	updated := fixtureAt("upd-1", time.Date(2025, 6, 15, 12, 30, 0, 0, time.UTC))
	if err := r.Update(ctx, updated); err != nil {
		t.Fatalf("Update: %v", err)
	}
	got, err := r.FindByID(ctx, "upd-1")
	if err != nil {
		t.Fatalf("FindByID after Update: %v", err)
	}
	if got == nil {
		t.Fatal("FindByID returned nil after Update")
		return
	}
	if got.ID() != "upd-1" {
		t.Errorf("post-Update id = %q, want upd-1", got.ID())
	}
	if got.UpdatedAt().Equal(original.UpdatedAt()) {
		t.Errorf("post-Update updated_at = %v is the STALE original; Update did not take effect (#3469)", got.UpdatedAt())
	}
	if !got.UpdatedAt().Equal(updated.UpdatedAt()) {
		t.Errorf("post-Update updated_at = %v, want %v (the updated value must be persisted and read back)", got.UpdatedAt(), updated.UpdatedAt())
	}
}

// TestRepository_Update_NotFound pins the ErrNotFound contract for Update
// (#2099): updating a row whose id does not exist must return
// outputport.ErrNotFound, not nil. Before the fix, the generated Update
// discarded RowsAffected and silently returned nil on a 0-row UPDATE —
// masking missing-id writes at the service layer.
func TestRepository_Update_NotFound(t *testing.T) {
	pool := openTestPool(t)
	r, err := NewRepository(pool)
	if err != nil {
		t.Fatalf("NewRepository: %v", err)
	}
	err = r.Update(context.Background(), fixture("upd-missing"))
	if !errors.Is(err, outputport.ErrNotFound) {
		t.Errorf("Update(missing id) err = %v, want errors.Is ErrNotFound (#2099)", err)
	}
}

// TestRepository_Update_UniqueViolation pins #4972: an Update whose new
// values a UNIQUE index refuses (SQLSTATE 23505) returns
// outputport.ErrAlreadyExists — the conflict Save reports, which the service
// maps to a 409 — whatever declared the index: a `unique: true` field, a
// slug / sequence column, or a hand-written schema. (Only a spec with a
// unique REF used to map it; every other unique index surfaced the raw
// driver error, a 500.) A scratch UNIQUE index on updated_at stands in for
// any of them: Update rewrites updated_at from the entity, so moving the
// second row onto the first row's value is a collision on every spec shape.
func TestRepository_Update_UniqueViolation(t *testing.T) {
	pool := openTestPool(t)
	r, err := NewRepository(pool)
	if err != nil {
		t.Fatalf("NewRepository: %v", err)
	}
	ctx := context.Background()
	first := fixtureAt("uq-1", time.Date(2024, 1, 2, 3, 4, 5, 0, time.UTC))
	for _, e := range []*domain.Path{first, fixtureAt("uq-2", time.Date(2025, 6, 15, 12, 30, 0, 0, time.UTC))} {
		if err := r.Save(ctx, e); err != nil {
			t.Fatalf("Save(%s): %v", e.ID(), err)
		}
	}
	if _, err := pool.Exec(ctx, `CREATE UNIQUE INDEX "ux_path_update_conflict" ON "path" (updated_at)`); err != nil {
		t.Fatalf("create the scratch unique index: %v", err)
	}
	err = r.Update(ctx, fixtureAt("uq-2", first.UpdatedAt()))
	if !errors.Is(err, outputport.ErrAlreadyExists) {
		t.Errorf("Update onto another row's unique value: err = %v, want errors.Is outputport.ErrAlreadyExists (#4972)", err)
	}
}

// TestRepository_Delete pins the Delete contract.
//
// When delete_strategy: hard (default): a saved entity is gone (ErrNotFound)
// after Delete. When delete_strategy: soft: the entity must still be findable
// by FindByID but have its soft-delete field set to false, and List must
// exclude it (active filter).
func TestRepository_Delete(t *testing.T) {
	pool := openTestPool(t)
	r, err := NewRepository(pool)
	if err != nil {
		t.Fatalf("NewRepository: %v", err)
	}
	ctx := context.Background()
	if err := r.Save(ctx, fixture("del-1")); err != nil {
		t.Fatalf("Save: %v", err)
	}
	if err := r.Delete(ctx, "del-1"); err != nil {
		t.Fatalf("Delete: %v", err)
	}
	_, err = r.FindByID(ctx, "del-1")
	if !errors.Is(err, outputport.ErrNotFound) {
		t.Errorf("FindByID after Delete err = %v, want ErrNotFound", err)
	}
}

// TestRepository_ListFiltered pins the ListFiltered contract (#1313): after
// saving rows, ListFiltered returns only the rows whose searchable columns
// match the query string. Uses ILIKE substring matching on the first
// searchable column so the test works regardless of which columns the
// spec declares as searchable.
func TestRepository_ListFiltered(t *testing.T) {
	pool := openTestPool(t)
	r, err := NewRepository(pool)
	if err != nil {
		t.Fatalf("NewRepository: %v", err)
	}
	ctx := context.Background()
	if err := r.Save(ctx, fixture("lf-1")); err != nil {
		t.Fatalf("Save: %v", err)
	}
	rows, err := r.ListFiltered(ctx, "x", nil, 0, 0)
	if err != nil {
		t.Fatalf("ListFiltered: %v", err)
	}
	if len(rows) < 1 {
		t.Fatalf("ListFiltered returned %d rows, want at least 1", len(rows))
	}
	ids := make(map[string]bool, len(rows))
	for _, e := range rows {
		ids[e.ID()] = true
	}
	if !ids["lf-1"] {
		t.Errorf("ListFiltered result missing id %q", "lf-1")
	}
}

// TestRepository_SearchOptions pins the #5078 options-search port method
// against a real Postgres instance (DSN-gated): SearchOptions narrows the
// options listing by a literal, case-insensitive substring of the label
// and/or a set of ids, in the WHERE clause, before the 1000-row LIMIT.
// Expectations are DERIVED from the unfiltered rows (never hard-coded
// labels), so the test holds for whatever label the spec's display_field
// produces; the metacharacter probes (%, _, backslash, quotes) must match
// only rows that literally contain the text.
func TestRepository_SearchOptions(t *testing.T) {
	pool := openTestPool(t)
	r, err := NewRepository(pool)
	if err != nil {
		t.Fatalf("NewRepository: %v", err)
	}
	ctx := context.Background()
	for _, id := range []string{"so-a", "so-b"} {
		if err := r.Save(ctx, fixture(id)); err != nil {
			t.Fatalf("Save(%s): %v", id, err)
		}
	}
	search := func(f outputport.PathOptionsFilter) []outputport.PathOptionRow {
		t.Helper()
		rows, err := r.SearchOptions(ctx, f)
		if err != nil {
			t.Fatalf("SearchOptions(%+v): %v", f, err)
		}
		return rows
	}
	all := search(outputport.PathOptionsFilter{})
	listed, err := r.ListOptions(ctx)
	if err != nil {
		t.Fatalf("ListOptions: %v", err)
	}
	if len(all) < 2 || len(all) != len(listed) {
		t.Fatalf("an empty filter must select exactly what ListOptions does (>= 2 rows): SearchOptions=%d ListOptions=%d", len(all), len(listed))
	}
	// containing counts the unfiltered rows whose label literally contains sub.
	containing := func(sub string) int {
		n := 0
		for _, row := range all {
			if strings.Contains(strings.ToLower(row.Label), strings.ToLower(sub)) {
				n++
			}
		}
		return n
	}
	label := all[0].Label
	if label == "" {
		t.Skip("the fixture's display label is empty; there is nothing to search for")
	}

	// Positive control: searching a row's own label finds it (and every other
	// row that contains it), so the zero-result probes below cannot pass
	// vacuously on a broken query.
	got := search(outputport.PathOptionsFilter{Search: label})
	if want := containing(label); want < 1 || len(got) != want {
		t.Errorf("Search %q: got %d rows, want %d (>= 1)", label, len(got), want)
	}
	// Case-insensitive: the upper-cased text finds the same rows.
	if up := strings.ToUpper(label); up != label {
		if g := search(outputport.PathOptionsFilter{Search: up}); len(g) != len(got) {
			t.Errorf("Search %q (upper-cased): got %d rows, want %d", up, len(g), len(got))
		}
	}

	// Injection / metacharacter probes: the text is a LITERAL substring, so
	// each probe matches exactly the rows whose label contains it. An
	// unescaped ILIKE ('%', '_', backslash) would match every row instead.
	for _, probe := range []string{"%", "_", `\`, "%%", ".*", "' OR '1'='1", `"; DROP TABLE x; --`, "x%"} {
		if g, want := search(outputport.PathOptionsFilter{Search: probe}), containing(probe); len(g) != want {
			t.Errorf("Search %q: got %d rows, want %d (the text must match literally)", probe, len(g), want)
		}
	}
	if again := search(outputport.PathOptionsFilter{}); len(again) != len(all) {
		t.Errorf("after the probes the listing has %d rows, want %d (a probe must not change the data)", len(again), len(all))
	}

	// IDs: exactly the named rows; unknown ids select nothing; composed with
	// Search both predicates must hold.
	first := all[0].ID
	if g := search(outputport.PathOptionsFilter{IDs: []string{first}}); len(g) != 1 || g[0].ID != first {
		t.Errorf("IDs [%s]: got %+v, want exactly that row", first, g)
	}
	if g := search(outputport.PathOptionsFilter{IDs: []string{"no-such-id"}}); len(g) != 0 {
		t.Errorf("IDs [no-such-id]: got %d rows, want 0", len(g))
	}
	if g := search(outputport.PathOptionsFilter{IDs: []string{first}, Search: label}); len(g) != 1 {
		t.Errorf("IDs [%s] + Search %q: got %d rows, want 1", first, label, len(g))
	}
}

// TestOptionsLIKEEscape pins optionsLIKEEscape, the function that turns a
// caller-supplied options search into a LITERAL LIKE substring (#5078). It
// needs no database and no DSN, so it runs on every `go test` of the adapter
// package — the store-level TestRepository_SearchOptions only runs where a
// live database is wired. Without the escaping, a lone "%" or "_" would be a
// wildcard matching every row, and a backslash would swallow the next
// character.
func TestOptionsLIKEEscape(t *testing.T) {
	for _, tc := range []struct{ name, in, want string }{
		{"empty", "", ""},
		{"plain text is untouched", "abc 123", "abc 123"},
		{"percent", "%", `\%`},
		{"underscore", "_", `\_`},
		{"backslash", `\`, `\\`},
		{"all three together", `100%_\`, `100\%\_\\`},
		{"an escape lookalike is escaped again", `\%`, `\\\%`},
		{"quotes are not LIKE syntax", `o'brien "x"`, `o'brien "x"`},
		{"SQL text is not LIKE syntax", `'; DROP TABLE x; --`, `'; DROP TABLE x; --`},
		{"unicode is untouched", "héllo ☃ 日本", "héllo ☃ 日本"},
	} {
		if got := optionsLIKEEscape(tc.in); got != tc.want {
			t.Errorf("%s: optionsLIKEEscape(%q) = %q, want %q", tc.name, tc.in, got, tc.want)
		}
	}
}
