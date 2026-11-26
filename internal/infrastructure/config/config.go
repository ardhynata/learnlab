package config

import (
	"fmt"
	"log/slog"
	"os"
	"strconv"
	"strings"
)

type Config struct {
	HTTPAddr string
	GRPCAddr string
	HTMXAddr string

	// LogLevel is the runtime log verbosity, loaded from LOG_LEVEL.
	// Accepted (case-insensitive): "debug", "info", "warn"/"warning",
	// "error". Default "info". Consumed via SlogLevel() when main.go
	// builds its slog handler, so operators can enable debug diagnostics
	// without recompiling (#3377).
	LogLevel string

	// GRPCReflection registers the gRPC reflection service on the gRPC
	// server so tools like grpcurl can introspect without a .proto file.
	// Default false — secure by default, since reflection exposes service
	// names to anyone who can reach the port. Opt in for dev via
	// GRPC_REFLECTION=true.
	GRPCReflection bool

	// DatabaseURL / DatabaseName are loaded for the --database postgresql
	// you selected at init. Every documented driver (sqlite, postgresql,
	// mongodb, mysql) wires its own per-driver DSN field below; the
	// generic URL/Name pair stays read for hand-wiring of any future
	// driver kind that hasn't yet shipped a template.
	DatabaseURL  string
	DatabaseName string

	// PostgresDSN is the pgx/pgxpool connection string. Default targets
	// a local Postgres on the standard port without SSL — fine for dev;
	// production deployments should set sslmode=require (or stronger)
	// and a non-default user. Common DSN shapes:
	//   postgres://user:pass@host:5432/db?sslmode=disable
	//   host=host port=5432 user=u password=p dbname=db sslmode=require
	// See https://pkg.go.dev/github.com/jackc/pgx/v5#ParseConfig for the
	// full DSN surface.
	PostgresDSN string

	EncryptionKey string
	BlindIndexKey string

	// EncryptionKeyOld is the previous AES encryption key used during a
	// zero-downtime key rotation window. When non-empty, the encryptor
	// accepts ciphertexts produced by EITHER the current key
	// (EncryptionKey) OR this old key. New writes always use EncryptionKey.
	// Once all rows have been re-encrypted with the new key (or the old key
	// is no longer needed for reading), unset ENCRYPTION_KEY_OLD to remove
	// the fallback.
	//
	// Generate a new primary key with: openssl rand -hex 32
	// Set ENCRYPTION_KEY_OLD to the previous ENCRYPTION_KEY value during
	// the rotation window.
	EncryptionKeyOld string

	// IntersvcAuthKey is the shared HMAC key for inter-service JWT
	// authentication (runtime/intersvcauth, Sprint 3 / Track B #5).
	// MUST be ≥ 32 bytes (RFC 7518 §3.2 HMAC-SHA256 minimum) when
	// set; shorter keys fail-loud at JWTSigner / JWTVerifier
	// constructor time. Empty value disables intersvcauth — operators
	// that don't need east-west auth can leave it unset; operators
	// that do MUST set it on every replica of every service that
	// participates in the call graph (the same key signs and verifies
	// across the mesh).
	//
	// Generate one with: openssl rand -hex 32
	IntersvcAuthKey string

	// IntersvcAuthKeyOld is the previous HMAC key used during a
	// zero-downtime key rotation window. When non-empty and ≥ 32 bytes,
	// the generated verifier accepts tokens signed with EITHER the
	// current key (IntersvcAuthKey) OR this old key. Once all services
	// have been redeployed with the new primary key, unset
	// INTERSVC_AUTH_KEY_OLD to remove the fallback.
	//
	// This field MUST be loaded from the Config struct (not via bare
	// os.Getenv) so the rotation path participates in the same
	// config-loading discipline as every other env var.
	IntersvcAuthKeyOld string

	// MaxBodyBytes caps request-body size for REST and HTMX handlers.
	// Over-limit reads produce a 413 for REST (httperr.Status maps
	// *http.MaxBytesError before consulting errcat).  For HTMX the limit is
	// enforced via htmx.MaxBodyBytesMiddleware before CSRFMiddleware so
	// chunked requests with empty-pair padding cannot bypass it (#2964-ext).
	// Default 1 MiB — tune upward for batch-import endpoints via
	// MAX_BODY_BYTES. The editor scaffold's image-upload route does not need
	// this raised: it lifts the cap for its own multipart requests up to
	// uploads.Opts.MaxBytes (default 10 MiB, #5086).
	MaxBodyBytes int64
	// @hexago:wire:config-fields
}

func Load() Config {
	return Config{
		HTTPAddr:       getEnv("HTTP_ADDR", ":8080"),
		GRPCAddr:       getEnv("GRPC_ADDR", ":9090"),
		HTMXAddr:       getEnv("HTMX_ADDR", ":8081"),
		LogLevel:       getEnv("LOG_LEVEL", "info"),
		GRPCReflection: getBool("GRPC_REFLECTION", false),

		DatabaseURL:  getEnv("DATABASE_URL", ""),
		DatabaseName: getEnv("DATABASE_NAME", "learnlab"),

		PostgresDSN: getEnv("POSTGRES_DSN", "postgres://localhost:5432/postgres?sslmode=disable"),

		EncryptionKey:      getEnv("ENCRYPTION_KEY", ""),
		BlindIndexKey:      getEnv("BLIND_INDEX_KEY", ""),
		EncryptionKeyOld:   getEnv("ENCRYPTION_KEY_OLD", ""),
		IntersvcAuthKey:    getEnv("INTERSVC_AUTH_KEY", ""),
		IntersvcAuthKeyOld: getEnv("INTERSVC_AUTH_KEY_OLD", ""),
		MaxBodyBytes:       getInt64("MAX_BODY_BYTES", 1<<20),
		// @hexago:wire:config-load
	}
}

// getInt64 reads an int64 env var or returns def.
func getInt64(key string, def int64) int64 {
	if v, ok := os.LookupEnv(key); ok {
		if n, err := strconv.ParseInt(v, 10, 64); err == nil {
			return n
		}
	}
	return def
}

// getBool reads a bool env var or returns def. Accepts any value
// strconv.ParseBool accepts: 1/0, t/f, T/F, TRUE/FALSE, true/false.
func getBool(key string, def bool) bool {
	if v, ok := os.LookupEnv(key); ok {
		if b, err := strconv.ParseBool(v); err == nil {
			return b
		}
	}
	return def
}

func getEnv(key, def string) string {
	if v, ok := os.LookupEnv(key); ok {
		return v
	}
	return def
}

// GetInt reads an int env var or returns def.
func GetInt(key string, def int) int {
	if v, ok := os.LookupEnv(key); ok {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return def
}

// SlogLevel maps LogLevel (LOG_LEVEL) to a slog.Level. Recognized values
// (case-insensitive, surrounding whitespace trimmed): "debug", "info",
// "warn"/"warning", "error". Any unrecognized or empty value falls back to
// slog.LevelInfo so a typo never silences logging. cmd/app/main.go builds
// its slog handler with &slog.HandlerOptions{Level: cfg.SlogLevel()} — the
// single runtime knob for log verbosity, no recompile required (#3377).
func (c Config) SlogLevel() slog.Level {
	switch strings.ToLower(strings.TrimSpace(c.LogLevel)) {
	case "debug":
		return slog.LevelDebug
	case "warn", "warning":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}

// Validate returns nil when every required config key is populated.
// Required keys are added to the missing-checks block below by features
// that need them — e.g. `make feature ... --encrypted ssn` patches in
// checks for ENCRYPTION_KEY and BLIND_INDEX_KEY (Phase-3 M4b per
// docs/design/phase-3.md §2.3 (β)). cmd/app/main.go calls Validate()
// at boot, before any handler is registered, and exits non-zero on
// error — replacing the pre-M4b runtime-panic-at-first-encrypted-request
// failure mode with boot-time-fail-fast.
func (c Config) Validate() error {
	var missing []string
	// @hexago:wire:config-required
	if len(missing) > 0 {
		return fmt.Errorf("missing required config: %s", strings.Join(missing, ", "))
	}
	return nil
}
