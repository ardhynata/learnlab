package learnerservice

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/inxpired/hexago/runtime/txmanager"

	domain "example.com/learnlab/internal/core/domain/learner"
	progressdomain "example.com/learnlab/internal/core/domain/progress"
	inputport "example.com/learnlab/internal/core/ports/input/learner"
	outputport "example.com/learnlab/internal/core/ports/output/learner"
	progressrepo "example.com/learnlab/internal/core/ports/output/progress"
)

// fakeLearnerRepo is an in-memory implementation of the outbound port for
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
type fakeLearnerRepo struct {
	store map[string]*domain.Learner

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

func newFakeLearnerRepo() *fakeLearnerRepo {
	return &fakeLearnerRepo{store: map[string]*domain.Learner{}}
}

func (f *fakeLearnerRepo) Save(_ context.Context, e *domain.Learner) error {
	f.saveCalls++
	if f.saveErr != nil {
		return f.saveErr
	}
	f.store[e.ID()] = e
	return nil
}
func (f *fakeLearnerRepo) FindByID(_ context.Context, id string) (*domain.Learner, error) {
	f.findCalls++
	if f.findErr != nil {
		return nil, f.findErr
	}
	if e, ok := f.store[id]; ok {
		return e, nil
	}
	return nil, outputport.ErrNotFound
}
func (f *fakeLearnerRepo) List(_ context.Context, limit, offset int) ([]*domain.Learner, error) {
	f.listCalls++
	if f.listErr != nil {
		return nil, f.listErr
	}
	out := make([]*domain.Learner, 0, len(f.store))
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

// ListFiltered mirrors the auto-emitted port method added when
// filter.searchable + a search/q filter field are declared (#1300), or when
// an enum-equality filter is present (UX-B). Returns the full store slice (no
// actual filtering) — interface satisfaction is the load-bearing contract
// here; the ILIKE/LIKE/equality behavior is a repository-adapter concern, not
// a service-layer concern, and is covered by the outbound-adapter repository
// tests. The method MUST exist or the compile-time interface assertion below
// fails.
func (f *fakeLearnerRepo) ListFiltered(_ context.Context, _ string, limit, offset int) ([]*domain.Learner, error) {
	if f.listErr != nil {
		return nil, f.listErr
	}
	out := make([]*domain.Learner, 0, len(f.store))
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
func (f *fakeLearnerRepo) ListOptions(_ context.Context) ([]outputport.LearnerOptionRow, error) {
	return nil, nil
}

func (f *fakeLearnerRepo) Update(_ context.Context, e *domain.Learner) error {
	f.updateCalls++
	if f.updateErr != nil {
		return f.updateErr
	}
	f.store[e.ID()] = e
	return nil
}
func (f *fakeLearnerRepo) Delete(_ context.Context, id string) error {
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

// Compile-time assertion: fakeLearnerRepo must satisfy
// outputport.LearnerRepository. Adding/removing methods on the
// outbound port without updating the fake breaks this line at compile
// time — the contract this whole test file pins.
var _ outputport.LearnerRepository = (*fakeLearnerRepo)(nil)

// fakeProgressOnDeleteRepo is a minimal stub for the on_delete
// child repository the service's Delete probes through ListByLearner
// (restrict existence check / cascade page loop). It returns no children, so
// Delete proceeds unobstructed in these tests — the restrict-409 and cascade
// behaviors are pinned by the generator's e2e suite against a real backend.
// The interface embed satisfies progressrepo.ProgressRepository at compile
// time; every other method is unreachable from the delete path and panics if
// invoked — a regression signal, not a test-design issue.
type fakeProgressOnDeleteRepo struct {
	progressrepo.ProgressRepository
}

func (f *fakeProgressOnDeleteRepo) ListByLearner(_ context.Context, _ string, _, _ int) ([]*progressdomain.Progress, error) {
	return nil, nil
}

var _ progressrepo.ProgressRepository = (*fakeProgressOnDeleteRepo)(nil)

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
func newServiceWithFake(t *testing.T) (*Service, *fakeLearnerRepo) {
	t.Helper()
	repo := newFakeLearnerRepo()
	svc := NewService(repo, &fakeProgressOnDeleteRepo{}, txmanager.NewNoop())
	return svc, repo
}

// TestService_Create_Happy pins the Create success path: the service
// builds a domain entity, calls repo.Save, and returns a response with
// the entity's fields surfaced through the entity getters.
func TestService_Create_Happy(t *testing.T) {
	svc, repo := newServiceWithFake(t)
	resp, err := svc.Create(context.Background(), inputport.CreateLearnerCommand{
		ID:   "test-id",
		Name: "v-name",
	})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	if resp == nil {
		t.Fatalf("Create returned nil response")
		return
	}
	if repo.saveCalls != 1 {
		t.Errorf("Save calls = %d, want 1", repo.saveCalls)
	}
}

// TestService_Create_AlreadyExists pins the conflict-mapping rule:
// outputport.ErrAlreadyExists at the repo boundary surfaces as the
// inputport-level ErrLearnerAlreadyExists sentinel — which carries
// errcat.Conflict and lets every transport adapter map to 409 without
// per-entity plumbing.
func TestService_Create_AlreadyExists(t *testing.T) {
	svc, repo := newServiceWithFake(t)
	repo.saveErr = outputport.ErrAlreadyExists
	_, err := svc.Create(context.Background(), inputport.CreateLearnerCommand{
		ID:   "test-id",
		Name: "v-name",
	})
	if !errors.Is(err, inputport.ErrLearnerAlreadyExists) {
		t.Errorf("Create on duplicate: got %v, want ErrLearnerAlreadyExists", err)
	}
}

// TestService_GetByID_Happy pins the read path: a pre-seeded entity is
// returned via FindByID and surfaced through the response shape.
func TestService_GetByID_Happy(t *testing.T) {
	svc, repo := newServiceWithFake(t)
	seed := domain.LoadLearner("test-id", "v-name", time.Now(), time.Now())
	repo.store["test-id"] = seed
	resp, err := svc.GetByID(context.Background(), inputport.GetLearnerByIDQuery{ID: "test-id"})
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

// TestService_GetByID_NotFound pins the sentinel mapping rule:
// outputport.ErrNotFound at the repo boundary lifts to inputport's
// ErrLearnerNotFound (which carries errcat.NotFound, mapped by every
// transport to 404).
func TestService_GetByID_NotFound(t *testing.T) {
	svc, _ := newServiceWithFake(t)
	_, err := svc.GetByID(context.Background(), inputport.GetLearnerByIDQuery{ID: "missing"})
	if !errors.Is(err, inputport.ErrLearnerNotFound) {
		t.Errorf("GetByID miss: got %v, want ErrLearnerNotFound", err)
	}
}

// TestService_List_Happy pins the list path: the service returns one
// response per stored entity, in any order.
func TestService_List_Happy(t *testing.T) {
	svc, repo := newServiceWithFake(t)
	for _, id := range []string{"id-1", "id-2", "id-3"} {
		repo.store[id] = domain.LoadLearner(id, "v-name", time.Now(), time.Now())
	}
	resp, err := svc.List(context.Background(), inputport.ListLearnerQuery{Limit: 0, Offset: 0})
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

// TestService_Update_Happy pins the update path: the service finds the
// entity, applies the new values, persists, and returns the updated
// response.
func TestService_Update_Happy(t *testing.T) {
	svc, repo := newServiceWithFake(t)
	resp, err := svc.Update(context.Background(), seedUpdateHappy(repo))
	if err != nil {
		t.Fatalf("Update: %v", err)
	}
	if resp == nil {
		t.Fatalf("Update returned nil response")
		return
	}
	if repo.updateCalls != 1 {
		t.Errorf("Update calls = %d, want 1", repo.updateCalls)
	}
}

// TestService_Update_AlreadyExists pins the conflict-mapping rule on the
// Update path, exactly as TestService_Create_AlreadyExists does on Create:
// outputport.ErrAlreadyExists from repo.Update — a UNIQUE index refusing the
// new values, whichever field or hand-written schema declared it — surfaces
// as the inputport-level sentinel, which carries errcat.Conflict (409).
// Before #4972 only a spec with a unique REF mapped it; every other entity
// returned the bare repository error, which no transport categorises (500).
func TestService_Update_AlreadyExists(t *testing.T) {
	svc, repo := newServiceWithFake(t)
	cmd := seedUpdateHappy(repo)
	repo.updateErr = outputport.ErrAlreadyExists
	_, err := svc.Update(context.Background(), cmd)
	if repo.updateCalls != 1 {
		t.Fatalf("Update calls = %d, want 1 — the conflict must come from repo.Update (err = %v)", repo.updateCalls, err)
	}
	if !errors.Is(err, inputport.ErrLearnerAlreadyExists) {
		t.Errorf("Update on duplicate: got %v, want ErrLearnerAlreadyExists", err)
	}
}

// seedUpdateHappy stores the "old-" learner the Update tests start
// from and returns the command that updates it to "new-" values.
func seedUpdateHappy(repo *fakeLearnerRepo) inputport.UpdateLearnerCommand {
	repo.store["test-id"] = domain.LoadLearner("test-id", "old-name", time.Now(), time.Now())
	return inputport.UpdateLearnerCommand{
		ID:   "test-id",
		Name: "new-name",
	}
}

// TestService_Update_NotFound pins the sentinel mapping for the FindByID
// step in Update — when the entity does not exist, the service returns
// inputport.ErrLearnerNotFound (errcat.NotFound → 404).
func TestService_Update_NotFound(t *testing.T) {
	svc, repo := newServiceWithFake(t)
	err := errFromUpdate(svc, "missing")
	if !errors.Is(err, inputport.ErrLearnerNotFound) {
		t.Errorf("Update miss: got %v, want ErrLearnerNotFound", err)
	}
	if repo.updateCalls != 0 {
		t.Errorf("repo.Update was called %d times on a missing entity (want 0 — service short-circuits)", repo.updateCalls)
	}
}

// errFromUpdate is a helper that exists only to keep the table-row
// arrange/act/assert split readable when many fields exist. It builds a
// minimal valid command and returns whatever Update yields.
func errFromUpdate(svc *Service, id string) error {
	_, err := svc.Update(context.Background(), inputport.UpdateLearnerCommand{
		ID:   id,
		Name: "v-name",
	})
	return err
}

// TestService_Delete_Happy pins the delete path: the service calls the
// repo, the entity disappears, and no error surfaces.
func TestService_Delete_Happy(t *testing.T) {
	svc, repo := newServiceWithFake(t)
	repo.store["test-id"] = domain.LoadLearner("test-id", "v-name", time.Now(), time.Now())
	if err := svc.Delete(context.Background(), inputport.DeleteLearnerCommand{ID: "test-id"}); err != nil {
		t.Fatalf("Delete: %v", err)
	}
	if repo.deleteCalls != 1 {
		t.Errorf("Delete calls = %d, want 1", repo.deleteCalls)
	}
}

// TestService_Delete_NotFound pins the sentinel mapping rule for delete:
// outputport.ErrNotFound from the repo lifts to inputport.ErrLearnerNotFound.
func TestService_Delete_NotFound(t *testing.T) {
	svc, _ := newServiceWithFake(t)
	err := svc.Delete(context.Background(), inputport.DeleteLearnerCommand{ID: "missing"})
	if !errors.Is(err, inputport.ErrLearnerNotFound) {
		t.Errorf("Delete miss: got %v, want ErrLearnerNotFound", err)
	}
}

// searchOptionCatalogue is the fixed catalogue the #5078 Options tests serve.
var searchOptionCatalogue = []outputport.LearnerOptionRow{
	{ID: "id-1", Label: "Alpha"},
	{ID: "id-2", Label: "alpine ski"},
	{ID: "id-3", Label: "Beta 100%"},
	{ID: "id-4", Label: "o'brien"},
}

// searchableOptionsRepo is a repository that offers the OPTIONAL
// outputport.LearnerOptionsSearcher capability: it records what the service
// hands it, so the tests can pin that a narrowed Options call reaches the
// store (where the 1000-row LIMIT is applied AFTER the predicates) instead of
// being filtered in memory.
type searchableOptionsRepo struct {
	*fakeLearnerRepo
	listCalls, searchCalls int
	filter                 outputport.LearnerOptionsFilter
}

func (r *searchableOptionsRepo) ListOptions(_ context.Context) ([]outputport.LearnerOptionRow, error) {
	r.listCalls++
	return searchOptionCatalogue, nil
}

func (r *searchableOptionsRepo) SearchOptions(_ context.Context, f outputport.LearnerOptionsFilter) ([]outputport.LearnerOptionRow, error) {
	r.searchCalls++
	r.filter = f
	return []outputport.LearnerOptionRow{{ID: "from-store", Label: "from the store"}}, nil
}

// windowedOptionsRepo models a hand-written or pre-#5078 adapter: it has
// ListOptions only, so it still satisfies the output port (the capability is a
// separate interface) but cannot narrow in the store.
type windowedOptionsRepo struct {
	*fakeLearnerRepo
}

func (windowedOptionsRepo) ListOptions(_ context.Context) ([]outputport.LearnerOptionRow, error) {
	return searchOptionCatalogue, nil
}

// optionsQuery builds an Options query for the #5078 tests.
func optionsQuery(search string, ids ...string) inputport.LearnerOptionsQuery {
	return inputport.LearnerOptionsQuery{
		Search: search,
		IDs:    ids,
	}
}

// TestService_Options_NarrowedQueryReachesTheStore pins that Search and IDs are
// pushed to the store through the optional OptionsSearcher capability (#5078)
// — and that a plain Options call keeps using ListOptions.
func TestService_Options_NarrowedQueryReachesTheStore(t *testing.T) {
	ctx := context.Background()
	repo := &searchableOptionsRepo{fakeLearnerRepo: &fakeLearnerRepo{}}
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
	repo := &searchableOptionsRepo{fakeLearnerRepo: &fakeLearnerRepo{}}
	svc := &Service{repo: repo}
	for name, q := range map[string]inputport.LearnerOptionsQuery{
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
	repo := &searchableOptionsRepo{fakeLearnerRepo: &fakeLearnerRepo{}}
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
	repo := &searchableOptionsRepo{fakeLearnerRepo: &fakeLearnerRepo{}}
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
	var windowed outputport.LearnerRepository = windowedOptionsRepo{&fakeLearnerRepo{}}
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
	var repo outputport.LearnerRepository = windowedOptionsRepo{&fakeLearnerRepo{}}
	if _, ok := repo.(outputport.LearnerOptionsSearcher); ok {
		t.Fatal("control: windowedOptionsRepo must NOT offer the OptionsSearcher capability")
	}
	svc := &Service{repo: repo}
	ids := func(opts []inputport.LearnerOption) string {
		out := ""
		for _, o := range opts {
			out += o.ID + ","
		}
		return out
	}
	for _, tc := range []struct {
		name string
		q    inputport.LearnerOptionsQuery
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
