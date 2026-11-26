package questiontextservice

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/inxpired/hexago/runtime/txmanager"

	domain "example.com/learnlab/internal/core/domain/questiontext"
	inputport "example.com/learnlab/internal/core/ports/input/questiontext"
	outputport "example.com/learnlab/internal/core/ports/output/questiontext"
)

// fakeQuestionTextRepo is an in-memory implementation of the outbound port for
// service-layer testing. It mirrors the interface gated by the same
// Operations the service uses, so adding/removing a method on the port
// is a compile-time failure here — the var _ assertion below is the
// load-bearing line.
//
// The fake is intentionally permissive about the behavior of Save /
// Update / Delete (it just records calls and stores entities) — the
// service-layer tests below assert only the *contract* between service
// and port (sentinels, validation order, response shape), not the
// adapter's persistence semantics.
type fakeQuestionTextRepo struct {
	store map[string]*domain.QuestionText

	// Errors the fake should return on the next call to the matching
	// method. Set in arrange, asserted in act — keeps each table row
	// self-contained.
	saveErr   error
	findErr   error
	listErr   error
	updateErr error
	deleteErr error

	// Call counters let tests assert that validation rejects BEFORE the
	// port is hit (i.e. the service short-circuits on a bad command).
	saveCalls   int
	findCalls   int
	listCalls   int
	updateCalls int
	deleteCalls int
}

func newFakeQuestionTextRepo() *fakeQuestionTextRepo {
	return &fakeQuestionTextRepo{store: map[string]*domain.QuestionText{}}
}

func (f *fakeQuestionTextRepo) Save(_ context.Context, e *domain.QuestionText) error {
	f.saveCalls++
	if f.saveErr != nil {
		return f.saveErr
	}
	f.store[e.ID()] = e
	return nil
}
func (f *fakeQuestionTextRepo) FindByID(_ context.Context, id string) (*domain.QuestionText, error) {
	f.findCalls++
	if f.findErr != nil {
		return nil, f.findErr
	}
	if e, ok := f.store[id]; ok {
		return e, nil
	}
	return nil, outputport.ErrNotFound
}
func (f *fakeQuestionTextRepo) List(_ context.Context, limit, offset int) ([]*domain.QuestionText, error) {
	f.listCalls++
	if f.listErr != nil {
		return nil, f.listErr
	}
	out := make([]*domain.QuestionText, 0, len(f.store))
	for _, e := range f.store {
		out = append(out, e)
	}
	// Honor offset/limit for parity with real adapters (best-effort —
	// map iteration is unordered, but the count is stable).
	if offset > len(out) {
		offset = len(out)
	}
	out = out[offset:]
	if limit > 0 && limit < len(out) {
		out = out[:limit]
	}
	return out, nil
}

// ListByLesson mirrors the auto-emitted port method (#403 sub-3).
// The fake's body returns nil/nil — the service-layer tests in this file
// don't exercise ListBy<Ref>, but the method MUST exist or the
// `var _ outputport.QuestionTextRepository = (*fakeQuestionTextRepo)(nil)`
// assertion below fails to compile.
func (f *fakeQuestionTextRepo) ListByLesson(_ context.Context, refID string, limit, offset int) ([]*domain.QuestionText, error) {
	return nil, nil
}

// CountByLesson mirrors the auto-emitted port method (#2202). Returns 0/nil
// — the service-layer tests don't exercise CountBy<Ref> directly, but the
// method MUST exist or the interface-satisfaction assertion below fails to
// compile.
func (f *fakeQuestionTextRepo) CountByLesson(_ context.Context, refID string) (int, error) {
	return 0, nil
}

// ListByLessonSince mirrors the auto-emitted keyset-paginated sibling
// of ListByLesson on the outbound port (#4237). Returns nil/nil — the
// method MUST exist or the interface-satisfaction assertion below fails to
// compile.
func (f *fakeQuestionTextRepo) ListByLessonSince(_ context.Context, refID string, afterCreatedAt time.Time, afterID string, limit int) ([]*domain.QuestionText, error) {
	return nil, nil
}

// ListFiltered mirrors the auto-emitted port method added when
// filter.searchable + a search/q filter field are declared (#1300), or when
// an enum-equality filter is present (UX-B). Returns the full store slice (no
// actual filtering) — interface satisfaction is the load-bearing contract
// here; the ILIKE/LIKE/equality behavior is a repository-adapter concern, not
// a service-layer concern, and is covered by the outbound-adapter repository
// tests. The method MUST exist or the compile-time interface assertion below
// fails.
func (f *fakeQuestionTextRepo) ListFiltered(_ context.Context, _ string, limit, offset int) ([]*domain.QuestionText, error) {
	if f.listErr != nil {
		return nil, f.listErr
	}
	out := make([]*domain.QuestionText, 0, len(f.store))
	for _, e := range f.store {
		out = append(out, e)
	}
	if offset > len(out) {
		offset = len(out)
	}
	out = out[offset:]
	if limit > 0 && limit < len(out) {
		out = out[:limit]
	}
	return out, nil
}

// ListOptions mirrors the auto-emitted port method (#403 sub-5).
// Returns nil/nil — interface satisfaction is the load-bearing
// contract here, not behavior. Service-layer Options tests are a
// follow-up and would arrange entries via repo.store before asserting
// the projection. Under .Owned the signature gains ownerID so the fake
// matches the owner-scoped dropdown surface (sec-pass3 #3/#35/#57 — §Q3).
func (f *fakeQuestionTextRepo) ListOptions(_ context.Context) ([]outputport.QuestionTextOptionRow, error) {
	return nil, nil
}

func (f *fakeQuestionTextRepo) Update(_ context.Context, e *domain.QuestionText) error {
	f.updateCalls++
	if f.updateErr != nil {
		return f.updateErr
	}
	f.store[e.ID()] = e
	return nil
}
func (f *fakeQuestionTextRepo) Delete(_ context.Context, id string) error {
	f.deleteCalls++
	if f.deleteErr != nil {
		return f.deleteErr
	}
	if _, ok := f.store[id]; !ok {
		return outputport.ErrNotFound
	}
	delete(f.store, id)
	return nil
}

// Compile-time assertion: fakeQuestionTextRepo must satisfy
// outputport.QuestionTextRepository. Adding/removing methods on the
// outbound port without updating the fake breaks this line at compile
// time — the contract this whole test file pins.
var _ outputport.QuestionTextRepository = (*fakeQuestionTextRepo)(nil)

// newServiceWithFake wires a Service against a fresh fake repo and the
// noop tx manager. The noop manager runs the body inline (no
// transactional boundary) — fine for service-layer assertions; per-DB
// transactional behavior is tested at the adapter layer.
//
// The constructor argument list is regen-aware: when the spec adds
// `ref:` fields the template injects nil-typed lookup arguments; when
// the spec adds `events.publishOn:` the template injects an in-process
// eventbus.Bus. Either change to the spec re-renders this helper to
// match the current NewService signature so the fixtures keep building.
func newServiceWithFake(t *testing.T) (*Service, *fakeQuestionTextRepo) {
	t.Helper()
	repo := newFakeQuestionTextRepo()
	// Ref-validation dependencies are passed as nil. The sentinel tests
	// below exercise paths (GetByID, Delete) that do not invoke
	// validateRefs, so nil deps are never dereferenced. Tests that need
	// to exercise ref validation can wire non-nil stubs here.
	svc := NewService(repo, nil, txmanager.NewNoop())
	return svc, repo
}

// Sentinel-mapping tests for ref-bearing entities.
//
// The service constructor receives nil for every ref-lookup dependency
// (see newServiceWithFake). The tests below exercise paths that do NOT
// invoke validateRefs (GetByID and Delete call repo.FindByID directly,
// with no ref fields involved), so nil ref deps are never dereferenced.
//
// Ref-validation behaviour (e.g. returning Err<E><Field>InvalidReference
// when a referenced aggregate is missing) can be tested by seeding a
// non-nil stub lookup in a hand-authored test in the same package.

// TestService_Ref_GetByID_Happy pins the read path for a ref-bearing
// entity: a pre-seeded entity is returned via FindByID and surfaced through
// the response shape. Seeded via domain.LoadQuestionText (the storage-
// rehydration constructor, which skips validation, incl. required-field
// checks) rather than svc.Create, and GetByID never calls validateRefs
// (#3896) — so the nil ref-lookup dependencies from newServiceWithFake are
// never dereferenced, regardless of whether any ref field is required.
func TestService_Ref_GetByID_Happy(t *testing.T) {
	svc, repo := newServiceWithFake(t)
	seed := domain.LoadQuestionText("test-id", "v-lesson_id", 1, "v-locale", "v-prompt", *new([]string), "v-explanation", time.Now(), time.Now())
	repo.store["test-id"] = seed
	resp, err := svc.GetByID(context.Background(), inputport.GetQuestionTextByIDQuery{ID: "test-id"})
	if err != nil {
		t.Fatalf("GetByID: %v", err)
	}
	if resp == nil {
		t.Fatalf("GetByID returned nil response")
		return
	}
	if repo.findCalls != 1 {
		t.Errorf("FindByID calls = %d, want 1", repo.findCalls)
	}
}

// TestService_Ref_GetByID_NotFound pins the sentinel-mapping rule for
// ref-bearing entities: outputport.ErrNotFound at the repo boundary lifts
// to inputport's ErrQuestionTextNotFound (which carries errcat.NotFound,
// mapped by every transport to 404). The GetByID path does not touch
// any ref-lookup dependency — nil deps are safe here.
func TestService_Ref_GetByID_NotFound(t *testing.T) {
	svc, _ := newServiceWithFake(t)
	_, err := svc.GetByID(context.Background(), inputport.GetQuestionTextByIDQuery{ID: "missing"})
	if !errors.Is(err, inputport.ErrQuestionTextNotFound) {
		t.Errorf("GetByID miss: got %v, want ErrQuestionTextNotFound", err)
	}
}

// TestService_Ref_List_Happy pins the list path for a ref-bearing entity:
// the service returns one response per stored entity, in any order. Seeded
// via domain.LoadQuestionText (skips validation) and List never calls
// validateRefs (#3896) — so the nil ref-lookup dependencies from
// newServiceWithFake are never dereferenced.
func TestService_Ref_List_Happy(t *testing.T) {
	svc, repo := newServiceWithFake(t)
	for _, id := range []string{"id-1", "id-2", "id-3"} {
		repo.store[id] = domain.LoadQuestionText(id, "v-lesson_id", 1, "v-locale", "v-prompt", *new([]string), "v-explanation", time.Now(), time.Now())
	}
	resp, err := svc.List(context.Background(), inputport.ListQuestionTextQuery{Limit: 0, Offset: 0})
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if len(resp) != 3 {
		t.Errorf("List len = %d, want 3", len(resp))
	}
	if repo.listCalls != 1 {
		t.Errorf("List calls = %d, want 1", repo.listCalls)
	}
}

// TestService_Ref_Delete_Happy pins the delete path for a ref-bearing
// entity: the service calls the repo, the entity disappears, and no error
// surfaces. Seeded via domain.LoadQuestionText (skips validation) and
// Delete never calls validateRefs (#3896) — so the nil ref-lookup
// dependencies from newServiceWithFake are never dereferenced.
func TestService_Ref_Delete_Happy(t *testing.T) {
	svc, repo := newServiceWithFake(t)
	repo.store["test-id"] = domain.LoadQuestionText("test-id", "v-lesson_id", 1, "v-locale", "v-prompt", *new([]string), "v-explanation", time.Now(), time.Now())
	if err := svc.Delete(context.Background(), inputport.DeleteQuestionTextCommand{ID: "test-id"}); err != nil {
		t.Fatalf("Delete: %v", err)
	}
	if repo.deleteCalls != 1 {
		t.Errorf("Delete calls = %d, want 1", repo.deleteCalls)
	}
}

// TestService_Ref_Delete_NotFound pins the delete sentinel-mapping rule for
// ref-bearing entities: outputport.ErrNotFound from the FindByID step
// surfaces as inputport.ErrQuestionTextNotFound (errcat.NotFound → 404).
// The Delete path does not touch any ref-lookup dependency — nil deps
// are safe here.
func TestService_Ref_Delete_NotFound(t *testing.T) {
	svc, _ := newServiceWithFake(t)
	err := svc.Delete(context.Background(), inputport.DeleteQuestionTextCommand{ID: "missing"})
	if !errors.Is(err, inputport.ErrQuestionTextNotFound) {
		t.Errorf("Delete miss: got %v, want ErrQuestionTextNotFound", err)
	}
}

// searchOptionCatalogue is the fixed catalogue the #5078 Options tests serve.
var searchOptionCatalogue = []outputport.QuestionTextOptionRow{
	{ID: "id-1", Label: "Alpha"},
	{ID: "id-2", Label: "alpine ski"},
	{ID: "id-3", Label: "Beta 100%"},
	{ID: "id-4", Label: "o'brien"},
}

// searchableOptionsRepo is a repository that offers the OPTIONAL
// outputport.QuestionTextOptionsSearcher capability: it records what the service
// hands it, so the tests can pin that a narrowed Options call reaches the
// store (where the 1000-row LIMIT is applied AFTER the predicates) instead of
// being filtered in memory.
type searchableOptionsRepo struct {
	*fakeQuestionTextRepo
	listCalls, searchCalls int
	filter                 outputport.QuestionTextOptionsFilter
}

func (r *searchableOptionsRepo) ListOptions(_ context.Context) ([]outputport.QuestionTextOptionRow, error) {
	r.listCalls++
	return searchOptionCatalogue, nil
}

func (r *searchableOptionsRepo) SearchOptions(_ context.Context, f outputport.QuestionTextOptionsFilter) ([]outputport.QuestionTextOptionRow, error) {
	r.searchCalls++
	r.filter = f
	return []outputport.QuestionTextOptionRow{{ID: "from-store", Label: "from the store"}}, nil
}

// windowedOptionsRepo models a hand-written or pre-#5078 adapter: it has
// ListOptions only, so it still satisfies the output port (the capability is a
// separate interface) but cannot narrow in the store.
type windowedOptionsRepo struct {
	*fakeQuestionTextRepo
}

func (windowedOptionsRepo) ListOptions(_ context.Context) ([]outputport.QuestionTextOptionRow, error) {
	return searchOptionCatalogue, nil
}

// optionsQuery builds an Options query for the #5078 tests.
func optionsQuery(search string, ids ...string) inputport.QuestionTextOptionsQuery {
	return inputport.QuestionTextOptionsQuery{
		Search: search,
		IDs:    ids,
	}
}

// TestService_Options_NarrowedQueryReachesTheStore pins that Search and IDs are
// pushed to the store through the optional OptionsSearcher capability (#5078)
// — and that a plain Options call keeps using ListOptions.
func TestService_Options_NarrowedQueryReachesTheStore(t *testing.T) {
	ctx := context.Background()
	repo := &searchableOptionsRepo{fakeQuestionTextRepo: &fakeQuestionTextRepo{}}
	svc := &Service{repo: repo}

	got, err := svc.Options(ctx, optionsQuery("alp", "id-1", "id-2"))
	if err != nil {
		t.Fatalf("Options(narrowed): %v", err)
	}
	if repo.searchCalls != 1 || repo.listCalls != 0 {
		t.Fatalf("narrowed Options: searchCalls=%d listCalls=%d, want 1 and 0 (the store must do the narrowing)", repo.searchCalls, repo.listCalls)
	}
	if repo.filter.Search != "alp" || len(repo.filter.IDs) != 2 || repo.filter.IDs[0] != "id-1" || repo.filter.IDs[1] != "id-2" {
		t.Errorf("store received filter %+v, want Search=alp IDs=[id-1 id-2]", repo.filter)
	}
	if len(got) != 1 || got[0].ID != "from-store" || got[0].Label != "from the store" {
		t.Errorf("Options(narrowed) = %+v, want the store's row mapped through", got)
	}

	// An unnarrowed query is the old ListOptions path.
	if _, err := svc.Options(ctx, optionsQuery("")); err != nil {
		t.Fatalf("Options(plain): %v", err)
	}
	if repo.listCalls != 1 || repo.searchCalls != 1 {
		t.Errorf("plain Options: listCalls=%d searchCalls=%d, want 1 and 1", repo.listCalls, repo.searchCalls)
	}

	// IDs are capped at the 1000-row page size before they reach the store.
	many := make([]string, 1005)
	for i := range many {
		many[i] = string(rune(0x4e00 + i)) // 1005 DISTINCT ids
	}
	if _, err := svc.Options(ctx, optionsQuery("", many...)); err != nil {
		t.Fatalf("Options(1005 ids): %v", err)
	}
	if len(repo.filter.IDs) != 1000 {
		t.Errorf("store received %d ids, want 1000 (the page size)", len(repo.filter.IDs))
	}
}

// TestService_Options_EmptyIDsMeansNoIDFilter pins the documented footgun of
// #5078: an empty (or nil) IDs slice is "no id filter", NOT "match nothing" —
// the call is the plain unfiltered listing. The port docs therefore tell a
// caller with no ids to skip the call; this test is the executable record.
func TestService_Options_EmptyIDsMeansNoIDFilter(t *testing.T) {
	ctx := context.Background()
	repo := &searchableOptionsRepo{fakeQuestionTextRepo: &fakeQuestionTextRepo{}}
	svc := &Service{repo: repo}
	for name, q := range map[string]inputport.QuestionTextOptionsQuery{
		"nil ids":   optionsQuery(""),
		"empty ids": optionsQuery("", []string{}...),
	} {
		got, err := svc.Options(ctx, q)
		if err != nil {
			t.Fatalf("%s: Options: %v", name, err)
		}
		if len(got) != len(searchOptionCatalogue) {
			t.Errorf("%s: got %d rows, want the whole unfiltered listing (%d)", name, len(got), len(searchOptionCatalogue))
		}
	}
	if repo.listCalls != 2 || repo.searchCalls != 0 {
		t.Errorf("listCalls=%d searchCalls=%d, want 2 and 0: an empty IDs slice must not narrow anything", repo.listCalls, repo.searchCalls)
	}
}

// TestService_Options_DedupesIDsBeforeTheCap pins that duplicate ids are
// dropped BEFORE the 1000-id cap (#5078): 1100 distinct ids, each given
// twice, reach the store as the first 1000 DISTINCT ids in order — capping
// first would have kept only 500 distinct ids.
func TestService_Options_DedupesIDsBeforeTheCap(t *testing.T) {
	ctx := context.Background()
	repo := &searchableOptionsRepo{fakeQuestionTextRepo: &fakeQuestionTextRepo{}}
	svc := &Service{repo: repo}
	doubled := make([]string, 0, 2200)
	for i := 0; i < 1100; i++ {
		id := string(rune(0x4e00 + i))
		doubled = append(doubled, id, id)
	}
	if _, err := svc.Options(ctx, optionsQuery("", doubled...)); err != nil {
		t.Fatalf("Options(doubled ids): %v", err)
	}
	got := repo.filter.IDs
	if len(got) != 1000 {
		t.Fatalf("store received %d ids, want 1000 distinct ids", len(got))
	}
	for i, id := range got {
		if id != string(rune(0x4e00+i)) {
			t.Fatalf("store ids[%d] = %q, want %q (first occurrence, in order, no repeats)", i, id, string(rune(0x4e00+i)))
		}
	}
}

// TestService_Options_SearchIsSanitisedBeforeTheStore pins the #5078 store
// safety net: a NUL byte or invalid UTF-8 in Search is dropped (PostgreSQL and
// MongoDB error on both), and a very long Search is cut to 200 runes (SQLite's
// LIKE and MongoDB's regex refuse a huge pattern). The same sanitised text is
// what the in-memory fallback matches with.
func TestService_Options_SearchIsSanitisedBeforeTheStore(t *testing.T) {
	ctx := context.Background()
	repo := &searchableOptionsRepo{fakeQuestionTextRepo: &fakeQuestionTextRepo{}}
	svc := &Service{repo: repo}
	long := make([]rune, 300)
	for i := range long {
		long[i] = 'é' // multi-byte, so the cut must be on a rune boundary
	}
	for _, tc := range []struct {
		name, in, want string
	}{
		{"NUL stripped", "al\x00p", "alp"},
		{"only NUL becomes empty", "\x00\x00", ""},
		{"invalid UTF-8 dropped", "al\xffp\xc3", "alp"},
		{"plain text untouched", "o'brien 100%", "o'brien 100%"},
		{"long text cut on a rune boundary", string(long), string(long[:200])},
	} {
		if _, err := svc.Options(ctx, optionsQuery(tc.in)); err != nil {
			t.Fatalf("%s: Options: %v", tc.name, err)
		}
		if repo.filter.Search != tc.want {
			t.Errorf("%s: store received Search %q, want %q", tc.name, repo.filter.Search, tc.want)
		}
	}

	// The frozen-adapter fallback matches with the sanitised text too.
	var windowed outputport.QuestionTextRepository = windowedOptionsRepo{&fakeQuestionTextRepo{}}
	old := &Service{repo: windowed}
	got, err := old.Options(ctx, optionsQuery("al\x00p"))
	if err != nil || len(got) != 2 {
		t.Errorf("fallback Options(%q) = %d rows, %v; want the 2 rows matching \"alp\"", "al\x00p", len(got), err)
	}
}

// TestService_Options_AdapterWithoutTheCapabilityFallsBack pins the
// frozen-adapter contract of #5078: a repository that only has ListOptions
// still serves a narrowed Options call, by filtering its windowed rows in
// memory (the pre-#5078 behaviour) rather than failing or ignoring the query.
func TestService_Options_AdapterWithoutTheCapabilityFallsBack(t *testing.T) {
	ctx := context.Background()
	var repo outputport.QuestionTextRepository = windowedOptionsRepo{&fakeQuestionTextRepo{}}
	if _, ok := repo.(outputport.QuestionTextOptionsSearcher); ok {
		t.Fatal("control: windowedOptionsRepo must NOT offer the OptionsSearcher capability")
	}
	svc := &Service{repo: repo}
	ids := func(opts []inputport.QuestionTextOption) string {
		out := ""
		for _, o := range opts {
			out += o.ID + ","
		}
		return out
	}
	for _, tc := range []struct {
		name string
		q    inputport.QuestionTextOptionsQuery
		want string
	}{
		{"substring, case-insensitive", optionsQuery("ALP"), "id-1,id-2,"},
		{"percent is a literal", optionsQuery("%"), "id-3,"},
		{"quote is a literal", optionsQuery("'"), "id-4,"},
		{"underscore is a literal", optionsQuery("_"), ""},
		{"no match", optionsQuery("zzz"), ""},
		{"ids only", optionsQuery("", "id-2", "id-4", "missing"), "id-2,id-4,"},
		{"ids and search", optionsQuery("alp", "id-2", "id-3"), "id-2,"},
	} {
		got, err := svc.Options(ctx, tc.q)
		if err != nil {
			t.Fatalf("%s: Options: %v", tc.name, err)
		}
		if g := ids(got); g != tc.want {
			t.Errorf("%s: got ids %q, want %q", tc.name, g, tc.want)
		}
	}
}
