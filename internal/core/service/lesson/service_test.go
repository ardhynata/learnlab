package lessonservice

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/inxpired/hexago/runtime/txmanager"

	coursedomain "example.com/learnlab/internal/core/domain/course"
	domain "example.com/learnlab/internal/core/domain/lesson"
	moduledomain "example.com/learnlab/internal/core/domain/module"
	progressdomain "example.com/learnlab/internal/core/domain/progress"
	questiondomain "example.com/learnlab/internal/core/domain/question"
	inputport "example.com/learnlab/internal/core/ports/input/lesson"
	courserepo "example.com/learnlab/internal/core/ports/output/course"
	outputport "example.com/learnlab/internal/core/ports/output/lesson"
	modulerepo "example.com/learnlab/internal/core/ports/output/module"
	progressrepo "example.com/learnlab/internal/core/ports/output/progress"
	questionrepo "example.com/learnlab/internal/core/ports/output/question"
)

// fakeLessonRepo is an in-memory implementation of the outbound port for
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
type fakeLessonRepo struct {
	store map[string]*domain.Lesson

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

func newFakeLessonRepo() *fakeLessonRepo {
	return &fakeLessonRepo{store: map[string]*domain.Lesson{}}
}

func (f *fakeLessonRepo) Save(_ context.Context, e *domain.Lesson) error {
	f.saveCalls++
	if f.saveErr != nil {
		return f.saveErr
	}
	f.store[e.ID()] = e
	return nil
}
func (f *fakeLessonRepo) FindByID(_ context.Context, id string) (*domain.Lesson, error) {
	f.findCalls++
	if f.findErr != nil {
		return nil, f.findErr
	}
	if e, ok := f.store[id]; ok {
		return e, nil
	}
	return nil, outputport.ErrNotFound
}
func (f *fakeLessonRepo) List(_ context.Context, limit, offset int) ([]*domain.Lesson, error) {
	f.listCalls++
	if f.listErr != nil {
		return nil, f.listErr
	}
	out := make([]*domain.Lesson, 0, len(f.store))
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

// ListByCourse mirrors the auto-emitted port method (#403 sub-3).
// The fake's body returns nil/nil — the service-layer tests in this file
// don't exercise ListBy<Ref>, but the method MUST exist or the
// `var _ outputport.LessonRepository = (*fakeLessonRepo)(nil)`
// assertion below fails to compile.
func (f *fakeLessonRepo) ListByCourse(_ context.Context, refID string, limit, offset int) ([]*domain.Lesson, error) {
	return nil, nil
}

// CountByCourse mirrors the auto-emitted port method (#2202). Returns 0/nil
// — the service-layer tests don't exercise CountBy<Ref> directly, but the
// method MUST exist or the interface-satisfaction assertion below fails to
// compile.
func (f *fakeLessonRepo) CountByCourse(_ context.Context, refID string) (int, error) {
	return 0, nil
}

// ListByCourseSince mirrors the auto-emitted keyset-paginated sibling
// of ListByCourse on the outbound port (#4237). Returns nil/nil — the
// method MUST exist or the interface-satisfaction assertion below fails to
// compile.
func (f *fakeLessonRepo) ListByCourseSince(_ context.Context, refID string, afterCreatedAt time.Time, afterID string, limit int) ([]*domain.Lesson, error) {
	return nil, nil
}

// ListByModule mirrors the auto-emitted port method (#403 sub-3).
// The fake's body returns nil/nil — the service-layer tests in this file
// don't exercise ListBy<Ref>, but the method MUST exist or the
// `var _ outputport.LessonRepository = (*fakeLessonRepo)(nil)`
// assertion below fails to compile.
func (f *fakeLessonRepo) ListByModule(_ context.Context, refID string, limit, offset int) ([]*domain.Lesson, error) {
	return nil, nil
}

// CountByModule mirrors the auto-emitted port method (#2202). Returns 0/nil
// — the service-layer tests don't exercise CountBy<Ref> directly, but the
// method MUST exist or the interface-satisfaction assertion below fails to
// compile.
func (f *fakeLessonRepo) CountByModule(_ context.Context, refID string) (int, error) {
	return 0, nil
}

// ListByModuleSince mirrors the auto-emitted keyset-paginated sibling
// of ListByModule on the outbound port (#4237). Returns nil/nil — the
// method MUST exist or the interface-satisfaction assertion below fails to
// compile.
func (f *fakeLessonRepo) ListByModuleSince(_ context.Context, refID string, afterCreatedAt time.Time, afterID string, limit int) ([]*domain.Lesson, error) {
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
func (f *fakeLessonRepo) ListFiltered(_ context.Context, _ string, _ map[string]string, limit, offset int) ([]*domain.Lesson, error) {
	if f.listErr != nil {
		return nil, f.listErr
	}
	out := make([]*domain.Lesson, 0, len(f.store))
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
func (f *fakeLessonRepo) ListOptions(_ context.Context) ([]outputport.LessonOptionRow, error) {
	return nil, nil
}

func (f *fakeLessonRepo) Update(_ context.Context, e *domain.Lesson) error {
	f.updateCalls++
	if f.updateErr != nil {
		return f.updateErr
	}
	f.store[e.ID()] = e
	return nil
}
func (f *fakeLessonRepo) Delete(_ context.Context, id string) error {
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

// Compile-time assertion: fakeLessonRepo must satisfy
// outputport.LessonRepository. Adding/removing methods on the
// outbound port without updating the fake breaks this line at compile
// time — the contract this whole test file pins.
var _ outputport.LessonRepository = (*fakeLessonRepo)(nil)

// fakeProgressOnDeleteRepo is a minimal stub for the on_delete
// child repository the service's Delete probes through ListByLesson
// (restrict existence check / cascade page loop). It returns no children, so
// Delete proceeds unobstructed in these tests — the restrict-409 and cascade
// behaviors are pinned by the generator's e2e suite against a real backend.
// The interface embed satisfies progressrepo.ProgressRepository at compile
// time; every other method is unreachable from the delete path and panics if
// invoked — a regression signal, not a test-design issue.
type fakeProgressOnDeleteRepo struct {
	progressrepo.ProgressRepository
}

func (f *fakeProgressOnDeleteRepo) ListByLesson(_ context.Context, _ string, _, _ int) ([]*progressdomain.Progress, error) {
	return nil, nil
}

var _ progressrepo.ProgressRepository = (*fakeProgressOnDeleteRepo)(nil)

// fakeQuestionOnDeleteRepo is a minimal stub for the on_delete
// child repository the service's Delete probes through ListByLesson
// (restrict existence check / cascade page loop). It returns no children, so
// Delete proceeds unobstructed in these tests — the restrict-409 and cascade
// behaviors are pinned by the generator's e2e suite against a real backend.
// The interface embed satisfies questionrepo.QuestionRepository at compile
// time; every other method is unreachable from the delete path and panics if
// invoked — a regression signal, not a test-design issue.
type fakeQuestionOnDeleteRepo struct {
	questionrepo.QuestionRepository
}

func (f *fakeQuestionOnDeleteRepo) ListByLesson(_ context.Context, _ string, _, _ int) ([]*questiondomain.Question, error) {
	return nil, nil
}

var _ questionrepo.QuestionRepository = (*fakeQuestionOnDeleteRepo)(nil)

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
func newServiceWithFake(t *testing.T) (*Service, *fakeLessonRepo) {
	t.Helper()
	repo := newFakeLessonRepo()
	// Ref-validation dependencies are passed as nil. The sentinel tests
	// below exercise paths (GetByID, Delete) that do not invoke
	// validateRefs, so nil deps are never dereferenced. Tests that need
	// to exercise ref validation can wire non-nil stubs here.
	svc := NewService(repo, nil, nil, &fakeProgressOnDeleteRepo{}, &fakeQuestionOnDeleteRepo{}, txmanager.NewNoop())
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
// slowFake<Target>Repo is a minimal fake for each same-context ref's
// repository used in the multi-ref race test (#1789). It embeds the full
// interface via the struct embed trick (satisfying the interface at
// compile-time) but only implements the FindByID path that validateRefs
// actually calls. All other methods are unreachable from validateRefs
// and will panic if invoked — that would indicate a regression that
// needs a full test coverage upgrade, not a test-design issue.

type slowFakeCourseRepo struct {
	courserepo.CourseRepository // embed for compile-time interface satisfaction
	sleepDur                    time.Duration
}

func (r *slowFakeCourseRepo) FindByID(_ context.Context, _ string) (*coursedomain.Course, error) {
	time.Sleep(r.sleepDur)
	return nil, courserepo.ErrNotFound
}

var _ courserepo.CourseRepository = (*slowFakeCourseRepo)(nil)

type slowFakeModuleRepo struct {
	modulerepo.ModuleRepository // embed for compile-time interface satisfaction
	sleepDur                    time.Duration
}

func (r *slowFakeModuleRepo) FindByID(_ context.Context, _ string) (*moduledomain.Module, error) {
	time.Sleep(r.sleepDur)
	return nil, modulerepo.ErrNotFound
}

var _ modulerepo.ModuleRepository = (*slowFakeModuleRepo)(nil)

// TestService_MultiRef_Create_Race drives Create with 2+ ref fields
// against slow fakes that sleep in FindByID — run with -race to detect
// concurrent access to a shared connection object. Pre-hoist (#1789)
// the goroutines ran inside WithTransaction and shared the txmanager's
// context; post-hoist they run on the outer ctx and each fake gets
// its own independent call. The test expects Create to fail with an
// InvalidReference error (all ref IDs are non-empty but every slow
// fake returns ErrNotFound). saveCalls==0 confirms the transaction was
// never entered — the pre-tx validateRefs check short-circuits correctly.
func TestService_MultiRef_Create_Race(t *testing.T) {
	repo := newFakeLessonRepo()
	svc := NewService(repo,
		&slowFakeCourseRepo{sleepDur: 5 * time.Millisecond},
		&slowFakeModuleRepo{sleepDur: 5 * time.Millisecond}, &fakeProgressOnDeleteRepo{}, &fakeQuestionOnDeleteRepo{}, txmanager.NewNoop())

	_, err := svc.Create(context.Background(), inputport.CreateLessonCommand{
		CourseID:  "non-empty-ref-id",
		ModuleID:  "non-empty-ref-id",
		Slug:      "v-slug",
		Title:     "v-title",
		Position:  1,
		Minutes:   1,
		Kind:      "v-kind",
		Simulator: "v-simulator",
		Body:      "v-body",
	})
	if err == nil {
		t.Errorf("Create with missing refs must return an InvalidReference error, got nil")
	}
	if repo.saveCalls != 0 {
		t.Errorf("repo.Save called %d times (want 0 — validateRefs must short-circuit before the tx)", repo.saveCalls)
	}
}

// TestService_Ref_GetByID_Happy pins the read path for a ref-bearing
// entity: a pre-seeded entity is returned via FindByID and surfaced through
// the response shape. Seeded via domain.LoadLesson (the storage-
// rehydration constructor, which skips validation, incl. required-field
// checks) rather than svc.Create, and GetByID never calls validateRefs
// (#3896) — so the nil ref-lookup dependencies from newServiceWithFake are
// never dereferenced, regardless of whether any ref field is required.
func TestService_Ref_GetByID_Happy(t *testing.T) {
	svc, repo := newServiceWithFake(t)
	seed := domain.LoadLesson("test-id", "v-course_id", "v-module_id", "v-slug", "v-title", 1, 1, "reading", "v-simulator", "v-body", time.Now(), time.Now())
	repo.store["test-id"] = seed
	resp, err := svc.GetByID(context.Background(), inputport.GetLessonByIDQuery{ID: "test-id"})
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
// to inputport's ErrLessonNotFound (which carries errcat.NotFound,
// mapped by every transport to 404). The GetByID path does not touch
// any ref-lookup dependency — nil deps are safe here.
func TestService_Ref_GetByID_NotFound(t *testing.T) {
	svc, _ := newServiceWithFake(t)
	_, err := svc.GetByID(context.Background(), inputport.GetLessonByIDQuery{ID: "missing"})
	if !errors.Is(err, inputport.ErrLessonNotFound) {
		t.Errorf("GetByID miss: got %v, want ErrLessonNotFound", err)
	}
}

// TestService_Ref_List_Happy pins the list path for a ref-bearing entity:
// the service returns one response per stored entity, in any order. Seeded
// via domain.LoadLesson (skips validation) and List never calls
// validateRefs (#3896) — so the nil ref-lookup dependencies from
// newServiceWithFake are never dereferenced.
func TestService_Ref_List_Happy(t *testing.T) {
	svc, repo := newServiceWithFake(t)
	for _, id := range []string{"id-1", "id-2", "id-3"} {
		repo.store[id] = domain.LoadLesson(id, "v-course_id", "v-module_id", "v-slug", "v-title", 1, 1, "reading", "v-simulator", "v-body", time.Now(), time.Now())
	}
	resp, err := svc.List(context.Background(), inputport.ListLessonQuery{Limit: 0, Offset: 0})
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
// surfaces. Seeded via domain.LoadLesson (skips validation) and
// Delete never calls validateRefs (#3896) — so the nil ref-lookup
// dependencies from newServiceWithFake are never dereferenced.
func TestService_Ref_Delete_Happy(t *testing.T) {
	svc, repo := newServiceWithFake(t)
	repo.store["test-id"] = domain.LoadLesson("test-id", "v-course_id", "v-module_id", "v-slug", "v-title", 1, 1, "reading", "v-simulator", "v-body", time.Now(), time.Now())
	if err := svc.Delete(context.Background(), inputport.DeleteLessonCommand{ID: "test-id"}); err != nil {
		t.Fatalf("Delete: %v", err)
	}
	if repo.deleteCalls != 1 {
		t.Errorf("Delete calls = %d, want 1", repo.deleteCalls)
	}
}

// TestService_Ref_Delete_NotFound pins the delete sentinel-mapping rule for
// ref-bearing entities: outputport.ErrNotFound from the FindByID step
// surfaces as inputport.ErrLessonNotFound (errcat.NotFound → 404).
// The Delete path does not touch any ref-lookup dependency — nil deps
// are safe here.
func TestService_Ref_Delete_NotFound(t *testing.T) {
	svc, _ := newServiceWithFake(t)
	err := svc.Delete(context.Background(), inputport.DeleteLessonCommand{ID: "missing"})
	if !errors.Is(err, inputport.ErrLessonNotFound) {
		t.Errorf("Delete miss: got %v, want ErrLessonNotFound", err)
	}
}

// searchOptionCatalogue is the fixed catalogue the #5078 Options tests serve.
var searchOptionCatalogue = []outputport.LessonOptionRow{
	{ID: "id-1", Label: "Alpha"},
	{ID: "id-2", Label: "alpine ski"},
	{ID: "id-3", Label: "Beta 100%"},
	{ID: "id-4", Label: "o'brien"},
}

// searchableOptionsRepo is a repository that offers the OPTIONAL
// outputport.LessonOptionsSearcher capability: it records what the service
// hands it, so the tests can pin that a narrowed Options call reaches the
// store (where the 1000-row LIMIT is applied AFTER the predicates) instead of
// being filtered in memory.
type searchableOptionsRepo struct {
	*fakeLessonRepo
	listCalls, searchCalls int
	filter                 outputport.LessonOptionsFilter
}

func (r *searchableOptionsRepo) ListOptions(_ context.Context) ([]outputport.LessonOptionRow, error) {
	r.listCalls++
	return searchOptionCatalogue, nil
}

func (r *searchableOptionsRepo) SearchOptions(_ context.Context, f outputport.LessonOptionsFilter) ([]outputport.LessonOptionRow, error) {
	r.searchCalls++
	r.filter = f
	return []outputport.LessonOptionRow{{ID: "from-store", Label: "from the store"}}, nil
}

// windowedOptionsRepo models a hand-written or pre-#5078 adapter: it has
// ListOptions only, so it still satisfies the output port (the capability is a
// separate interface) but cannot narrow in the store.
type windowedOptionsRepo struct {
	*fakeLessonRepo
}

func (windowedOptionsRepo) ListOptions(_ context.Context) ([]outputport.LessonOptionRow, error) {
	return searchOptionCatalogue, nil
}

// optionsQuery builds an Options query for the #5078 tests.
func optionsQuery(search string, ids ...string) inputport.LessonOptionsQuery {
	return inputport.LessonOptionsQuery{
		Search: search,
		IDs:    ids,
	}
}

// TestService_Options_NarrowedQueryReachesTheStore pins that Search and IDs are
// pushed to the store through the optional OptionsSearcher capability (#5078)
// — and that a plain Options call keeps using ListOptions.
func TestService_Options_NarrowedQueryReachesTheStore(t *testing.T) {
	ctx := context.Background()
	repo := &searchableOptionsRepo{fakeLessonRepo: &fakeLessonRepo{}}
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
	repo := &searchableOptionsRepo{fakeLessonRepo: &fakeLessonRepo{}}
	svc := &Service{repo: repo}
	for name, q := range map[string]inputport.LessonOptionsQuery{
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
	repo := &searchableOptionsRepo{fakeLessonRepo: &fakeLessonRepo{}}
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
	repo := &searchableOptionsRepo{fakeLessonRepo: &fakeLessonRepo{}}
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
	var windowed outputport.LessonRepository = windowedOptionsRepo{&fakeLessonRepo{}}
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
	var repo outputport.LessonRepository = windowedOptionsRepo{&fakeLessonRepo{}}
	if _, ok := repo.(outputport.LessonOptionsSearcher); ok {
		t.Fatal("control: windowedOptionsRepo must NOT offer the OptionsSearcher capability")
	}
	svc := &Service{repo: repo}
	ids := func(opts []inputport.LessonOption) string {
		out := ""
		for _, o := range opts {
			out += o.ID + ","
		}
		return out
	}
	for _, tc := range []struct {
		name string
		q    inputport.LessonOptionsQuery
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
