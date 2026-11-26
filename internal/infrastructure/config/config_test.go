package config

import (
	"log/slog"
	"os"
	"testing"
)

// TestSlogLevelParsesLogLevel pins the runtime log-level knob (#3377):
// LOG_LEVEL maps to the matching slog.Level, and any unknown or empty
// value falls back to Info so a typo can never silence logging. Before
// this fix the slog handler was built with nil HandlerOptions, hard-
// wiring the level at Info with no runtime override.
func TestSlogLevelParsesLogLevel(t *testing.T) {
	cases := map[string]slog.Level{
		"debug":   slog.LevelDebug,
		"DEBUG":   slog.LevelDebug,
		" info ":  slog.LevelInfo,
		"warn":    slog.LevelWarn,
		"warning": slog.LevelWarn,
		"error":   slog.LevelError,
		"":        slog.LevelInfo,
		"bogus":   slog.LevelInfo,
	}
	for in, want := range cases {
		if got := (Config{LogLevel: in}).SlogLevel(); got != want {
			t.Errorf("SlogLevel(%q) = %v; want %v", in, got, want)
		}
	}
}

// TestLoadLogLevel pins that LOG_LEVEL defaults to info and is
// env-overridable (#3377) — the verbosity knob must exist at runtime,
// not require a recompile.
func TestLoadLogLevel(t *testing.T) {
	unsetEnvForTest(t, "LOG_LEVEL")
	if got := Load().SlogLevel(); got != slog.LevelInfo {
		t.Errorf("default SlogLevel = %v; want Info", got)
	}
	t.Setenv("LOG_LEVEL", "debug")
	if got := Load().SlogLevel(); got != slog.LevelDebug {
		t.Errorf("LOG_LEVEL=debug SlogLevel = %v; want Debug (env override broken)", got)
	}
}

// unsetEnvForTest unsets the given keys before the test body runs and
// restores prior values on cleanup. We can't use t.Setenv("", "")
// because LookupEnv returns true for empty-but-set values — the
// getEnv helper would return "" instead of falling back to the
// default. os.Unsetenv removes the key entirely so LookupEnv returns
// false and the default branch fires.
func unsetEnvForTest(t *testing.T, keys ...string) {
	t.Helper()
	type prev struct {
		val string
		set bool
	}
	saved := map[string]prev{}
	for _, k := range keys {
		v, ok := os.LookupEnv(k)
		saved[k] = prev{val: v, set: ok}
		_ = os.Unsetenv(k)
	}
	t.Cleanup(func() {
		for k, p := range saved {
			if p.set {
				_ = os.Setenv(k, p.val)
			} else {
				_ = os.Unsetenv(k)
			}
		}
	})
}

// TestLoadDefaults pins the documented defaults so a project booting
// without any env vars set still gets a usable config. Drift here
// silently changes the listen-port story that every README and
// docker-compose file documents.
func TestLoadDefaults(t *testing.T) {
	unsetEnvForTest(t, "HTTP_ADDR", "GRPC_ADDR", "HTMX_ADDR", "GRPC_REFLECTION", "MAX_BODY_BYTES")
	cfg := Load()
	if cfg.HTTPAddr == "" {
		t.Errorf("HTTPAddr default empty; want a sensible :PORT default")
	}
	if cfg.MaxBodyBytes <= 0 {
		t.Errorf("MaxBodyBytes default = %d; want positive", cfg.MaxBodyBytes)
	}
}

// TestLoadEnvOverride pins that env vars override defaults. The
// per-key getEnv / getInt64 / getBool helpers all consult os.LookupEnv
// — t.Setenv exercises that read path.
func TestLoadEnvOverride(t *testing.T) {
	t.Setenv("HTTP_ADDR", ":7777")
	t.Setenv("MAX_BODY_BYTES", "4096")
	cfg := Load()
	if cfg.HTTPAddr != ":7777" {
		t.Errorf("HTTPAddr = %q; want %q (env override broken)", cfg.HTTPAddr, ":7777")
	}
	if cfg.MaxBodyBytes != 4096 {
		t.Errorf("MaxBodyBytes = %d; want 4096 (int64 env override broken)", cfg.MaxBodyBytes)
	}
}

// TestValidateNoRequired pins the empty-required-keys path. With no
// features patching keys into @hexago:wire:config-required, Validate()
// must return nil — this is the freshly-init'd shape every project
// starts in. Boot-time fail-fast (M4b) only kicks in once a feature
// like `--encrypted` patches required keys into the marker.
//
// Gated on {{ if and (not .HasStorage) (not .HasAuth) (not .HasEncryptedFields) }}:
// when init is run with `--storage s3|minio`, OR after `scaffold auth`
// is run, OR after `hexago gen` with any encrypted: field, required keys
// are patched into the marker block so the no-required-keys premise no
// longer holds. The storage-enabled equivalent is TestValidateMissingS3Keys
// + TestValidatePopulatedS3KeysOK below; the auth-enabled equivalent is
// TestValidateMissingJWTKey + TestValidateJWTKeyPopulatedOK below; the
// encrypted-fields equivalent is TestValidateMissingEncryptionKeys +
// TestValidateEncryptionKeysPopulatedOK below.
func TestValidateNoRequired(t *testing.T) {
	cfg := Config{}
	if err := cfg.Validate(); err != nil {
		t.Errorf("Validate() = %v; want nil for freshly-init'd config", err)
	}
}

// TestGetInt64ParseFailureFallsBack pins that malformed env values
// silently fall back to the default — by design, so a typo in the
// env file doesn't crash boot. Validate() catches required-key
// absence; this helper just refuses to corrupt the value.
func TestGetInt64ParseFailureFallsBack(t *testing.T) {
	t.Setenv("MAX_BODY_BYTES", "not-a-number")
	cfg := Load()
	if cfg.MaxBodyBytes <= 0 {
		t.Errorf("MaxBodyBytes = %d; want default fallback on malformed env", cfg.MaxBodyBytes)
	}
}

// TestGetBoolParseFailureFallsBack mirrors the int64 fallback for the
// bool helper. GRPC_REFLECTION's compiled-in default is false for this project
// (off unless init --grpc-reflection=true, sec-pass-3); a malformed env value
// must fall back to that compiled-in default, not panic or silently flip it.
func TestGetBoolParseFailureFallsBack(t *testing.T) {
	t.Setenv("GRPC_REFLECTION", "yepyep")
	cfg := Load()
	if cfg.GRPCReflection != false {
		t.Errorf("GRPCReflection = %v; want compiled-in default false on malformed env", cfg.GRPCReflection)
	}
}
