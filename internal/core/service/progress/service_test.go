package progressservice

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/inxpired/hexago-runtime/txmanager"

	learnerdomain "example.com/learnlab/internal/core/domain/learner"
	lessondomain "example.com/learnlab/internal/core/domain/lesson"
	domain "example.com/learnlab/internal/core/domain/progress"
	inputport "example.com/learnlab/internal/core/ports/input/progress"
	learnerrepo "example.com/learnlab/internal/core/ports/output/learner"
	lessonrepo "example.com/learnlab/internal/core/ports/output/lesson"
	outputport "example.com/learnlab/internal/core/ports/output/progress"
)

// fakeProgressRepo is an in-memory implementation of the outbound port for
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
type fakeProgressRepo struct {
	store map[string]*domain.Progress

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

func newFakeProgressRepo() *fakeProgressRepo {
	return &fakeProgressRepo{store: map[string]*domain.Progress{}}
}

func (f *fakeProgressRepo) Save(_ context.Context, e *domain.Progress) error {
	f.saveCalls++
	if f.saveErr != nil {
		return f.saveErr
	}
	f.store[e.ID()] = e
	return nil
}
func (f *fakeProgressRepo) FindByID(_ context.Context, id string) (*domain.Progress, error) {
	f.findCalls++
	if f.findErr != nil {
		return nil, f.findErr
	}
	if e, ok := f.store[id]; ok {
		return e, nil
	}
	return nil, outputport.ErrNotFound
}
func (f *fakeProgressRepo) List(_ context.Context, limit, offset int) ([]*domain.Progress, error) {
	f.listCalls++
	if f.listErr != nil {
		return nil, f.listErr
	}
	out := make([]*domain.Progress, 0, len(f.store))
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

// ListByLearner mirrors the auto-emitted port method (#403 sub-3).
// The fake's body returns nil/nil — the service-layer tests in this file
// don't exercise ListBy<Ref>, but the method MUST exist or the
// `var _ outputport.ProgressRepository = (*fakeProgressRepo)(nil)`
// assertion below fails to compile.
func (f *fakeProgressRepo) ListByLearner(_ context.Context, refID string, limit, offset int) ([]*domain.Progress, error) {
	return nil, nil
}

// CountByLearner mirrors the auto-emitted port method (#2202). Returns 0/nil
// — the service-layer tests don't exercise CountBy<Ref> directly, but the
// method MUST exist or the interface-satisfaction assertion below fails to
// compile.
func (f *fakeProgressRepo) CountByLearner(_ context.Context, refID string) (int, error) {
	return 0, nil
}

// ListByLearnerSince mirrors the auto-emitted keyset-paginated sibling
// of ListByLearner on the outbound port (#4237). Returns nil/nil — the
// method MUST exist or the interface-satisfaction assertion below fails to
// compile.
func (f *fakeProgressRepo) ListByLearnerSince(_ context.Context, refID string, afterCreatedAt time.Time, afterID string, limit int) ([]*domain.Progress, error) {
	return nil, nil
}

// ListByLesson mirrors the auto-emitted port method (#403 sub-3).
// The fake's body returns nil/nil — the service-layer tests in this file
// don't exercise ListBy<Ref>, but the method MUST exist or the
// `var _ outputport.ProgressRepository = (*fakeProgressRepo)(nil)`
// assertion below fails to compile.
func (f *fakeProgressRepo) ListByLesson(_ context.Context, refID string, limit, offset int) ([]*domain.Progress, error) {
	return nil, nil
}

// CountByLesson mirrors the auto-emitted port method (#2202). Returns 0/nil
// — the service-layer tests don't exercise CountBy<Ref> directly, but the
// method MUST exist or the interface-satisfaction assertion below fails to
// compile.
func (f *fakeProgressRepo) CountByLesson(_ context.Context, refID string) (int, error) {
	return 0, nil
}

// ListByLessonSince mirrors the auto-emitted keyset-paginated sibling
// of ListByLesson on the outbound port (#4237). Returns nil/nil — the
// method MUST exist or the interface-satisfaction assertion below fails to
// compile.
func (f *fakeProgressRepo) ListByLessonSince(_ context.Context, refID string, afterCreatedAt time.Time, afterID string, limit int) ([]*domain.Progress, error) {
	return nil, nil
}

func (f *fakeProgressRepo) Update(_ context.Context, e *domain.Progress) error {
	f.updateCalls++
	if f.updateErr != nil {
		return f.updateErr
	}
	f.store[e.ID()] = e
	return nil
}
func (f *fakeProgressRepo) Delete(_ context.Context, id string) error {
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

// Compile-time assertion: fakeProgressRepo must satisfy
// outputport.ProgressRepository. Adding/removing methods on the
// outbound port without updating the fake breaks this line at compile
// time — the contract this whole test file pins.
var _ outputport.ProgressRepository = (*fakeProgressRepo)(nil)

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
func newServiceWithFake(t *testing.T) (*Service, *fakeProgressRepo) {
	t.Helper()
	repo := newFakeProgressRepo()
	// Ref-validation dependencies are passed as nil. The sentinel tests
	// below exercise paths (GetByID, Delete) that do not invoke
	// validateRefs, so nil deps are never dereferenced. Tests that need
	// to exercise ref validation can wire non-nil stubs here.
	svc := NewService(repo, nil, nil, txmanager.NewNoop())
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

type slowFakeLearnerRepo struct {
	learnerrepo.LearnerRepository // embed for compile-time interface satisfaction
	sleepDur                      time.Duration
}

func (r *slowFakeLearnerRepo) FindByID(_ context.Context, _ string) (*learnerdomain.Learner, error) {
	time.Sleep(r.sleepDur)
	return nil, learnerrepo.ErrNotFound
}

var _ learnerrepo.LearnerRepository = (*slowFakeLearnerRepo)(nil)

type slowFakeLessonRepo struct {
	lessonrepo.LessonRepository // embed for compile-time interface satisfaction
	sleepDur                    time.Duration
}

func (r *slowFakeLessonRepo) FindByID(_ context.Context, _ string) (*lessondomain.Lesson, error) {
	time.Sleep(r.sleepDur)
	return nil, lessonrepo.ErrNotFound
}

var _ lessonrepo.LessonRepository = (*slowFakeLessonRepo)(nil)

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
	repo := newFakeProgressRepo()
	svc := NewService(repo,
		&slowFakeLearnerRepo{sleepDur: 5 * time.Millisecond},
		&slowFakeLessonRepo{sleepDur: 5 * time.Millisecond}, txmanager.NewNoop())

	_, err := svc.Create(context.Background(), inputport.CreateProgressCommand{
		LearnerID: "non-empty-ref-id",
		LessonID:  "non-empty-ref-id",
		Completed: true,
		Score:     1,
		Total:     1,
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
// the response shape. Seeded via domain.LoadProgress (the storage-
// rehydration constructor, which skips validation, incl. required-field
// checks) rather than svc.Create, and GetByID never calls validateRefs
// (#3896) — so the nil ref-lookup dependencies from newServiceWithFake are
// never dereferenced, regardless of whether any ref field is required.
func TestService_Ref_GetByID_Happy(t *testing.T) {
	svc, repo := newServiceWithFake(t)
	seed := domain.LoadProgress("test-id", "v-learner_id", "v-lesson_id", true, 1, 1, time.Now(), time.Now())
	repo.store["test-id"] = seed
	resp, err := svc.GetByID(context.Background(), inputport.GetProgressByIDQuery{ID: "test-id"})
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
// to inputport's ErrProgressNotFound (which carries errcat.NotFound,
// mapped by every transport to 404). The GetByID path does not touch
// any ref-lookup dependency — nil deps are safe here.
func TestService_Ref_GetByID_NotFound(t *testing.T) {
	svc, _ := newServiceWithFake(t)
	_, err := svc.GetByID(context.Background(), inputport.GetProgressByIDQuery{ID: "missing"})
	if !errors.Is(err, inputport.ErrProgressNotFound) {
		t.Errorf("GetByID miss: got %v, want ErrProgressNotFound", err)
	}
}

// TestService_Ref_List_Happy pins the list path for a ref-bearing entity:
// the service returns one response per stored entity, in any order. Seeded
// via domain.LoadProgress (skips validation) and List never calls
// validateRefs (#3896) — so the nil ref-lookup dependencies from
// newServiceWithFake are never dereferenced.
func TestService_Ref_List_Happy(t *testing.T) {
	svc, repo := newServiceWithFake(t)
	for _, id := range []string{"id-1", "id-2", "id-3"} {
		repo.store[id] = domain.LoadProgress(id, "v-learner_id", "v-lesson_id", true, 1, 1, time.Now(), time.Now())
	}
	resp, err := svc.List(context.Background(), inputport.ListProgressQuery{Limit: 0, Offset: 0})
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
// surfaces. Seeded via domain.LoadProgress (skips validation) and
// Delete never calls validateRefs (#3896) — so the nil ref-lookup
// dependencies from newServiceWithFake are never dereferenced.
func TestService_Ref_Delete_Happy(t *testing.T) {
	svc, repo := newServiceWithFake(t)
	repo.store["test-id"] = domain.LoadProgress("test-id", "v-learner_id", "v-lesson_id", true, 1, 1, time.Now(), time.Now())
	if err := svc.Delete(context.Background(), inputport.DeleteProgressCommand{ID: "test-id"}); err != nil {
		t.Fatalf("Delete: %v", err)
	}
	if repo.deleteCalls != 1 {
		t.Errorf("Delete calls = %d, want 1", repo.deleteCalls)
	}
}

// TestService_Ref_Delete_NotFound pins the delete sentinel-mapping rule for
// ref-bearing entities: outputport.ErrNotFound from the FindByID step
// surfaces as inputport.ErrProgressNotFound (errcat.NotFound → 404).
// The Delete path does not touch any ref-lookup dependency — nil deps
// are safe here.
func TestService_Ref_Delete_NotFound(t *testing.T) {
	svc, _ := newServiceWithFake(t)
	err := svc.Delete(context.Background(), inputport.DeleteProgressCommand{ID: "missing"})
	if !errors.Is(err, inputport.ErrProgressNotFound) {
		t.Errorf("Delete miss: got %v, want ErrProgressNotFound", err)
	}
}
