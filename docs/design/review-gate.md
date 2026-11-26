# Review gate

This repository carries the Hexago review-gate kit (`.hexago-review-kit.json` names the kit version). The gate is a blocking, tiered review of every PR, enforced at merge time by a hook, and since kit v4 that hook is Go: `hexago review-gate guard`. The operating rules for sessions are the "Review gate" section of `CLAUDE.md`; what the hook decides is documented by `hexago review-gate guard --help`. Hexago's own, fuller design note is `docs/design/review-gate.md` in the Hexago repository.

## What the kit installed

| Path | Role |
|---|---|
| `scripts/review-gate.pin` | The gate pin: two lines, `gate=<n>` and `sha256=<digest of the Go gate sources>`. Byte-identical to what Hexago's `hexago review-gate pin` prints. |
| `scripts/review_tiers.json` | The path-to-tier table. Yours: extend it for your layout (first match wins, no catch-all). |
| `.claude/agents/pr-reviewer.md` | The read-only reviewer agent. Yours. |
| `.claude/agents/pr-shipper.md` | The shipper agent that stops at the draft PR. Yours. |
| `docs/design/review-gate.md` | This note. Yours. |
| `CLAUDE.md` | The "Review gate" section between the `review-gate-kit` markers. |
| `.hexago-review-kit.json` | The kit stamp: the kit version, the Hexago build that wrote it and a sha256 per file. |

A project created by kit v1 to v3 also carries `scripts/review_tier.py`, `scripts/review_gate_guard.py` and `scripts/gate_pipe_guard.py`, the Python gate those versions shipped. A project on kit v4 or later is not given them, and an older project keeps them untouched: they are inert once the hook is wired to the Go gate, and a later kit version removes them. While they are present the Go hook still requires them to equal the base branch's.

The pin is the one verbatim file on purpose: it says which gate this repository was reviewed against, and a hexago built from other gate sources no longer equals it. A local edit to it makes it differ from the base branch, which the trust check treats as an unreviewed change to the gate.

## Flow

1. The agent finishes and its local gates pass; the branch is current with the trunk.
2. The PR is opened or kept as a DRAFT and the shipper ends.
3. The reviewer reviews that exact commit once, at the tier's model and effort.
4. ONE fix commit applies every blocking finding and every improvement; the reviewer re-checks only that commit.
5. On PASS the orchestrator runs `gh pr ready`, watches CI to green by check name and merges with `gh pr merge <N> --squash --delete-branch --match-head-commit <head sha>`.

A commit after the PASS makes it stale. A PASS never overrides a red or CANCELLED check.

## Tiers

| Tier | Reviewer | Default paths in this table |
|---|---|---|
| T0 | none | Markdown under `docs/`, `README.md`, `LICENSE` |
| T1 | sonnet / high | `web/**`, the generated HTMX assets, non-Markdown `docs/`, `testdata/**` |
| T2 | opus / high | `internal/**`, `cmd/**`, `gen/**`, `proto/**`, `.hexago.yaml` |
| T3 | opus / xhigh | the gate itself, CI, dependencies, build and deploy files (including `tailwind.config.js` and `resources/css/**`: the Tailwind build executes the config, and an `@config` line in the input CSS makes it run another file), `.env*`, auth, config and migrations |
| owner | nobody | only the paths a rule of yours names (see below); no default path is `owner` |

The highest changed path wins; more than 40 files, more than 1500 changed lines and 2 or more CI fix loops each raise the tier by one, capped at T3. The table is `scripts/review_tiers.json`: rules are matched top to bottom, the first match wins, `*` does not cross `/`, and a path no rule matches is UNCLASSIFIED (the classifier exits 2) and blocks the merge until the table is updated. Put specific rules above generic ones. When you add a top-level directory, add its rule in the same PR as the first change that touches it. `hexago review-gate tier --root <absolute path of the checkout> --paths - --lines <n>` computes a tier the way the hook does.

### The owner tier

A rule may name the tier `owner`: `{"glob": "gen/rate.yaml", "tier": "owner", "reason": "rates change money"}`. `reason` is optional free text that the denial shows. `owner` ranks above T3 and is not a marker tier (the marker grammar stops at `T3`), so no review comment can satisfy it: the hook always denies a PR that touches an owner path, the owner merges it by typing the merge command, and a reviewer's PASS on it is advice that unlocks nothing. A bump never reaches `owner` and `--min-tier` does not accept it. Use it for the changes only a person may approve (rates, formulas, money paths), and consider naming `scripts/review_tiers.json` and `scripts/review-gate.pin` as `owner` so that loosening the gate is the owner's act too.

Adopt an `owner` rule only after every machine that merges has moved to the Go hook. The Python classifier of kit v1 to v3 (`scripts/review_tier.py`) does not know the value: given a PR that touches an owner path it stops with a traceback (`ValueError: 'owner' is not in list`, exit 1), which the Python hook reads as a classifier error and denies. That is safe but it is the wrong message, and it blocks every merge that touches such a path until the machine is rewired.

## Marker

The reviewer posts a PR comment whose first line is exactly `REVIEW: PASS|BLOCK tier=Tn model=<sonnet|opus|fable> [fallback=fable-limit] sha=<40 lowercase hex> [pass=1|2]`. Only a comment from the owner account counts, and the line is read strictly. The grammar (the `fallback=fable-limit` token is deprecated and meaningless), the Opus-top-tier rule and the selfgov rule (two `model=opus` passes for the gate's own files) are spelled out in the "Review gate" section of `CLAUDE.md`.

## Fable on request

Fable is not a routine tier, but the owner may ask in chat for a Fable review of any PR. The orchestrator then spawns the reviewer with model fable and effort xhigh, and the marker says `model=fable`; the hook accepts it at every tier, and on a selfgov PR a `pass=1` and a `pass=2` both posted as `model=fable` count, as does a mix with an opus pass. On a Fable usage-limit error the orchestrator asks the owner (wait, or use Opus) and never relabels an Opus review as `model=fable`. The orchestrator may RECOMMEND Fable for a specific PR, but only on the owner's approval: it asks in chat with the reason, a rough cost and a default deadline of 5 minutes, keeps working meanwhile, and treats silence as no: Opus continues. If a usage-limit error follows a yes, it tells the owner and uses Opus only if the owner says so. The deadline wakeup fires only while the session is alive.

## Wiring and bootstrap

The hook is wired per machine in the gitignored `.claude/settings.json`, AFTER the pin and the table are on the trunk: a `Bash` PreToolUse entry `<absolute path of a hexago binary> review-gate guard --root "$CLAUDE_PROJECT_DIR"` with `"timeout": 10` and `"onFailure": "block"`. The binary must be one whose gate digest equals the pin on the trunk: `hexago review-gate pin` prints the digest, `hexago review-gate pin-check --root <absolute path>` compares it with the checkout's pin, and `hexago review-gate guard --selftest` must exit 0. A hook that names any other binary denies every merge (the denial names both digests and the way out), and a hook whose binary is gone blocks every Bash call under `onFailure: block`; remove the entry with the Edit tool or from a terminal outside the session. `hexago scaffold review-gate` says whether it wired the hook and, when it did not, why; wire the entry above by hand when it did not. `hexago init` never wires the hook, and a settings file that git tracks would put an `onFailure: block` hook in front of every collaborator, so keep it gitignored. The PR that introduces the gate cannot be reviewed by it, so the owner merges that PR. Until a machine wires the hook the gate is a convention, not a check.

## Updating the kit

Hexago ships a hardening of the gate as a new kit version, and every change to the Go gate sources changes the digest and so the pin. Adopt a new version with `hexago upgrade --only review-gate-kit`, run with the newer hexago: it creates `scripts/review-gate.pin` when it is absent, replaces a pin that an earlier kit version shipped, moves the stamp, and leaves the hook, the Python scripts of an older kit, the table, the agents and the `CLAUDE.md` section alone. Make the result one PR (a review-system change: two opus passes) and merge it from a checkout on the trunk, so the trust check compares clean. Keep the hook on the binary whose digest equals the CURRENT trunk pin until that PR has merged (the PR is judged by the old gate; a hook already moved to the newer binary denies its merge), then fast-forward and wire the newer binary. `scripts/review_tiers.json`, the agents and the `CLAUDE.md` section are yours and a kit update never overwrites them; read the new kit's default table and adopt any rule that fits your layout (kit v4 added `tailwind.config.js` and `resources/css/**`, both T3, and allows the `owner` tier).
