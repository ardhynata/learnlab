package main

import (
	"context"
	"encoding/hex"
	"fmt"
	"github.com/jackc/pgx/v5/pgxpool"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"sync"
	"sync/atomic"
	"syscall"
	"time"

	courserest "example.com/learnlab/internal/adapter/inbound/rest/course"
	coursetextrest "example.com/learnlab/internal/adapter/inbound/rest/coursetext"
	learnerrest "example.com/learnlab/internal/adapter/inbound/rest/learner"
	lessonrest "example.com/learnlab/internal/adapter/inbound/rest/lesson"
	lessontextrest "example.com/learnlab/internal/adapter/inbound/rest/lessontext"
	modulerest "example.com/learnlab/internal/adapter/inbound/rest/module"
	moduletextrest "example.com/learnlab/internal/adapter/inbound/rest/moduletext"
	pathrest "example.com/learnlab/internal/adapter/inbound/rest/path"
	pathtextrest "example.com/learnlab/internal/adapter/inbound/rest/pathtext"
	progressrest "example.com/learnlab/internal/adapter/inbound/rest/progress"
	questionrest "example.com/learnlab/internal/adapter/inbound/rest/question"
	questiontextrest "example.com/learnlab/internal/adapter/inbound/rest/questiontext"
	coursepostgresql "example.com/learnlab/internal/adapter/outbound/course"
	coursetextpostgresql "example.com/learnlab/internal/adapter/outbound/coursetext"
	learnerpostgresql "example.com/learnlab/internal/adapter/outbound/learner"
	lessonpostgresql "example.com/learnlab/internal/adapter/outbound/lesson"
	lessontextpostgresql "example.com/learnlab/internal/adapter/outbound/lessontext"
	modulepostgresql "example.com/learnlab/internal/adapter/outbound/module"
	moduletextpostgresql "example.com/learnlab/internal/adapter/outbound/moduletext"
	pathpostgresql "example.com/learnlab/internal/adapter/outbound/path"
	pathtextpostgresql "example.com/learnlab/internal/adapter/outbound/pathtext"
	progresspostgresql "example.com/learnlab/internal/adapter/outbound/progress"
	questionpostgresql "example.com/learnlab/internal/adapter/outbound/question"
	questiontextpostgresql "example.com/learnlab/internal/adapter/outbound/questiontext"
	courseservice "example.com/learnlab/internal/core/service/course"
	coursetextservice "example.com/learnlab/internal/core/service/coursetext"
	learnerservice "example.com/learnlab/internal/core/service/learner"
	lessonservice "example.com/learnlab/internal/core/service/lesson"
	lessontextservice "example.com/learnlab/internal/core/service/lessontext"
	moduleservice "example.com/learnlab/internal/core/service/module"
	moduletextservice "example.com/learnlab/internal/core/service/moduletext"
	pathservice "example.com/learnlab/internal/core/service/path"
	pathtextservice "example.com/learnlab/internal/core/service/pathtext"
	progressservice "example.com/learnlab/internal/core/service/progress"
	questionservice "example.com/learnlab/internal/core/service/question"
	questiontextservice "example.com/learnlab/internal/core/service/questiontext"
	"example.com/learnlab/internal/infrastructure/config"
	sharedenc "example.com/learnlab/internal/shared/encryptor"
	rtencryptor "github.com/inxpired/hexago/runtime/encryptor"
	"github.com/inxpired/hexago/runtime/eventbus"
	"github.com/inxpired/hexago/runtime/healthz"
	"github.com/inxpired/hexago/runtime/httperr"
	"github.com/inxpired/hexago/runtime/idempotency"
	"github.com/inxpired/hexago/runtime/intersvcauth"
	"github.com/inxpired/hexago/runtime/middleware"
	"github.com/inxpired/hexago/runtime/resilience"
	"github.com/inxpired/hexago/runtime/server"
	"github.com/inxpired/hexago/runtime/tracing"
	"github.com/inxpired/hexago/runtime/txmanager"
	// @hexago:wire:imports
)

// ready gates /readyz. Flipped to true after all routes, middleware,
// and dependencies are wired and the server goroutines have launched.
// Tests should poll /readyz, not /healthz, to avoid racing against
// handler initialization.
var ready atomic.Bool

// runHealthzProbe is the implementation of the `healthz` subcommand.
// It dials localhost:<port>/healthz and exits 0 on 200, 1 otherwise.
// This subcommand is used by the docker-compose.prod.yml healthcheck
// (distroless/static-debian12 has no curl or shell — only /app itself).
// The port is derived from HTTP_ADDR (default :8080).
func runHealthzProbe() {
	addr := os.Getenv("HTTP_ADDR")
	if addr == "" {
		addr = ":8080"
	}
	// Extract just the port portion: ":8080" → "8080", "0.0.0.0:8080" → "8080".
	// Walk from the right to find the last colon (handles IPv4 and host:port shapes).
	port := addr
	for i := len(addr) - 1; i >= 0; i-- {
		if addr[i] == ':' {
			port = addr[i+1:]
			break
		}
	}
	// The URL is always localhost + the port from HTTP_ADDR env var.
	// G107 (SSRF) does not apply — no external user input reaches the path.
	url := "http://localhost:" + port + "/healthz" //nolint:gosec // G107: localhost+port from env only
	resp, err := http.Get(url)                     //nolint:gosec // G107: see above
	if err != nil {
		fmt.Fprintf(os.Stderr, "healthz: dial %s: %v\n", url, err)
		os.Exit(1)
	}
	defer resp.Body.Close() //nolint:errcheck // probe: close error not actionable
	if resp.StatusCode != http.StatusOK {
		fmt.Fprintf(os.Stderr, "healthz: %s returned %d\n", url, resp.StatusCode)
		os.Exit(1)
	}
	os.Exit(0)
}

func main() {
	// healthz subcommand: used by docker-compose.prod.yml healthcheck.
	// Must be checked before config.Load() so the probe path is fast +
	// dependency-free. See runHealthzProbe for the full contract.
	if len(os.Args) > 1 && os.Args[1] == "healthz" {
		runHealthzProbe()
	}

	cfg := config.Load()
	// Log level is runtime-tunable via LOG_LEVEL (log_level: in yaml) —
	// cfg.SlogLevel() maps it to a slog.Level so operators can enable
	// debug diagnostics without recompiling (#3377). Unknown/empty values
	// fall back to Info so a typo can't silence logging.
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: cfg.SlogLevel()}))

	// Signal-scoped shutdown context (#5327): created BEFORE the wire sites so
	// the background sweep/reconcile goroutines the generators emit
	// (StartSweepDefault, StartReconcile) stop on SIGINT/SIGTERM instead of
	// running on context.Background() until the process dies. The transports
	// below share this same ctx.
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()
	// sweepWG counts the background sweep goroutines started below (#5549).
	// After the transports drain, main cancels ctx and waits on it, so the
	// process never exits while a sweep is still running.
	var sweepWG sync.WaitGroup

	// Phase-3 M4b boot-validate: fail fast if any required config key is
	// missing. Required keys are populated by features that need them
	// (e.g. encryption keys for `--encrypted` fields). Replaces the
	// pre-M4b runtime-panic-at-first-encrypted-request failure mode.
	if err := cfg.Validate(); err != nil {
		fmt.Fprintf(os.Stderr, "config: %v\n", err)
		os.Exit(1)
	}

	// Distributed tracing. Default exporter is `none` (zero runtime
	// overhead — global tracer stays as OTEL's noop tracer); set
	// HEXAGO_TRACE_EXPORTER=stdout for local development or
	// HEXAGO_TRACE_EXPORTER=otlp for production (OTLP picks up the
	// standard OTEL_EXPORTER_OTLP_ENDPOINT / _HEADERS env vars at
	// connect time). The HTTP middleware in middleware.Default,
	// gRPC server stats handler below, and runtime/eventbus.NATSBus
	// all participate in trace context propagation automatically.
	tracingShutdown, err := tracing.Init(context.Background(), tracing.Config{
		ServiceName: "learnlab",
		Exporter:    tracing.FromEnv(),
	})
	if err != nil {
		fmt.Fprintf(os.Stderr, "tracing init: %v\n", err)
		os.Exit(1)
	}
	defer func() { _ = tracingShutdown(context.Background()) }()

	// Idempotency dedup store for at-least-once safety on POST /
	// payment / webhook handlers + NATS consumer dedup. Default is
	// the in-process MemoryStore — fine for monolith deployments and
	// tests. Multi-replica deployments swap in
	// runtime/idempotency/redisstore.New(client) at the
	// composition root below (look for the @hexago:wire:idempotency
	// marker). Per-route wiring example:
	//
	//   mux.Handle("/payments", idempotency.HTTPMiddleware(idempotencyStore, 24*time.Hour)(paymentHandler))
	//
	// Per-consumer wiring example:
	//
	//   bus.Subscribe("user.registered", idempotency.ConsumerWrap(
	//       idempotencyStore,
	//       idempotency.EventNamePlusFn(func(e eventbus.DomainEvent) string {
	//           return e.(domain.UserRegistered).UserID
	//       }),
	//       24*time.Hour,
	//       realHandler,
	//   ))
	//
	// With several handlers on one event, wrap each with
	// idempotency.ConsumerWrapNamed("<handler>", ...) instead: plain
	// ConsumerWrap keys carry no handler identity, so siblings sharing a
	// store would suppress each other (#5429).
	idempotencyStore := idempotency.NewMemoryStore()
	// RunSweepDefault reclaims expired entries on a background ticker
	// (issue #4198): Mark's lazy eviction only frees a key when THAT SAME
	// key is re-Marked after expiry, so a steady stream of distinct
	// one-shot payment/webhook/RPC-dedup keys — the normal case — never
	// triggers it, and s.entries would otherwise grow without bound for
	// the life of the process. Runs on the signal ctx (#5327) so the
	// goroutine stops on SIGINT/SIGTERM rather than leaking in embedded
	// and test runs; mirrors the auth refresh-token repo's wiring.
	// It runs on a goroutine counted in sweepWG (#5549), so shutdown waits
	// for an in-flight sweep.
	sweepWG.Add(1)
	go func() {
		defer sweepWG.Done()
		idempotencyStore.RunSweepDefault(ctx)
	}()
	// @hexago:wire:idempotency

	// Inter-service auth (JWT-shaped). Configured via INTERSVC_AUTH_KEY
	// env var; when unset, intersvcSigner / intersvcVerifier remain
	// nil and operators MUST wire their own (or skip inter-service
	// auth entirely). The key is shared HMAC-SHA256, ≥ 32 bytes
	// (RFC 7518 §3.2 — shorter keys fail-loud at constructor time).
	//
	// Per-route inbound wiring example:
	//
	//   mux.Handle("/internal/", intersvcauth.HTTPMiddleware(intersvcVerifier, "learnlab")(internalHandler))
	//
	// Per-client outbound wiring example:
	//
	//   client := &http.Client{
	//       Transport: intersvcauth.Transport(intersvcSigner, "learnlab",
	//           func(*http.Request) string { return "billing" }, nil),
	//       Timeout: 5 * time.Second,
	//   }
	//
	// Multi-tenant: tenant ID propagation is automatic when using
	// intersvcauth.Transport or intersvcauth.PerRPCCredentials —
	// the adapters extract intersvcauth.TenantFromContext(ctx) from the
	// outbound request context and embed it in the token. Downstream
	// services read it via intersvcauth.TenantFromContext(r.Context()).
	// For manual control, call signer.(*intersvcauth.JWTSigner).SignWithTenantID(
	//     ctx, caller, callee, tenantID) directly.
	//
	// Zero-downtime key rotation: set INTERSVC_AUTH_KEY to the NEW key
	// and INTERSVC_AUTH_KEY_OLD to the current (old) key during the
	// rotation window. Tokens signed with either key are accepted.
	// Once all services have been redeployed with the new primary key,
	// unset INTERSVC_AUTH_KEY_OLD.
	var intersvcSigner intersvcauth.Signer
	var intersvcVerifier intersvcauth.Verifier
	if rawKey := cfg.IntersvcAuthKey; rawKey != "" {
		key := []byte(rawKey)
		s, err := intersvcauth.NewJWTSigner(key)
		if err != nil {
			fmt.Fprintf(os.Stderr, "intersvcauth signer: %v\n", err)
			os.Exit(1)
		}
		verifierOpts := []intersvcauth.JWTVerifierOption{}
		if oldRawKey := cfg.IntersvcAuthKeyOld; len(oldRawKey) >= intersvcauth.MinKeyBytes {
			verifierOpts = append(verifierOpts, intersvcauth.WithVerifierFallbackKeys([]byte(oldRawKey)))
		}
		v, err := intersvcauth.NewJWTVerifier(key, verifierOpts...)
		if err != nil {
			fmt.Fprintf(os.Stderr, "intersvcauth verifier: %v\n", err)
			os.Exit(1)
		}
		intersvcSigner = s
		intersvcVerifier = v
	}
	_ = intersvcSigner   // remove the underscore once wired into an outbound client
	_ = intersvcVerifier // remove the underscore once wired into a route
	// @hexago:wire:intersvcauth

	// Per-target circuit breakers + a shared retry policy for outbound
	// cross-service calls (Sprint 4 / Track B #4 / #363). Each peer
	// service gets its OWN Breaker so a sick `billing` doesn't trip
	// your `inventory` calls — keyed by peer service name. Default
	// thresholds (5 consecutive failures within 1s → Open; 30s
	// Cooldown) are reasonable for in-cluster peers; tune per-peer
	// via the BreakerConfig fields when authoring a new peer call site.
	//
	// For HTTP outbound (`make adapter --kind http-client`), the dial
	// block auto-emitted at @hexago:wire:remote-clients already wires
	// the per-target breaker into the client transport via
	// WithHTTPClient(resilience.HTTPTransport(breaker, sharedRetry, ...)).
	// To also add intersvcauth + tracing, replace http.DefaultTransport
	// with tracing.Transport(intersvcauth.Transport(intersvcSigner,
	// "learnlab", func(*http.Request) string { return "billing" },
	// http.DefaultTransport)) in the generated WithHTTPClient call.
	//
	// For gRPC peers, plug into grpc.NewClient via:
	//
	//	grpc.WithChainUnaryInterceptor(resilience.UnaryClientInterceptor(billingBreaker, sharedRetry))
	//	grpc.WithChainStreamInterceptor(resilience.StreamClientInterceptor(billingBreaker, nil))
	//
	// Use resilience.GRPCRetryable as the RetryConfig.Retryable for
	// gRPC retry policy — distinguishes caller-error codes from
	// server-sick codes per the documented matrix.
	resilienceBreakers := make(map[string]*resilience.Breaker)
	sharedRetry, err := resilience.NewRetry(resilience.RetryConfig{})
	if err != nil {
		fmt.Fprintf(os.Stderr, "resilience retry: %v\n", err)
		os.Exit(1)
	}
	_ = resilienceBreakers // remove the underscore once a peer breaker is registered
	_ = sharedRetry        // remove the underscore once wired into a peer client
	// @hexago:wire:resilience
	// PostgreSQL *pgxpool.Pool shared across every repository in this
	// project. Driver: github.com/jackc/pgx/v5 + pgxpool. The DSN comes
	// from cfg.PostgresDSN (default:
	// postgres://localhost:5432/postgres?sslmode=disable). Schema-init
	// runs idempotently inside each generated NewRepository — see
	// docs/yaml-spec.md → "PostgreSQL outbound adapter" for the
	// no-versioned-migrations gotcha.
	pgPool, err := pgxpool.New(context.Background(), cfg.PostgresDSN)
	if err != nil {
		fmt.Fprintf(os.Stderr, "open postgresql: %v\n", err)
		os.Exit(1)
	}
	defer pgPool.Close()
	pgPingCtx, pgPingCancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer pgPingCancel()
	if err := pgPool.Ping(pgPingCtx); err != nil {
		fmt.Fprintf(os.Stderr, "ping postgresql: %v\n", err)
		os.Exit(1)
	}
	// @hexago:wire:txmanager — you selected --database postgresql; the
	// transaction manager is txmanager.NewPostgresTxManager(pgPool) so a
	// multi-write Create/Update (entity persist + event publish, or
	// multi-aggregate) is atomic: a mid-closure error rolls back every
	// write. The generated adapter's conn(ctx) helper runs each
	// statement on the ctx-scoped pgx.Tx, falling back to the bare
	// pgPool outside a WithTransaction (#983).
	tx := txmanager.NewPostgresTxManager(func(ctx context.Context) (txmanager.PgxTx, error) {
		return pgPool.Begin(ctx)
	})
	_ = tx

	// Dependency-aware /readyz Registry (Sprint 4 / Track B #6 / #364).
	// Replaces the pre-#364 trivial /readyz handler (which returned 200
	// the moment the listener bound) with a registry-backed handler that
	// probes per-dep health on every request. The boot-gate (`ready`
	// atomic.Bool) still guards initial wiring — once flipped, the
	// registry's Handler drives 200/503 based on dep state.
	//
	// Per-Check default timeout is 5s; tune via healthz.WithProbeTimeout
	// if any dep needs a longer ping (e.g. a Postgres in failover).
	// Built-in Checks for the project's deps are auto-registered below;
	// feature templates (make eventbus, make storage, etc.) hook in
	// their per-dep Probes at the @hexago:wire:healthz marker.
	readyz := healthz.NewRegistry()
	// Postgres uses jackc/pgx pgxpool, not database/sql, so the
	// SQLDBCheck builtin (which takes a *sql.DB) doesn't apply directly.
	// We wire a CheckFunc against pgPool.Ping so /readyz returns 503 when
	// the database is unreachable — operators get an explicit "sql:postgres"
	// failure detail instead of a misleading 200.
	readyz.Register(healthz.CheckFunc("postgres", func(ctx context.Context) error {
		return pgPool.Ping(ctx)
	}))
	// @hexago:wire:healthz

	// Event bus. Services publish domain events; handlers registered
	// below the @hexago:wire:event-handlers marker consume them. Typed
	// as eventbus.Bus (the interface) so a network impl (NATS, Kafka)
	// can be substituted later without touching publishers or handlers.
	//
	// To use NATS instead (cross-process pub/sub), swap the line below for:
	//
	//	registry := runtime.NewEventRegistry()
	//	bus, err := eventbus.NewNATS(logger, eventbus.NATSConfig{URL: "nats://localhost:4222", QueueGroup: cfg.NATSQueueGroup}, registry)
	//	if err != nil { logger.Error("nats bus", "err", err); os.Exit(1) }
	//	defer bus.Close()
	//
	// SECURITY (#3449): for signed multi-tenant propagation over NATS, also
	// set the intersvcauth fields on NATSConfig — IntersvcSigner:
	// intersvcSigner, IntersvcVerifier: intersvcVerifier, and
	// IntersvcCaller/IntersvcCallee: "eventbus" (a fixed shared broadcast
	// audience every participant on the cluster must agree on). Running
	// `hexago make eventbus --backend nats` wires these automatically. Without
	// them the bus accepts a forgeable plaintext X-Tenant-ID header from any
	// publisher even when INTERSVC_AUTH_KEY is set.
	//
	// `runtime.NewEventRegistry` lives at internal/runtime/event_registry.go
	// and is regenerated from gen/*.yaml on every `hexago gen` /
	// `hexago make feature`. Add the matching import:
	// "example.com/learnlab/internal/runtime"
	var bus eventbus.Bus = eventbus.New(logger)
	_ = bus

	// Field-level encryptor for outbound adapters whose spec has
	// `encrypted: true`. Bootstrapped only when both keys are set;
	// otherwise enc stays nil and any feature that declares an encrypted
	// field panics at wiring time with a clear "set ENCRYPTION_KEY / BLIND_INDEX_KEY"
	// message — the failure mode is loud, never silent plaintext.
	//
	// The init template emits ENCRYPTION_KEY / BLIND_INDEX_KEY as 64 hex
	// chars (32 random bytes via crypto/rand + hex.EncodeToString), and
	// rtencryptor.New takes raw bytes (16/24/32 for AES-128/192/256;
	// ≥32 for the HMAC-SHA256 index key). encryptionKeyBytes /
	// indexKeyBytes try hex-decode first (the canonical init form) and
	// fall back to raw bytes if the decoded length wouldn't satisfy
	// rtencryptor.New's per-key constraint — back-compat with secrets
	// managers returning raw-byte secrets directly. Validation still
	// lives inside rtencryptor.New; this layer only picks which encoding
	// the operator passed.
	//
	// Zero-downtime key rotation: set ENCRYPTION_KEY to the NEW key and
	// ENCRYPTION_KEY_OLD to the current (old) key during the rotation
	// window. New rows are encrypted with ENCRYPTION_KEY; existing rows
	// encrypted with ENCRYPTION_KEY_OLD are still readable. Once all rows
	// have been re-encrypted (or the old key is no longer needed), unset
	// ENCRYPTION_KEY_OLD. See runtime/encryptor.NewWithRotationKeys for
	// the full contract.
	var enc sharedenc.Port
	if cfg.EncryptionKey != "" && cfg.BlindIndexKey != "" {
		encKey := encryptionKeyBytes(cfg.EncryptionKey)
		blindKey := indexKeyBytes(cfg.BlindIndexKey)
		var decryptOnlyKeys [][]byte
		if cfg.EncryptionKeyOld != "" {
			oldKey := encryptionKeyBytes(cfg.EncryptionKeyOld)
			decryptOnlyKeys = append(decryptOnlyKeys, oldKey)
		}
		e, err := rtencryptor.NewWithRotationKeys(encKey, blindKey, decryptOnlyKeys...)
		if err != nil {
			logger.Error("encryptor bootstrap failed", "err", err)
			os.Exit(1)
		}
		enc = e
	}
	_ = enc

	// Repositories
	var pathRepo *pathpostgresql.Repository
	{
		r, err := pathpostgresql.NewRepository(pgPool)
		if err != nil {
			logger.Error("pathpostgresql repository init failed", "err", err)
			os.Exit(1)
		}
		pathRepo = r
	}
	var courseRepo *coursepostgresql.Repository
	{
		r, err := coursepostgresql.NewRepository(pgPool)
		if err != nil {
			logger.Error("coursepostgresql repository init failed", "err", err)
			os.Exit(1)
		}
		courseRepo = r
	}
	var moduleRepo *modulepostgresql.Repository
	{
		r, err := modulepostgresql.NewRepository(pgPool)
		if err != nil {
			logger.Error("modulepostgresql repository init failed", "err", err)
			os.Exit(1)
		}
		moduleRepo = r
	}
	var lessonRepo *lessonpostgresql.Repository
	{
		r, err := lessonpostgresql.NewRepository(pgPool)
		if err != nil {
			logger.Error("lessonpostgresql repository init failed", "err", err)
			os.Exit(1)
		}
		lessonRepo = r
	}
	var questionRepo *questionpostgresql.Repository
	{
		r, err := questionpostgresql.NewRepository(pgPool)
		if err != nil {
			logger.Error("questionpostgresql repository init failed", "err", err)
			os.Exit(1)
		}
		questionRepo = r
	}
	var learnerRepo *learnerpostgresql.Repository
	{
		r, err := learnerpostgresql.NewRepository(pgPool)
		if err != nil {
			logger.Error("learnerpostgresql repository init failed", "err", err)
			os.Exit(1)
		}
		learnerRepo = r
	}
	var progressRepo *progresspostgresql.Repository
	{
		r, err := progresspostgresql.NewRepository(pgPool)
		if err != nil {
			logger.Error("progresspostgresql repository init failed", "err", err)
			os.Exit(1)
		}
		progressRepo = r
	}
	var pathTextRepo *pathtextpostgresql.Repository
	{
		r, err := pathtextpostgresql.NewRepository(pgPool)
		if err != nil {
			logger.Error("pathtextpostgresql repository init failed", "err", err)
			os.Exit(1)
		}
		pathTextRepo = r
	}
	var courseTextRepo *coursetextpostgresql.Repository
	{
		r, err := coursetextpostgresql.NewRepository(pgPool)
		if err != nil {
			logger.Error("coursetextpostgresql repository init failed", "err", err)
			os.Exit(1)
		}
		courseTextRepo = r
	}
	var moduleTextRepo *moduletextpostgresql.Repository
	{
		r, err := moduletextpostgresql.NewRepository(pgPool)
		if err != nil {
			logger.Error("moduletextpostgresql repository init failed", "err", err)
			os.Exit(1)
		}
		moduleTextRepo = r
	}
	var lessonTextRepo *lessontextpostgresql.Repository
	{
		r, err := lessontextpostgresql.NewRepository(pgPool)
		if err != nil {
			logger.Error("lessontextpostgresql repository init failed", "err", err)
			os.Exit(1)
		}
		lessonTextRepo = r
	}
	var questionTextRepo *questiontextpostgresql.Repository
	{
		r, err := questiontextpostgresql.NewRepository(pgPool)
		if err != nil {
			logger.Error("questiontextpostgresql repository init failed", "err", err)
			os.Exit(1)
		}
		questionTextRepo = r
	}
	// @hexago:wire:repos

	// Storage feature (project-wide). Populated by
	// `hexago make storage <Name>` (or `hexago init --storage
	// minio|s3` at scaffold time). One Port instance per project; the
	// S3-compatible driver covers AWS S3 / Cloudflare R2 / MinIO /
	// Backblaze B2 / Bunny via configurable endpoint.
	// @hexago:wire:storage

	// Remote-service clients (outbound port impls that cross the network).
	// Generated by `hexago make adapter <Entity> --kind grpc-client`. Each
	// entry dials its target only when cfg.<Entity>SvcAddr is set, so a
	// project with optional dependencies still boots when they're absent.
	// @hexago:wire:remote-clients

	// Services
	pathSvc := pathservice.NewService(pathRepo, tx)
	courseSvc := courseservice.NewService(courseRepo, pathRepo, lessonRepo, moduleRepo, tx)
	moduleSvc := moduleservice.NewService(moduleRepo, courseRepo, lessonRepo, tx)
	lessonSvc := lessonservice.NewService(lessonRepo, courseRepo, moduleRepo, progressRepo, questionRepo, tx)
	questionSvc := questionservice.NewService(questionRepo, lessonRepo, tx)
	learnerSvc := learnerservice.NewService(learnerRepo, progressRepo, tx)
	progressSvc := progressservice.NewService(progressRepo, learnerRepo, lessonRepo, tx)
	pathTextSvc := pathtextservice.NewService(pathTextRepo, pathRepo, tx)
	courseTextSvc := coursetextservice.NewService(courseTextRepo, courseRepo, tx)
	moduleTextSvc := moduletextservice.NewService(moduleTextRepo, moduleRepo, tx)
	lessonTextSvc := lessontextservice.NewService(lessonTextRepo, lessonRepo, tx)
	questionTextSvc := questiontextservice.NewService(questionTextRepo, lessonRepo, tx)
	// @hexago:wire:services

	// Event handlers
	// @hexago:wire:event-handlers

	// Extra handler dependencies (declared by `extra_deps:` in entity specs).
	// `hexago gen` emits one-time `var <name> ... = nil` stubs above this
	// marker for each dep; replace nil with the real impl before boot.
	// @hexago:wire:deps

	// REST handler construction
	pathHandler := pathrest.NewHandler(pathSvc, cfg.MaxBodyBytes, logger)
	courseHandler := courserest.NewHandler(courseSvc, cfg.MaxBodyBytes, logger)
	moduleHandler := modulerest.NewHandler(moduleSvc, cfg.MaxBodyBytes, logger)
	lessonHandler := lessonrest.NewHandler(lessonSvc, cfg.MaxBodyBytes, logger)
	questionHandler := questionrest.NewHandler(questionSvc, cfg.MaxBodyBytes, logger)
	learnerHandler := learnerrest.NewHandler(learnerSvc, cfg.MaxBodyBytes, logger)
	progressHandler := progressrest.NewHandler(progressSvc, cfg.MaxBodyBytes, logger)
	pathTextHandler := pathtextrest.NewHandler(pathTextSvc, cfg.MaxBodyBytes, logger)
	courseTextHandler := coursetextrest.NewHandler(courseTextSvc, cfg.MaxBodyBytes, logger)
	moduleTextHandler := moduletextrest.NewHandler(moduleTextSvc, cfg.MaxBodyBytes, logger)
	lessonTextHandler := lessontextrest.NewHandler(lessonTextSvc, cfg.MaxBodyBytes, logger)
	questionTextHandler := questiontextrest.NewHandler(questionTextSvc, cfg.MaxBodyBytes, logger)
	// @hexago:wire:handlers

	// REST router
	restMux := http.NewServeMux()
	restMux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})
	// /readyz combines two signals:
	//
	//  1. Boot-phase gate (`ready` atomic.Bool): until main.go finishes
	//     wiring all routes/middleware and the server goroutines launch,
	//     return 503 with body `{"status":"booting"}`. Tests should poll
	//     /readyz, not /healthz, to avoid racing against handler init.
	//  2. Dep-state gate (`readyz` healthz.Registry): once booted, the
	//     registry's Handler probes each registered Check on every
	//     request and aggregates the result — 200 + `{"status":"ready"}`
	//     when all deps healthy, 503 + JSON listing failed checks when
	//     any dep is sick.
	readyzHandler := readyz.Handler()
	restMux.HandleFunc("GET /readyz", func(w http.ResponseWriter, r *http.Request) {
		if !ready.Load() {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusServiceUnavailable)
			_, _ = w.Write([]byte(`{"status":"booting"}` + "\n"))
			return
		}
		readyzHandler(w, r)
	})
	pathHandler.RegisterRoutes(restMux)
	courseHandler.RegisterRoutes(restMux)
	moduleHandler.RegisterRoutes(restMux)
	lessonHandler.RegisterRoutes(restMux)
	questionHandler.RegisterRoutes(restMux)
	learnerHandler.RegisterRoutes(restMux)
	progressHandler.RegisterRoutes(restMux)
	pathTextHandler.RegisterRoutes(restMux)
	courseTextHandler.RegisterRoutes(restMux)
	moduleTextHandler.RegisterRoutes(restMux)
	lessonTextHandler.RegisterRoutes(restMux)
	questionTextHandler.RegisterRoutes(restMux)
	// @hexago:wire:routes

	// Default middleware: panic recovery, request ID, structured access log.
	// Append your own (Auth, CORS, RateLimit, ...) above the marker via
	// `hexago make middleware <Name>` — each runs INSIDE the Default chain
	// (between Recover and the handler) so panics get caught and the
	// access log reflects the real status.
	mw := middleware.Default(logger)
	// @hexago:wire:middleware

	// Fail-fast policy: if any transport's Listen fails, cancel the
	// shared context so peer transports tear down too — the alternative
	// (one transport's goroutine exits while peers keep serving) leaves
	// the binary in a half-up state where `ps` polling sees the process
	// alive but a documented port is dead. Test harnesses (and humans)
	// uniformly want fast non-zero exit on any-transport failure.
	var transportFail atomic.Bool
	failTransport := func(label string, err error) {
		logger.Error(label, "err", err)
		transportFail.Store(true)
		stop()
	}

	// Bind barrier (#3991): main must not flip /readyz to ready until EVERY
	// transport goroutine has reported the outcome of its net.Listen. Go gives
	// no happens-before edge between `go func(){...}()` and the transportFail
	// Load below, so a fast-failing bind can race the readiness check — the
	// goroutine may not have reached net.Listen yet, transportFail reads false,
	// and /readyz briefly advertises 200 while a transport failed to bind.
	// bindWG counts down once per transport when its bind attempt completes;
	// onBind records a bind failure into transportFail BEFORE its Done, so
	// bindWG.Wait() returning guarantees every bind result (failures included)
	// is visible to the transportFail Load. The per-goroutine failTransport
	// call still performs the log + ctx-cancel teardown; onBind only makes the
	// failure visible to the barrier in time.
	var bindWG sync.WaitGroup
	onBind := func(err error) {
		if err != nil {
			transportFail.Store(true)
		}
		bindWG.Done()
	}

	var wg sync.WaitGroup
	bindWG.Add(1)
	wg.Add(1)
	go func() {
		defer wg.Done()
		if err := server.RunHTTPBarrier(ctx, server.New(cfg.HTTPAddr, mw(httperr.JSONErrors(restMux))), logger, "rest", onBind); err != nil {
			failTransport("rest", err)
		}
	}()

	// All routes registered, middleware initialized, server goroutines
	// launched. Wait for every transport's net.Listen to report its outcome
	// (bind barrier, #3991) so a partial-bind failure is visible here, then
	// flip /readyz to 200 only when no transport has failed — a partial-bind
	// failure must not advertise readiness on a surviving sibling transport
	// while the process is draining (#2994).
	bindWG.Wait()
	if !transportFail.Load() {
		ready.Store(true)
	}
	// Graceful-drain readiness (#3306): the instant SIGTERM/SIGINT cancels
	// ctx, flip /readyz back to 503 so the load balancer / orchestrator
	// stops routing NEW traffic to this instance BEFORE the HTTP listener
	// actually closes at the end of the graceful-shutdown window
	// (server.RunHTTP's ShutdownTimeout). Without this, /readyz keeps
	// returning 200 for the whole drain window and freshly-routed requests
	// are reset when the listener finally closes. /healthz stays 200 — the
	// process is up and draining, just no longer accepting new work.
	go func() {
		<-ctx.Done()
		ready.Store(false)
	}()
	wg.Wait()
	// The background sweeps run on ctx (#5549). Cancel it (the transports
	// can all stop without a signal) and wait for any sweep still running
	// before main's deferred cleanups close what it uses.
	stop()
	sweepWG.Wait()
	logger.Info("shutdown complete")
	if transportFail.Load() {
		_ = tracingShutdown(context.Background())
		os.Exit(1)
	}
}

// encryptionKeyBytes returns the byte-slice form of the AES key in s.
// Tries hex.DecodeString first (the canonical init-emitted form, 64 hex
// chars → 32 raw bytes for AES-256); accepts the decoded form only when
// its length is one of {16, 24, 32} — the AES-128/192/256 sizes. Falls
// back to raw bytes of s otherwise (back-compat for secrets managers
// emitting raw-byte AES keys directly).
//
// Disambiguation case: a 32-char ASCII-hex raw key (e.g. the legacy
// `ENCRYPTION_KEY=<64-hex-chars>` shape) decodes via
// hex to 16 bytes (valid AES-128) and the encryption-key path takes the
// decoded form. The same input fed to indexKeyBytes prefers raw because
// 16 bytes < 32 (HMAC-SHA256 minimum) but 32 bytes is fine.
func encryptionKeyBytes(s string) []byte {
	if decoded, err := hex.DecodeString(s); err == nil {
		switch len(decoded) {
		case 16, 24, 32:
			return decoded
		}
	}
	return []byte(s)
}

// indexKeyBytes returns the byte-slice form of the HMAC-SHA256 index key
// in s. Tries hex.DecodeString first (canonical init-emitted form, 64
// hex chars → 32 raw bytes); accepts the decoded form only when its
// length is ≥ 32 (rtencryptor's HMAC-SHA256 block-size minimum). Falls
// back to raw bytes of s otherwise.
//
// The asymmetry vs encryptionKeyBytes is intentional: AES has three
// discrete valid lengths; HMAC-SHA256 has a one-sided minimum. A 32-
// char ASCII-hex raw key decodes via hex to 16 bytes (too short for
// HMAC) so this function falls back to raw, yielding 32 bytes which
// satisfies the minimum. A 64-char hex value decodes to 32 bytes
// either way.
func indexKeyBytes(s string) []byte {
	if decoded, err := hex.DecodeString(s); err == nil && len(decoded) >= 32 {
		return decoded
	}
	return []byte(s)
}
