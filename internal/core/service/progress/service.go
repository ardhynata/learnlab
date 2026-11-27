package progressservice

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"sync" // validateRefs concurrent fan-out (#1696 item 5) — stdlib only, no new dep
	"time"

	domain "example.com/learnlab/internal/core/domain/progress"
	inputport "example.com/learnlab/internal/core/ports/input/progress"
	learnerrepo "example.com/learnlab/internal/core/ports/output/learner"
	lessonrepo "example.com/learnlab/internal/core/ports/output/lesson"
	outputport "example.com/learnlab/internal/core/ports/output/progress"
	"github.com/inxpired/hexago-runtime/txmanager"
)

// generateProgressID returns a random 128-bit hex identifier. Used by
// Create when the client does not supply an ID. Swap for a UUID/ULID library
// in application code if you need a specific format.
func generateProgressID() string {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		// A crypto/rand.Read failure means the OS entropy source is
		// unavailable. Discarding the error would leave b all-zero and return
		// the constant id "00000000000000000000000000000000", silently
		// colliding every Create's primary key (#3381). Panic instead so the
		// failure is loud and immediate. crypto/rand.Read never returns an
		// error on Go 1.20+ (it panics internally on catastrophic failure), so
		// this guard is defense-in-depth; swap this generator for a UUID/ULID
		// library in application code to choose a different failure policy.
		panic("generateProgressID: crypto/rand.Read: " + err.Error())
	}
	return hex.EncodeToString(b[:])
}

var _ inputport.ProgressService = (*Service)(nil)

type Service struct {
	repo        outputport.ProgressRepository
	learnerRepo learnerrepo.LearnerRepository
	lessonRepo  lessonrepo.LessonRepository
	txManager   txmanager.TxManager
}

func NewService(
	repo outputport.ProgressRepository,
	learnerRepo learnerrepo.LearnerRepository,
	lessonRepo lessonrepo.LessonRepository,
	txManager txmanager.TxManager,
) *Service {
	return &Service{
		repo:        repo,
		learnerRepo: learnerRepo,
		lessonRepo:  lessonRepo,
		txManager:   txManager,
	}
}

// validateRefs checks that every referenced aggregate exists in its
// repository (same-context refs), via its lookup adapter (cross-context
// refs, Phase-3 M3b), or via its remote port (remote-refs, W4-e — http-
// client / grpc-client peers). Returns the matching inputport invalid-
// reference sentinel so the handler's mapper lifts it to 400.
//
// validateRefs is called BEFORE the write transaction opens (pre-tx
// precondition check). This is required for correctness on PostgreSQL:
// pgx.Tx is a single connection and NOT safe for concurrent use; calling
// validateRefs inside WithTransaction would cause goroutines to issue
// concurrent FindByID calls on the same pgx.Tx → protocol desync /
// data corruption (#1789). By running on the outer ctx each goroutine
// draws a fresh pooled connection — safe for all backends and
// behaviour-neutral for the validation result.
//
// With 2 refs the existence checks fan out concurrently
// (#1696 item 5): each ref is verified in its own goroutine via a
// stdlib sync.WaitGroup; each goroutine draws its own pooled connection
// from the cancel-capable ctx derived below. After Wait the first non-nil
// error by REF DECLARATION ORDER (not goroutine-finish order) is returned
// so the error surfaced is deterministic regardless of scheduling — it
// matches the sequential single-ref path's first-failing-ref rule and
// preserves every per-ref sentinel/error shape verbatim.
//
// A context.WithCancel derived from the caller's ctx is used so that once
// the first goroutine discovers an InvalidReference (or any error), the
// cancel call signals all still-running peers to abandon their in-flight
// RPCs (#2859). This is a latency optimisation: the result is already
// decided, so waiting on the slowest peer's full timeout is wasteful.
// The cancel is always deferred to ensure the derived ctx is cleaned up
// even when all refs are valid. The pgx.Tx constraint (#1789) is
// satisfied: each goroutine still draws a fresh pooled connection from
// the (now-cancellable) outer ctx, so no connection is shared.
func (s *Service) validateProgressRefs(ctx context.Context, learnerID string, lessonID string) error {
	refCtx, refCancel := context.WithCancel(ctx)
	defer refCancel()
	var refWG sync.WaitGroup
	refErrs := make([]error, 2)
	refWG.Add(1)
	go func() {
		defer refWG.Done()
		// Run the per-ref check against refCtx so that when another goroutine
		// calls refCancel (on first error) the in-flight RPC here gets
		// cancelled too, freeing the connection early (#2859).
		if err := func() (refErr error) {
			// #5091: a panic in ANY per-ref check (a nil lookup port, a bug in a
			// hand-written adapter) must not escape this goroutine — an
			// unrecovered goroutine panic exits the WHOLE process, where the
			// same panic on the request goroutine is contained by the HTTP
			// server's per-request recover. Convert it into this ref's error
			// so the request fails alone (500) and the server stays up.
			defer func() {
				if rec := recover(); rec != nil {
					refErr = errors.New("validateProgressRefs: recovered from a panic while checking learnerID")
				}
			}()
			if learnerID == "" {
				return nil
			}
			// Same-context ref: a missed lookup surfaces as the producer's
			// own ErrNotFound sentinel (declared in the target entity's
			// output port package — learnerrepo.ErrNotFound). Each generated
			// output port declares its own opaque sentinel so errors.Is does
			// pointer-identity comparison; using the consumer's self
			// outputport.ErrNotFound would NEVER match the target's sentinel
			// and the BadRequest translation would silently fall through to
			// the raw error → 5xx (#1311). Translate to the InvalidReference
			// sentinel so the handler's mapper lifts it to 400. Other
			// repository errors bubble up unchanged (handler routes them to
			// 5xx via errcat).
			if _, err := s.learnerRepo.FindByID(refCtx, learnerID); err != nil {
				if errors.Is(err, learnerrepo.ErrNotFound) {
					return inputport.ErrProgressLearnerIDInvalidReference
				}
				return err
			}
			return nil
		}(); err != nil {
			refErrs[0] = err
			refCancel() // abort sibling goroutines that are still in flight
		}
	}()
	refWG.Add(1)
	go func() {
		defer refWG.Done()
		// Run the per-ref check against refCtx so that when another goroutine
		// calls refCancel (on first error) the in-flight RPC here gets
		// cancelled too, freeing the connection early (#2859).
		if err := func() (refErr error) {
			// #5091: a panic in ANY per-ref check (a nil lookup port, a bug in a
			// hand-written adapter) must not escape this goroutine — an
			// unrecovered goroutine panic exits the WHOLE process, where the
			// same panic on the request goroutine is contained by the HTTP
			// server's per-request recover. Convert it into this ref's error
			// so the request fails alone (500) and the server stays up.
			defer func() {
				if rec := recover(); rec != nil {
					refErr = errors.New("validateProgressRefs: recovered from a panic while checking lessonID")
				}
			}()
			if lessonID == "" {
				return nil
			}
			// Same-context ref: a missed lookup surfaces as the producer's
			// own ErrNotFound sentinel (declared in the target entity's
			// output port package — lessonrepo.ErrNotFound). Each generated
			// output port declares its own opaque sentinel so errors.Is does
			// pointer-identity comparison; using the consumer's self
			// outputport.ErrNotFound would NEVER match the target's sentinel
			// and the BadRequest translation would silently fall through to
			// the raw error → 5xx (#1311). Translate to the InvalidReference
			// sentinel so the handler's mapper lifts it to 400. Other
			// repository errors bubble up unchanged (handler routes them to
			// 5xx via errcat).
			if _, err := s.lessonRepo.FindByID(refCtx, lessonID); err != nil {
				if errors.Is(err, lessonrepo.ErrNotFound) {
					return inputport.ErrProgressLessonIDInvalidReference
				}
				return err
			}
			return nil
		}(); err != nil {
			refErrs[1] = err
			refCancel() // abort sibling goroutines that are still in flight
		}
	}()
	refWG.Wait()
	// First non-nil error by ref-declaration index — deterministic
	// regardless of which goroutine finished first (#1696 item 5).
	//
	// #4395: a ref whose in-flight check was ABORTED by a sibling's refCancel
	// (once another ref was already found invalid, #2859) returns an error
	// wrapping context.Canceled. That aborted-in-flight error must NOT outrank a
	// genuine per-ref sentinel at a LATER declaration index: otherwise a
	// valid-but-slow ref[0] cancelled by an invalid fast ref[1] would surface
	// context.Canceled (→ 499) instead of the real InvalidReference sentinel
	// (→ 400), contradicting the "deterministic regardless of scheduling"
	// contract above. So return the first NON-cancelled non-nil error by
	// declaration index; fall back to a cancelled error only when EVERY non-nil
	// entry is context.Canceled (a genuinely cancelled caller ctx).
	var canceledErr error
	for _, err := range refErrs {
		switch {
		case err == nil:
			continue
		case errors.Is(err, context.Canceled):
			if canceledErr == nil {
				canceledErr = err
			}
		default:
			return err
		}
	}
	return canceledErr
}

func (s *Service) Create(ctx context.Context, cmd inputport.CreateProgressCommand) (*inputport.ProgressResponse, error) {
	// validateRefs runs PRE-TRANSACTION on the outer ctx so each goroutine
	// draws a fresh pooled connection — safe on PostgreSQL (pgx.Tx is not
	// concurrent-safe; running inside WithTransaction would cause goroutines
	// to share one connection → protocol desync, #1789).
	if err := s.validateProgressRefs(ctx, cmd.LearnerID, cmd.LessonID); err != nil {
		return nil, err
	}
	var result *inputport.ProgressResponse
	err := s.txManager.WithTransaction(ctx, func(ctx context.Context) error {
		if cmd.ID == "" {
			cmd.ID = generateProgressID()
		}
		e, err := domain.NewProgress(cmd.ID, cmd.LearnerID, cmd.LessonID, cmd.Completed, cmd.Score, cmd.Total)
		if err != nil {
			return err
		}
		if err := s.repo.Save(ctx, e); err != nil {
			if errors.Is(err, outputport.ErrAlreadyExists) {
				return inputport.ErrProgressAlreadyExists
			}
			return err
		}
		result = progressToResponse(e)
		return nil
	})
	return result, err
}

func (s *Service) GetByID(ctx context.Context, q inputport.GetProgressByIDQuery) (*inputport.ProgressResponse, error) {
	e, err := s.repo.FindByID(ctx, q.ID)
	if err != nil {
		// Translate the repository-tier not-found sentinel to the
		// input-port one so the handler maps to 404 (the input-port
		// sentinel carries errcat.NotFound; httperr.Status / grpcerr.Code
		// read that category at the transport boundary). All generated
		// outbound adapters (memory, driver-backed, grpc-client) return
		// outputport.ErrNotFound on miss — unified in the not-found
		// convention cleanup (Day-12 #4).
		if errors.Is(err, outputport.ErrNotFound) {
			return nil, inputport.ErrProgressNotFound
		}
		return nil, err
	}
	return progressToResponse(e), nil
}

func (s *Service) List(ctx context.Context, q inputport.ListProgressQuery) ([]*inputport.ProgressResponse, error) {
	es, err := s.repo.List(ctx, q.Limit, q.Offset)
	if err != nil {
		return nil, err
	}
	out := make([]*inputport.ProgressResponse, 0, len(es))
	for _, e := range es {
		out = append(out, progressToResponse(e))
	}
	return out, nil
}

// ListByLearner returns the progresss referencing the supplied LearnerID.
// Auto-emitted from the `ref: Learner` declaration on this entity
// (#403 sub-3); replaces the prior hand-pattern of `List(limit=1000)`
// followed by an in-memory filter on LearnerID.
func (s *Service) ListByLearner(ctx context.Context, q inputport.ListProgressByLearnerQuery) ([]*inputport.ProgressResponse, error) {
	es, err := s.repo.ListByLearner(ctx, q.LearnerID, q.Limit, q.Offset)
	if err != nil {
		return nil, err
	}
	out := make([]*inputport.ProgressResponse, 0, len(es))
	for _, e := range es {
		out = append(out, progressToResponse(e))
	}
	return out, nil
}

// CountByLearner returns the total number of progress rows whose
// LearnerID equals LearnerID, without applying limit/offset. The REST
// listByLearner handler calls this to populate the `total` envelope field
// with the true dataset-wide count rather than the page size (#2202).
func (s *Service) CountByLearner(ctx context.Context, q inputport.ListProgressByLearnerQuery) (int, error) {
	return s.repo.CountByLearner(ctx, q.LearnerID)
}

// ListByLearnerSince is the keyset-paginated sibling of ListByLearner
// (#4237) — a thin pass-through to the repository's own ListByLearnerSince
// (see its godoc for the full keyset-vs-offset mechanism). Backs the gRPC
// ListByLearnerSince RPC a cross-service `derive:` rollup's derived-rows
// reader rides for its internal complete-scan loop; not part of the general
// REST/HTMX listing surface.
func (s *Service) ListByLearnerSince(ctx context.Context, refID string, afterCreatedAt time.Time, afterID string, limit int) ([]*inputport.ProgressResponse, error) {
	es, err := s.repo.ListByLearnerSince(ctx, refID, afterCreatedAt, afterID, limit)
	if err != nil {
		return nil, err
	}
	out := make([]*inputport.ProgressResponse, 0, len(es))
	for _, e := range es {
		out = append(out, progressToResponse(e))
	}
	return out, nil
}

// ListByLesson returns the progresss referencing the supplied LessonID.
// Auto-emitted from the `ref: Lesson` declaration on this entity
// (#403 sub-3); replaces the prior hand-pattern of `List(limit=1000)`
// followed by an in-memory filter on LessonID.
func (s *Service) ListByLesson(ctx context.Context, q inputport.ListProgressByLessonQuery) ([]*inputport.ProgressResponse, error) {
	es, err := s.repo.ListByLesson(ctx, q.LessonID, q.Limit, q.Offset)
	if err != nil {
		return nil, err
	}
	out := make([]*inputport.ProgressResponse, 0, len(es))
	for _, e := range es {
		out = append(out, progressToResponse(e))
	}
	return out, nil
}

// CountByLesson returns the total number of progress rows whose
// LessonID equals LessonID, without applying limit/offset. The REST
// listByLesson handler calls this to populate the `total` envelope field
// with the true dataset-wide count rather than the page size (#2202).
func (s *Service) CountByLesson(ctx context.Context, q inputport.ListProgressByLessonQuery) (int, error) {
	return s.repo.CountByLesson(ctx, q.LessonID)
}

// ListByLessonSince is the keyset-paginated sibling of ListByLesson
// (#4237) — a thin pass-through to the repository's own ListByLessonSince
// (see its godoc for the full keyset-vs-offset mechanism). Backs the gRPC
// ListByLessonSince RPC a cross-service `derive:` rollup's derived-rows
// reader rides for its internal complete-scan loop; not part of the general
// REST/HTMX listing surface.
func (s *Service) ListByLessonSince(ctx context.Context, refID string, afterCreatedAt time.Time, afterID string, limit int) ([]*inputport.ProgressResponse, error) {
	es, err := s.repo.ListByLessonSince(ctx, refID, afterCreatedAt, afterID, limit)
	if err != nil {
		return nil, err
	}
	out := make([]*inputport.ProgressResponse, 0, len(es))
	for _, e := range es {
		out = append(out, progressToResponse(e))
	}
	return out, nil
}

func (s *Service) Update(ctx context.Context, cmd inputport.UpdateProgressCommand) (*inputport.ProgressResponse, error) {
	// validateRefs runs PRE-TRANSACTION on the outer ctx so each goroutine
	// draws a fresh pooled connection — safe on PostgreSQL (pgx.Tx is not
	// concurrent-safe; running inside WithTransaction would cause goroutines
	// to share one connection → protocol desync, #1789).
	if err := s.validateProgressRefs(ctx, cmd.LearnerID, cmd.LessonID); err != nil {
		return nil, err
	}
	var result *inputport.ProgressResponse
	err := s.txManager.WithTransaction(ctx, func(ctx context.Context) error {
		e, err := s.repo.FindByID(ctx, cmd.ID)
		if err != nil {
			if errors.Is(err, outputport.ErrNotFound) {
				return inputport.ErrProgressNotFound
			}
			return err
		}
		if err := e.ApplyUpdate(cmd.LearnerID, cmd.LessonID, cmd.Completed, cmd.Score, cmd.Total); err != nil {
			return err
		}
		if err := s.repo.Update(ctx, e); err != nil {
			if errors.Is(err, outputport.ErrNotFound) {
				return inputport.ErrProgressNotFound
			}
			// A storage-level UNIQUE index refused the new values (a slug /
			// sequence / scalar `unique: true` column, a hand-written index,
			// or a `unique: true` ref a racing Update claimed — #3540). Map
			// ErrAlreadyExists → ErrProgressAlreadyExists (Conflict → 409)
			// exactly as Create does (#4972), not the 500 an uncategorised
			// error gets; a field-named refinement, if any, follows the tx.
			if errors.Is(err, outputport.ErrAlreadyExists) {
				return inputport.ErrProgressAlreadyExists
			}
			return err
		}
		result = progressToResponse(e)
		return nil
	})
	return result, err
}

func (s *Service) Delete(ctx context.Context, cmd inputport.DeleteProgressCommand) error {
	return s.txManager.WithTransaction(ctx, func(ctx context.Context) error {
		if err := s.repo.Delete(ctx, cmd.ID); err != nil {
			if errors.Is(err, outputport.ErrNotFound) {
				return inputport.ErrProgressNotFound
			}
			return err
		}
		return nil
	})
}

func progressToResponse(e *domain.Progress) *inputport.ProgressResponse {
	return &inputport.ProgressResponse{
		ID:        e.ID(),
		Completed: e.Completed(),
		LearnerID: e.LearnerID(),
		LessonID:  e.LessonID(),
		Score:     e.Score(),
		Total:     e.Total(),
		CreatedAt: e.CreatedAt(),
		UpdatedAt: e.UpdatedAt(),
	}
}
