.PHONY: check check-js test-js e2e help run build test test-json tidy arch-check dev run-prod stop compose-up compose-down migrate-up migrate-down migrate-status migrate-create  

# Services brought up by `make dev` before the app boots. Computed at init
# time from --database / --storage choices; empty when neither is selected.
COMPOSE_SERVICES := postgres
# @hexago:make:compose-deps

help:
	@echo "Common targets:"
	@echo "  make dev       — boot dependencies + run app against .env.local"
	@echo "  make run-prod  — boot app against .env.production (no docker)"
	@echo "  make stop      — kill any running app process"
	@echo "  make compose-up   — bring up docker-compose services ($(COMPOSE_SERVICES))"
	@echo "  make compose-down — tear down docker-compose services"
	@echo "  make build     — build static binary into bin/app"
	@echo "  make test      — run all go test"
	@echo "  make test-json — run all go test with -json output (machine-readable)"
	@echo "  make arch-check— verify the core has no view-layer imports"
	@echo "  make migrate-up      — apply all pending goose migrations"
	@echo "  make migrate-down    — roll back the most recent migration"
	@echo "  make migrate-status  — show migration ledger state"
	@echo "  make migrate-create  — scaffold a new migration (name=...)"

# @hexago:make:base
run:
	go run ./cmd/app

build:
	go build -o bin/app ./cmd/app

test:
	go test ./...

# test-json is the AI-agent oracle target: same test suite as `make test`
# but with -json output so tooling can parse pass/fail per package without
# screen-scraping human-readable output. Exit code mirrors `make test`:
# 0 = all pass, non-zero = at least one failure.
test-json:
	go test -json ./...

tidy:
	go mod tidy

# arch-check enforces the hexagonal invariant: the core
# (domain, ports, services) imports zero view/renderer packages.
# Fails if any core package transitively depends on runtime/view.
#
# The `go list` package patterns are layout-aware, for EVERY topology: a
# monolith keeps its core under internal/core/..., but a microservices /
# services project (and a monolith with context-scoped cores) puts one core
# per bounded context under internal/<ctx>/core/.... The wildcard
# `internal/.../core/...` needs a segment between the two slashes, so it does
# NOT match internal/core — and the bare `internal/core/...` matches ZERO
# packages under internal/<ctx>/core and passes vacuously (#3452) or, when
# internal/core does not exist yet (a fresh `hexago init` creates none),
# makes `go list` fail with "no such file or directory" and breaks CI on day
# one. So the wildcard is always checked and internal/core/... is added only
# when that directory exists.
#
# `go list`'s own exit status is captured FIRST and a failure aborts the
# target (#4942): piping it straight into grep under `|| true` discarded
# the status, so a broken GOFLAGS / unresolvable module / go.work
# misconfiguration printed "arch-check: ok" having checked nothing. Only
# grep's no-match (exit 1) is absorbed.
arch-check:
	@pats=./internal/.../core/...; if [ -d internal/core ]; then pats="./internal/core/... $$pats"; fi; \
	out=$$(go list -deps $$pats 2>&1); rc=$$?; \
	if [ $$rc -ne 0 ]; then \
		echo "arch-check: go list failed:"; echo "$$out"; exit 1; \
	fi; \
	leaks=$$(echo "$$out" | grep -E 'hexago[-/]runtime/view' || true); \
	if [ -n "$$leaks" ]; then \
		echo "arch-check: core depends on view packages:"; echo "$$leaks"; exit 1; \
	fi; echo "arch-check: ok"

# dev brings up the docker-compose dependencies (database, storage, etc.)
# and runs the app against `.env.local`. Empty COMPOSE_SERVICES degenerates
# to a no-op `docker compose up -d` (which still validates the compose
# file but doesn't start anything new).
#
# The env-file is sourced via `set -a && . ./.env.local && set +a`. Values
# are double-quoted in the env file so DSNs containing shell metacharacters
# (`(`, `)`, `&`, `?`, `=`) round-trip cleanly through bash.
dev:
	@if [ -n "$(COMPOSE_SERVICES)" ]; then docker compose up -d $(COMPOSE_SERVICES); fi
	@set -a && . ./.env.local && set +a && go run ./cmd/app

# run-prod boots the app against `.env.production`. Assumes the user has
# populated `.env.production` with real cloud credentials (uncommented one
# of the cloud-deploy templates in the file). No docker-compose deps —
# production runs against managed services, not the local docker stack.
run-prod:
	@set -a && . ./.env.production && set +a && go run ./cmd/app

# stop kills any running app process. Useful in dev workflows where
# `make dev` was launched in another terminal. Both shapes catch the
# `go run` parent process and the compiled-binary child Go drops into
# a temp dir at /tmp/go-build-*/exe/app.
#
# Implementation note: both kills run in a single bash -c block so
# that a SIGTERM propagating back to make (e.g. when make stop is
# run from a child shell of make dev) cannot interrupt the recipe
# between the two pkill calls. The compiled child is killed first
# because it holds the listening ports; killing go run first would
# orphan the child and leave the ports bound.
stop:
	@bash -c 'pkill -f "/exe/app" 2>/dev/null; pkill -f "go run ./cmd/app" 2>/dev/null; true'

# compose-up / compose-down are pass-throughs to docker-compose for the
# project's services. `make dev` calls compose-up automatically; these
# exist for the case where you want to bring the deps up without booting
# the app (e.g. running tests against the docker'd database).
compose-up:
	docker compose up -d $(COMPOSE_SERVICES)

compose-down:
	docker compose down



# ----- Schema migrations (goose) ---------------------------------------------
#
# Coexists with the generated outbound adapters' CREATE TABLE IF NOT EXISTS
# auto-init: first boot creates baseline tables (no migrations needed),
# every subsequent ALTER lives here as a goose .sql file.
#
# - migrate-up      applies all pending migrations
# - migrate-down    rolls back ONE migration (most recent applied)
# - migrate-status  lists migration state
# - migrate-create  scaffolds a new timestamped sql file
#                   (usage: `make migrate-create name=add_X_to_designs`)
#
# Env-file selection mirrors `make dev` vs `make run-prod`:
#   default              → reads <DB>_DSN from .env.local
#   MIGRATE_ENV=prod     → reads <DB>_DSN from .env.production
#
# We extract the DSN with grep instead of sourcing the env file because
# goose needs the raw DSN as a single argv value. Sourcing-then-passing-via-
# environment also works (the env file is now safely sourceable — values
# are double-quoted), but the grep|sed shape is preserved here so the
# migrate-* targets stay self-contained and don't tie behavior to env-file
# format choices the user might tweak. The sed pipeline strips the
# `KEY=` prefix and the surrounding double quotes the templates emit.
#
# The DSN env-key + GOOSE_DRIVER pair branches on the project's
# `--database` choice at init time:
#   mysql       → MYSQL_DSN     + GOOSE_DRIVER=mysql
#   postgresql  → POSTGRES_DSN  + GOOSE_DRIVER=postgres
#   sqlite      → SQLITE_DSN    + GOOSE_DRIVER=sqlite3
# `--database mongodb` routes through the golang-migrate branch above
# (goose is SQL-only). The `--migrations` flag requires a real database
# driver; `--database none|memory` is rejected at the CLI boundary
# (issue #2986), so this block is never rendered for schema-less projects.
#
# The goose CLI is invoked via `go run github.com/pressly/goose/v3/cmd/goose@v3.27.1`
# (versioned) so the CLI's ten-driver dep graph stays out of this project's
# go.mod. The library blank-import in tools.go pins the matching version
# so `go mod tidy` keeps the library in go.sum — bump them together.
GOOSE      := go run github.com/pressly/goose/v3/cmd/goose@v3.27.1
GOOSE_DIR  := db/migrations
GOOSE_DSN_KEY    := POSTGRES_DSN
GOOSE_DRIVER_VAL := postgres

ifeq ($(MIGRATE_ENV),prod)
MIGRATE_ENV_FILE := ./.env.production
else
MIGRATE_ENV_FILE := ./.env.local
endif

# Read-from-envfile helper: extracts $(GOOSE_DSN_KEY) from
# $(MIGRATE_ENV_FILE) without sourcing the file. Strips both the
# `<KEY>=` prefix and the surrounding double quotes the env templates
# emit. Errors loudly if the var is missing.
define MIGRATE_RUN
	@dsn=$$(grep "^$(GOOSE_DSN_KEY)=" $(MIGRATE_ENV_FILE) | head -n1 | sed -e "s/^$(GOOSE_DSN_KEY)=//" -e 's/^"//' -e 's/"$$//'); \
	if [ -z "$$dsn" ]; then echo "$(GOOSE_DSN_KEY) missing from $(MIGRATE_ENV_FILE)"; exit 1; fi; \
	GOOSE_DRIVER=$(GOOSE_DRIVER_VAL) GOOSE_DBSTRING="$$dsn" GOOSE_MIGRATION_DIR=$(GOOSE_DIR) $(GOOSE)
endef

migrate-up:
	$(MIGRATE_RUN) up

migrate-down:
	$(MIGRATE_RUN) down

migrate-status:
	$(MIGRATE_RUN) status

# migrate-create scaffolds a new sql migration file with a timestamped
# version. Usage: `make migrate-create name=add_phone_to_customers`.
# Goose names files `<timestamp>_<name>.sql` and seeds them with empty
# `-- +goose Up` / `-- +goose Down` blocks. Fill BOTH directions in:
# Down migrations are not optional — `make migrate-down` runs them
# verbatim, so a `-- TODO` here means rollback is silently a no-op.
#
# `create` does not need a DB connection, so it skips the env-file read.
migrate-create:
	@if [ -z "$(name)" ]; then echo "usage: make migrate-create name=<descriptive_snake_case>"; exit 1; fi
	@$(GOOSE) -dir $(GOOSE_DIR) create $(name) sql

# ----- Learnlab checks (hand-written; not generated) -------------------------
# Linux Node, never the Windows one reached through WSL interop; see
# README "Checks". Override with NODE=... on another machine.
NODE ?= /home/inxpirativ/tools/node/bin/node
STATIC := cmd/web/static

# Syntax-check every browser module, then run the pure-math and lab unit tests.
check-js:
	@fails=0; for f in $$(find $(STATIC) -name '*.js'); do $(NODE) --check $$f || fails=1; done; \
	  [ $$fails = 0 ] && echo "node --check: $$(find $(STATIC) -name '*.js' | wc -l) files ok"
test-js:
	@cd $(STATIC) && out=$$($(NODE) --test 'sims/**/*.test.js' 'i18n.test.js' 2>&1); code=$$?; \
	  echo "$$out" | grep -E '^# (tests|pass|fail)|^not ok'; exit $$code

# Everything that needs no running stack: Go vet and tests (includes the content
# checks), JS syntax, and the JS unit tests.
check:
	go vet ./...
	go test ./...
	$(MAKE) check-js
	$(MAKE) test-js

# Browser end-to-end smoke over every lesson and lab. Needs the stack running and
# seeded: `make dev`, `go run ./cmd/app`, `go run ./cmd/seed`, `go run ./cmd/web`.
e2e:
	LEARNLAB_URL=$${LEARNLAB_URL:-http://localhost:3100} $(NODE) scripts/e2e.mjs

# @hexago:make:targets
