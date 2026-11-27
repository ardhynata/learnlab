// Package questionpostgresql is the PostgreSQL-backed outbound adapter for Question.
//
// Schema-init is idempotent (CREATE TABLE IF NOT EXISTS) and runs on every
// NewRepository call — first-boot creates the table; later boots see no-op
// DDL and proceed to handler dispatch.
//
// IMPORTANT v1 schema-migration limitation: this adapter does NOT version
// or ALTER tables. If you change the spec after first boot (add a field,
// change a type, rename a column), you must drop the table and let
// schema-init recreate it, OR hand-write your own migration. There is no
// automatic ADD COLUMN. See docs/yaml-spec.md → "PostgreSQL outbound
// adapter" for the rationale + future direction.
//
// Driver: github.com/jackc/pgx/v5 + github.com/jackc/pgx/v5/pgxpool. Pure
// Go, modern Postgres driver. Imported via the generated project's
// go.mod, NOT hexago's. The user constructs the pool in cmd/app/main.go
// (typically via pgxpool.New(ctx, cfg.PostgresDSN)) and passes it to
// NewRepository — keeps pool lifecycle (Close, Ping) under user control
// and lets one *pgxpool.Pool serve every repository in the project.
package questionpostgresql

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/inxpired/hexago-runtime/httperr"
	"github.com/inxpired/hexago-runtime/sqlerr"

	domain "example.com/learnlab/internal/core/domain/question"
	outputport "example.com/learnlab/internal/core/ports/output/question"
	txmanager "github.com/inxpired/hexago-runtime/txmanager"
)

// pgConn is the read/write surface shared by *pgxpool.Pool and pgx.Tx.
// The repository runs every statement through this interface so the
// exact same query code participates in a transaction when one is
// scoped into ctx (multi-write Create/Update inside
// txmanager.WithTransaction) and falls back to the bare pool when none
// is (single-write paths — unchanged behaviour, no extra round-trip).
type pgConn interface {
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

// Repository is the PostgreSQL implementation of outputport.QuestionRepository.
type Repository struct {
	pool *pgxpool.Pool
}

var _ outputport.QuestionRepository = (*Repository)(nil)

// questionDoc is the at-rest shape mirroring the Postgres
// columns. Doc-field Go types are pgx-scan-friendly — pgx handles
// time.Time, native pointer types, []byte for BYTEA, and []T → JSONB
// directly, so the shim mirrors the domain shape closely. The
// encrypted-field path stores ciphertext as []byte (BYTEA on the wire).
type questionDoc struct {
	id          string
	answer      int
	explanation string
	lessonID    string
	options     []byte
	position    int
	prompt      string
	createdAt   time.Time
	updatedAt   time.Time
}

// schemaSQL is the CREATE TABLE IF NOT EXISTS statement derived from
// the spec. Idempotent: runs unconditionally on NewRepository so a
// fresh DB is provisioned on first boot and an existing DB is no-op'd
// on later boots. v1 contract: no versioning, no ALTER. Spec changes
// require drop + recreate (or a hand-written migration).
//
// Table identifier is double-quoted so reserved-word entity names
// (User, Order, Group, Window, Authorization, Select, ...) do not
// produce SQLSTATE 42601 syntax errors at boot. Quoting is
// case-preserving in Postgres, but every spec entity is snake-cased
// before reaching .TableName so the on-disk identifier stays
// lowercase.
const schemaSQL = `CREATE TABLE IF NOT EXISTS "question" (
	"id" TEXT PRIMARY KEY,
	"answer" BIGINT,
	"explanation" TEXT,
	"lesson_id" TEXT NOT NULL,
	"options" JSONB NOT NULL,
	"position" BIGINT,
	"prompt" TEXT NOT NULL,
	"created_at" TIMESTAMPTZ,
	"updated_at" TIMESTAMPTZ
)`

// schemaIndexSQL holds one `CREATE INDEX IF NOT EXISTS` per `ref:` field
// (#1696 item 1). Each ref-FK column gets an index so a ListBy<Ref>
// `WHERE <col> = $1` hits the index instead of scanning the table. An
// encrypted-exact ref indexes the `<col>_hash` blind-index sibling, not
// the ciphertext column. `IF NOT EXISTS` keeps every statement idempotent
// across boots — same contract as the schemaSQL CREATE TABLE. The index
// name matches the goose migration emitter's (#1696 item 2) so a fresh
// boot and a migrated table agree.
var schemaIndexSQL = []string{
	`CREATE INDEX IF NOT EXISTS "idx_question_lesson_id" ON "question" ("lesson_id")`,
}

// NewRepository constructs the Postgres-backed repository and runs
// schema-init. The caller (cmd/app/main.go) owns the *pgxpool.Pool
// lifecycle — shared across all repositories in the project, closed at
// shutdown.
//
// Returns an error when schema-init fails — typically a permissions
// problem, a pool that can't connect, or a DDL conflict against an
// existing incompatible table. main.go should `os.Exit(1)` on this
// error rather than retry.
func NewRepository(pool *pgxpool.Pool) (*Repository, error) {
	if pool == nil {
		return nil, fmt.Errorf("questionpostgresql: *pgxpool.Pool is required")
	}
	schemaCtx, schemaCancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer schemaCancel()
	if _, err := pool.Exec(schemaCtx, schemaSQL); err != nil {
		return nil, fmt.Errorf("questionpostgresql: schema init: %w", err)
	}
	// #1696 item 1: create the ref-FK indexes after the table exists (plus
	// the owner_id index when the entity is owner-scoped). Each statement is
	// idempotent (CREATE INDEX IF NOT EXISTS) and runs under the same 30s
	// schema-init deadline as the CREATE TABLE above.
	for _, idxSQL := range schemaIndexSQL {
		if _, err := pool.Exec(schemaCtx, idxSQL); err != nil {
			return nil, fmt.Errorf("questionpostgresql: schema index init: %w", err)
		}
	}
	return &Repository{pool: pool}, nil
}

// conn returns the pgx connection the next statement must run on: the
// transaction scoped into ctx by txmanager.NewPostgresTxManager when
// the caller is inside a WithTransaction (so a multi-write
// Create/Update is atomic — a mid-closure error rolls back every
// write), or the bare *pgxpool.Pool otherwise (single-write paths,
// unchanged). pgx.Tx and *pgxpool.Pool share the pgConn surface, so
// every CRUD method below is identical regardless of which backs it.
func (r *Repository) conn(ctx context.Context) pgConn {
	if tx, ok := txmanager.PgxTxFromContext(ctx); ok {
		pgtx, ok := tx.(pgx.Tx)
		if !ok {
			// txmanager.PgxTxFromContext returned ok=true but the stored value
			// does not implement pgx.Tx — this is a programming error: only
			// txmanager.NewPostgresTxManager (which stores a real pgx.Tx) should
			// be setting this context key. Silently falling back to the bare pool
			// here would execute writes outside the caller's transaction, silently
			// corrupting transactional guarantees (#2220). Panic early so the root
			// cause is caught in tests rather than producing a silent data-
			// consistency defect in production.
			panic(fmt.Sprintf("outbound_postgresql conn: txmanager key present but stored value %T does not implement pgx.Tx", tx))
		}
		return pgtx
	}
	return r.pool
}

// toDocument projects a domain entity into the at-rest doc-shim.
// Encrypted fields run through encryptor.Port.Encrypt and any
// blind-index sibling columns are populated from the same plaintext.
// Non-encrypted fields pass through their getter directly — pgx handles
// time.Time / native pointer types / slices → JSONB / []byte → BYTEA on
// the wire without an intermediate conversion.
//
// Returns an error when Encrypt fails — surfaces at the service layer
// as a Save / Update error.
func (r *Repository) toDocument(e *domain.Question) (questionDoc, error) {
	d := questionDoc{}
	d.id = e.ID()
	d.answer = e.Answer()
	d.explanation = e.Explanation()
	d.lessonID = e.LessonID()
	{
		v, err := marshalSliceOrDie(e.Options())
		if err != nil {
			return questionDoc{}, err
		}
		d.options = v
	}
	d.position = e.Position()
	d.prompt = e.Prompt()
	d.createdAt = e.CreatedAt()
	d.updatedAt = e.UpdatedAt()
	return d, nil
}

// fromDocument rehydrates a domain entity from the at-rest doc-shim.
// Decode steps run in field order so a partial failure returns at the
// offending field instead of producing a partially-constructed entity.
func (r *Repository) fromDocument(d questionDoc) (*domain.Question, error) {
	var s_options []string
	if len(d.options) > 0 {
		if err := json.Unmarshal(d.options, &s_options); err != nil {
			return nil, httperr.WrapServerData(err)
		}
	}
	return domain.LoadQuestion(d.id, d.lessonID, d.position, d.prompt, s_options, d.answer, d.explanation, d.createdAt, d.updatedAt), nil
}

// saveArgColumns names Save's INSERT bind parameters in argument order, so
// a pgx client-side encode refusal ("failed to encode args[N]") can name
// the field the client sent out of range (#4972).
var saveArgColumns = []string{"id", "answer", "explanation", "lesson_id", "options", "position", "prompt", "created_at", "updated_at"}

// Save inserts a new row. Returns outputport.ErrAlreadyExists when the
// primary-key collides; a value the column cannot hold (out of range, too
// long, NULL into NOT NULL, a failed CHECK or foreign key) is classified by
// classifyWriteError into its 4xx errcat category (#4972); every other
// error propagates untyped.
func (r *Repository) Save(ctx context.Context, e *domain.Question) error {
	d, err := r.toDocument(e)
	if err != nil {
		return err
	}
	_, err = r.conn(ctx).Exec(ctx, `INSERT INTO "question" ("id", "answer", "explanation", "lesson_id", "options", "position", "prompt", "created_at", "updated_at") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
		d.id,
		d.answer,
		d.explanation,
		d.lessonID,
		d.options,
		d.position,
		d.prompt,
		d.createdAt,
		d.updatedAt,
	)
	if err != nil {
		if isUniqueViolation(err) {
			return outputport.ErrAlreadyExists
		}
		return classifyWriteError(err, sqlerr.Write, saveArgColumns)
	}
	return nil
}

// FindByID returns (*entity, nil) on hit and (nil, outputport.ErrNotFound)
// on miss. Emitted whenever GetByID OR Update is requested (the Update
// service branch loads via s.repo.FindByID) — #1120.
func (r *Repository) FindByID(ctx context.Context, id string) (*domain.Question, error) {
	var d questionDoc
	row := r.conn(ctx).QueryRow(ctx, `SELECT "id", "answer", COALESCE("explanation", ''), "lesson_id", "options", "position", "prompt", "created_at", "updated_at" FROM "question" WHERE id = $1`, id)
	if err := row.Scan(
		&d.id,
		&d.answer,
		&d.explanation,
		&d.lessonID,
		&d.options,
		&d.position,
		&d.prompt,
		&d.createdAt,
		&d.updatedAt,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, outputport.ErrNotFound
		}
		return nil, classifyReadError(err)
	}
	return r.fromDocument(d)
}

// List returns all rows newest-first — ORDER BY created_at DESC with the id
// tiebreak for a stable total order (W4: a fresh record surfaces at the top
// instead of an opaque-uuid-order position) — applying LIMIT/OFFSET when
// limit > 0. Richer queries (filter, sort, cursor pagination) are out
// of v1 scope.
func (r *Repository) List(ctx context.Context, limit, offset int) ([]*domain.Question, error) {
	q := `SELECT "id", "answer", COALESCE("explanation", ''), "lesson_id", "options", "position", "prompt", "created_at", "updated_at" FROM "question" ORDER BY created_at DESC, id`
	args := []any{}
	if limit > 0 {
		q += ` LIMIT $1 OFFSET $2`
		args = append(args, limit, offset)
	} else if offset > 0 {
		q += ` OFFSET $1`
		args = append(args, offset)
	}
	rows, err := r.conn(ctx).Query(ctx, q, args...)
	if err != nil {
		return nil, classifyReadError(err)
	}
	defer rows.Close()
	var out []*domain.Question
	for rows.Next() {
		var d questionDoc
		if err := rows.Scan(
			&d.id,
			&d.answer,
			&d.explanation,
			&d.lessonID,
			&d.options,
			&d.position,
			&d.prompt,
			&d.createdAt,
			&d.updatedAt,
		); err != nil {
			return nil, classifyReadError(err)
		}
		e, err := r.fromDocument(d)
		if err != nil {
			return nil, classifyReadError(err)
		}
		out = append(out, e)
	}
	if err := rows.Err(); err != nil {
		return nil, classifyReadError(err)
	}
	return out, nil
}

// ListFiltered is auto-emitted from filter.searchable (#1300). It applies
// ILIKE substring predicates on the spec's searchable columns (OR-joined)
// for the given search string, then applies the same LIMIT/OFFSET paging
// as List. The caller (service.List) routes here when the query's search
// param is non-empty; the unfiltered List is used otherwise.
//
// Plaintext text search — not encrypted-field trigram search. To search
// encrypted fields use index: trigram (HMAC trigram blind-index in _idx JSONB).
func (r *Repository) ListFiltered(ctx context.Context, search string, limit, offset int) ([]*domain.Question, error) {
	q := `SELECT "id", "answer", COALESCE("explanation", ''), "lesson_id", "options", "position", "prompt", "created_at", "updated_at" FROM "question" WHERE ("explanation"::text ILIKE '%' || $1 || '%' ESCAPE '\' OR "prompt"::text ILIKE '%' || $1 || '%' ESCAPE '\') ORDER BY created_at DESC, id`
	args := []any{pgLIKEEscape(search)}
	if limit > 0 {
		q += ` LIMIT $2 OFFSET $3`
		args = append(args, limit, offset)
	} else if offset > 0 {
		q += ` OFFSET $2`
		args = append(args, offset)
	}
	rows, err := r.conn(ctx).Query(ctx, q, args...)
	if err != nil {
		return nil, classifyReadError(err)
	}
	defer rows.Close()
	var out []*domain.Question
	for rows.Next() {
		var d questionDoc
		if err := rows.Scan(
			&d.id,
			&d.answer,
			&d.explanation,
			&d.lessonID,
			&d.options,
			&d.position,
			&d.prompt,
			&d.createdAt,
			&d.updatedAt,
		); err != nil {
			return nil, classifyReadError(err)
		}
		e, err := r.fromDocument(d)
		if err != nil {
			return nil, classifyReadError(err)
		}
		out = append(out, e)
	}
	if err := rows.Err(); err != nil {
		return nil, classifyReadError(err)
	}
	return out, nil
}

// ListByLesson is auto-declared from the `ref: Lesson` field on this
// entity (#403 sub-3). Filters by the snake_case `lesson_id` column
// using a numbered placeholder ($1) and applies the same LIMIT/OFFSET
// paging as List ($2/$3). When the ref field is encrypted with
// `index: exact`, the WHERE clause targets the sibling
// `lesson_id_hash` blind-index column (HMAC of the supplied refID).
func (r *Repository) ListByLesson(ctx context.Context, refID string, limit, offset int) ([]*domain.Question, error) {
	q := `SELECT "id", "answer", COALESCE("explanation", ''), "lesson_id", "options", "position", "prompt", "created_at", "updated_at" FROM "question" WHERE lesson_id = $1 ORDER BY created_at DESC, id`
	args := []any{refID}
	if limit > 0 {
		q += ` LIMIT $2 OFFSET $3`
		args = append(args, limit, offset)
	} else if offset > 0 {
		q += ` OFFSET $2`
		args = append(args, offset)
	}
	rows, err := r.conn(ctx).Query(ctx, q, args...)
	if err != nil {
		return nil, classifyReadError(err)
	}
	defer rows.Close()
	var out []*domain.Question
	for rows.Next() {
		var d questionDoc
		if err := rows.Scan(
			&d.id,
			&d.answer,
			&d.explanation,
			&d.lessonID,
			&d.options,
			&d.position,
			&d.prompt,
			&d.createdAt,
			&d.updatedAt,
		); err != nil {
			return nil, classifyReadError(err)
		}
		e, err := r.fromDocument(d)
		if err != nil {
			return nil, classifyReadError(err)
		}
		out = append(out, e)
	}
	if err := rows.Err(); err != nil {
		return nil, classifyReadError(err)
	}
	return out, nil
}

// CountByLesson returns the total number of rows whose lesson_id
// matches refID, ignoring limit/offset. Used by the listByLesson REST
// handler to populate the `total` field in the {data, total} envelope with
// the true dataset-wide count (#2202).
func (r *Repository) CountByLesson(ctx context.Context, refID string) (int, error) {
	q := `SELECT COUNT(*) FROM "question" WHERE lesson_id = $1`
	var n int
	if err := r.conn(ctx).QueryRow(ctx, q, refID).Scan(&n); err != nil {
		return 0, classifyReadError(err)
	}
	return n, nil
}

// ListByLessonSince is the keyset-paginated sibling of ListByLesson
// (#4237): a downstream `derive:` rollup's internal complete-scan loop pages
// with this instead of LIMIT/OFFSET, because an OFFSET page is a POSITION in
// the result set — a row inserted mid-scan shifts every later row's position
// by +1, so the next OFFSET page silently re-reads the previous page's last
// row (a duplicate) while the new row, now at position 0, is never covered
// by any page (a silent skip). A keyset cursor instead pages by the
// (created_at, id) VALUE of the last row already returned: afterID == ""
// starts from the top; otherwise only rows strictly AFTER the cursor in the
// created_at DESC, id ASC order are returned. A row concurrently inserted
// after the scan begins always sorts ABOVE any cursor already advanced past
// it, so it can never re-enter an already-fetched page or fall into a
// position gap — correct without a long-lived transaction or snapshot
// isolation level. Not part of the general REST/gRPC/HTMX listing surface,
// which keeps its numbered-page UX on ListByLesson unchanged.
func (r *Repository) ListByLessonSince(ctx context.Context, refID string, afterCreatedAt time.Time, afterID string, limit int) ([]*domain.Question, error) {
	var args []any
	// arg records a bind value and returns its `$N` placeholder, numbered in
	// append order (Postgres requires ordinal $N) — mirrors ListFiltered's
	// same closure for a predicate whose shape varies at runtime.
	arg := func(v any) string {
		args = append(args, v)
		return fmt.Sprintf("$%d", len(args))
	}
	cond := `lesson_id = ` + arg(refID)
	if afterID != "" {
		ac := arg(afterCreatedAt)
		cond += ` AND (created_at < ` + ac + ` OR (created_at = ` + ac + ` AND id > ` + arg(afterID) + `))`
	}
	q := `SELECT "id", "answer", COALESCE("explanation", ''), "lesson_id", "options", "position", "prompt", "created_at", "updated_at" FROM "question" WHERE ` + cond + ` ORDER BY created_at DESC, id`
	if limit > 0 {
		q += ` LIMIT ` + arg(limit)
	}
	rows, err := r.conn(ctx).Query(ctx, q, args...)
	if err != nil {
		return nil, classifyReadError(err)
	}
	defer rows.Close()
	var out []*domain.Question
	for rows.Next() {
		var d questionDoc
		if err := rows.Scan(
			&d.id,
			&d.answer,
			&d.explanation,
			&d.lessonID,
			&d.options,
			&d.position,
			&d.prompt,
			&d.createdAt,
			&d.updatedAt,
		); err != nil {
			return nil, classifyReadError(err)
		}
		e, err := r.fromDocument(d)
		if err != nil {
			return nil, classifyReadError(err)
		}
		out = append(out, e)
	}
	if err := rows.Err(); err != nil {
		return nil, classifyReadError(err)
	}
	return out, nil
}

// ListOptions returns up to 1000 `{id, label}` rows for use by
// `<select>`-style dropdown population (#403 sub-5). Auto-emitted from
// the spec's `display_field: prompt` declaration.
//
// The label field is plaintext — the query reads it directly via
// SELECT and the row is returned as-is. ORDER BY runs server-side so
// the round-trip stays cheap on the wire.
func (r *Repository) ListOptions(ctx context.Context) ([]outputport.QuestionOptionRow, error) {
	rows, err := r.conn(ctx).Query(ctx, `SELECT id, "prompt" FROM "question" ORDER BY "prompt" ASC LIMIT 1000`)
	if err != nil {
		return nil, classifyReadError(err)
	}
	defer rows.Close()
	out := make([]outputport.QuestionOptionRow, 0, 64)
	for rows.Next() {
		var id string
		var label string
		if err := rows.Scan(&id, &label); err != nil {
			return nil, classifyReadError(err)
		}
		out = append(out, outputport.QuestionOptionRow{ID: id, Label: label})
	}
	if err := rows.Err(); err != nil {
		return nil, classifyReadError(err)
	}
	return out, nil
}

// optionsLIKEEscape escapes the ILIKE metacharacters of a caller-supplied
// options search so it matches as a literal substring (#5078): `%` and `_`
// would otherwise be wildcards (a lone `%` would match every row), and the
// backslash is the ESCAPE character SearchOptions declares.
func optionsLIKEEscape(s string) string {
	s = strings.ReplaceAll(s, `\`, `\\`)
	s = strings.ReplaceAll(s, `%`, `\%`)
	s = strings.ReplaceAll(s, `_`, `\_`)
	return s
}

var _ outputport.QuestionOptionsSearcher = (*Repository)(nil)

// SearchOptions is ListOptions narrowed by outputport.QuestionOptionsFilter
// (#5078): the same `{id, label}` projection, soft-delete scoping and `ORDER BY label ASC LIMIT 1000`, with the text and
// id predicates applied in the WHERE clause, BEFORE the LIMIT, so a row past
// the first 1000 labels is found. Every value is a bind parameter.
//
// Search is a case-insensitive substring match (ILIKE) with `%`, `_` and `\`
// escaped so they match literally.
func (r *Repository) SearchOptions(ctx context.Context, f outputport.QuestionOptionsFilter) ([]outputport.QuestionOptionRow, error) {
	var (
		conds []string
		args  []any
	)
	// arg records a bind value and returns its `$N` placeholder, so predicates
	// are numbered in the order they are appended (Postgres requires ordinal $N).
	arg := func(v any) string {
		args = append(args, v)
		return fmt.Sprintf("$%d", len(args))
	}
	if len(f.IDs) > 0 {
		marks := make([]string, len(f.IDs))
		for i, id := range f.IDs {
			marks[i] = arg(id)
		}
		conds = append(conds, `id IN (`+strings.Join(marks, `, `)+`)`)
	}
	if f.Search != "" {
		p := arg(optionsLIKEEscape(f.Search))
		conds = append(conds, `"prompt"::text ILIKE '%' || `+p+` || '%' ESCAPE '\'`)
	}
	q := `SELECT id, "prompt" FROM "question"`
	if len(conds) > 0 {
		q += ` WHERE ` + strings.Join(conds, ` AND `)
	}
	q += ` ORDER BY "prompt" ASC LIMIT 1000`
	rows, err := r.conn(ctx).Query(ctx, q, args...)
	if err != nil {
		return nil, classifyReadError(err)
	}
	defer rows.Close()
	out := make([]outputport.QuestionOptionRow, 0, 64)
	for rows.Next() {
		var id string
		var label string
		if err := rows.Scan(&id, &label); err != nil {
			return nil, classifyReadError(err)
		}
		out = append(out, outputport.QuestionOptionRow{ID: id, Label: label})
	}
	if err := rows.Err(); err != nil {
		return nil, classifyReadError(err)
	}
	return out, nil
}

// updateArgColumns names Update's bind parameters in argument order (the
// SET columns, then the WHERE id), so a pgx client-side encode
// refusal can name the field the client sent out of range (#4972).
var updateArgColumns = []string{"answer", "explanation", "lesson_id", "options", "position", "prompt", "updated_at", "id"}

// Update overwrites the row matching e.ID(). No partial-update / field-
// mask — callers pass a fully-rehydrated entity. updated_at is bumped;
// created_at is immutable post-Save. A unique violation returns
// outputport.ErrAlreadyExists exactly as Save does; a value the column
// cannot hold is classified by classifyWriteError into its 4xx errcat
// category (#4972).
func (r *Repository) Update(ctx context.Context, e *domain.Question) error {
	d, err := r.toDocument(e)
	if err != nil {
		return err
	}
	tag, err := r.conn(ctx).Exec(ctx, `UPDATE "question" SET "answer" = $1, "explanation" = $2, "lesson_id" = $3, "options" = $4, "position" = $5, "prompt" = $6, "updated_at" = $7 WHERE id = $8`,
		d.answer,
		d.explanation,
		d.lessonID,
		d.options,
		d.position,
		d.prompt,
		d.updatedAt,
		d.id,
	)
	if err != nil {
		// A UNIQUE index refused the new values — a slug / sequence / scalar
		// `unique: true` column, a hand-written schema's index, or a
		// `unique: true` ref a racing concurrent Update claimed first (#3540;
		// the service re-probes that into Err<Entity><Field>AlreadyTaken).
		// Map it to ErrAlreadyExists exactly as Save does, so the service
		// answers 409, not the 500 a raw driver error gets (#4972).
		if isUniqueViolation(err) {
			return outputport.ErrAlreadyExists
		}
		return classifyWriteError(err, sqlerr.Write, updateArgColumns)
	}
	if tag.RowsAffected() == 0 {
		return outputport.ErrNotFound
	}
	return nil
}

// Delete removes the row by id. Returns outputport.ErrNotFound when no
// row matches — same contract as the memory adapter. A foreign key that
// still references the row (a hand-written schema's FK; hexago's own DDL
// declares none) is classified as a 409 conflict (#4972).
func (r *Repository) Delete(ctx context.Context, id string) error {
	tag, err := r.conn(ctx).Exec(ctx, `DELETE FROM "question" WHERE id = $1`, id)
	if err != nil {
		return classifyWriteError(err, sqlerr.Delete, nil)
	}
	if tag.RowsAffected() == 0 {
		return outputport.ErrNotFound
	}
	return nil
}

// isUniqueViolation detects pgx's primary-key / uniqueness constraint
// failure via SQLSTATE 23505 — Postgres's standard "unique violation"
// code. Decoupled from string inspection so we don't depend on
// per-version error formatting.
func isUniqueViolation(err error) bool {
	if err == nil {
		return false
	}
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.Code == "23505"
	}
	// Defensive fallback: if pgx ever changes how the error is wrapped,
	// fall back to substring inspection so the contract stays robust.
	msg := err.Error()
	return strings.Contains(msg, "duplicate key") || strings.Contains(msg, "unique constraint")
}

// classifyWriteError maps a driver DATA or CONSTRAINT failure on a write to
// its errcat category through runtime/sqlerr (#4972), so a value the column
// cannot hold answers 400 — and a delete of a still-referenced row 409 —
// instead of the 500 every uncategorised driver error gets. A
// *pgconn.PgError's SQLSTATE drives the mapping (22003 / 22001 / 22007 /
// 22008 / 22P02 / 23502 / 23514 / 23503). With no PgError in the chain, the
// failure may be pgx's CLIENT-side encode refusal — under the default
// statement-cache mode pgx rejects an out-of-range int against the
// prepared statement's parameter type before the server sees it — which is
// classified too, naming the column through argColumns. Everything else is
// returned unchanged (Internal, 500), including the unique violation the
// callers map to outputport.ErrAlreadyExists first. A classified error
// wraps err, so errors.Is / errors.As on the driver error still match, and
// its message names the column but never carries the SQL or the value.
func classifyWriteError(err error, op sqlerr.Op, argColumns []string) error {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return sqlerr.Postgres(err, op, pgErr.Code, pgErr.ColumnName, pgErr.Detail)
	}
	return sqlerr.PgxEncode(err, argColumns)
}

// classifyReadError is classifyWriteError's read-side twin (#5451): a value a
// QUERY binds can be refused by Postgres exactly like one a write stores. A NUL
// byte in a text parameter (GET /things/%00, a search term, a ref id) fails the
// statement with SQLSTATE 22021, and the other class-22 data exceptions
// (22P02, 22P05, 22001, ...) are equally the caller's input. Left raw they
// answered a repeatable 500 with an ERROR log on Postgres alone, while the other
// backends answered 400/404. A *pgconn.PgError in class 22 is classified
// through runtime/sqlerr (4xx, message names no value or SQL); everything else,
// pgx.ErrNoRows and genuine server faults included, is returned unchanged.
func classifyReadError(err error) error {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && strings.HasPrefix(pgErr.Code, "22") {
		return sqlerr.Postgres(err, sqlerr.Write, pgErr.Code, pgErr.ColumnName, pgErr.Detail)
	}
	return err
}

// pgLIKEEscape escapes PostgreSQL LIKE/ILIKE wildcard metacharacters so a
// caller-supplied search string is treated as a literal substring match rather
// than a pattern. ILIKE interprets '%' (any sequence), '_' (any single
// character), and the configured ESCAPE character as special. Binding the
// user's input directly without escaping enables full-table enumeration within
// an owner's rows and wrong substring semantics (#2270).
//
// The companion SQL uses `ESCAPE '\'` so backslash is the escape character.
// This helper must be kept in sync with the ESCAPE clause in every emitted
// ILIKE predicate.
func pgLIKEEscape(s string) string {
	s = strings.ReplaceAll(s, `\`, `\\`)
	s = strings.ReplaceAll(s, `%`, `\%`)
	s = strings.ReplaceAll(s, `_`, `\_`)
	return s
}

// marshalSliceOrDie wraps json.Marshal for slice doc-fields. Returns
// the JSONB-bound []byte or an error; toDocument propagates the error
// so callers see a clean Save / Update failure instead of a silently-
// truncated row. Mirrors the SQLite path's marshalSliceOrDie shape.
// Emitted only when at least one field is a non-byte slice (#2762).
func marshalSliceOrDie(v any) ([]byte, error) {
	if v == nil {
		return []byte("null"), nil
	}
	b, err := json.Marshal(v)
	if err != nil {
		return nil, fmt.Errorf("marshal slice: %w", err)
	}
	return b, nil
}
