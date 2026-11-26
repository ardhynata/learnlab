# Design note: creator-owned paid courses

Status: proposal, nothing built. Written 2026-11-24. This is not legal, tax or financial advice; the legal and payment parts need professional review before any money is collected.

## 1. Goal

Today Learnlab is one curriculum written by one team: 3 paths, 36 courses, 115 lessons, 44 labs, in English and Indonesian. The goal discussed is a platform where independent creators publish courses they own, learners pay for them, and Learnlab keeps a fraction of the income as a platform fee. The 36-module curriculum stays as the first catalog and the quality benchmark.

Non-goals for the first version: open-source contribution, creator-written lab code running on learner pages, in-app payouts that Learnlab handles itself.

## 2. What exists today (verified in the repo)

- Content is files: `cmd/seed/content/courses/<course>/<lesson>/{lesson.md,quiz.yaml,lesson.id.md,quiz.id.yaml}` plus `course.yaml`. The seeder (`go run ./cmd/seed`) writes them through the REST API; `-lint <lesson folder>` validates one lesson.
- Backend entities live in `gen/*.yaml` (Hexago codegen): Path, Course, Module, Lesson, Question, Learner, Progress and five text tables for translations. Generated code is never hand-edited; a missing generator feature is filed as an issue.
- `Learner` has only `id` and `name`. There is no sign-in, no password, no session, no roles. Progress rows link a learner id to a lesson.
- All content is public. Anything seeded is visible to everyone. The learner's reading position is kept in the browser (`localStorage`).
- Labs are JavaScript modules loaded from `cmd/web/static/sims/labs/<key>.js`, registered in `LAB_META` in `app.js`, and run in the learner's page with full access to it.

## 3. Rights model

- The creator keeps the copyright. Learnlab receives a non-exclusive license to host, display, index, promote and technically process the course (for example to render it, lint it, back it up).
- Open questions for counsel: worldwide or limited, what happens to existing buyers when a creator removes a course (access should survive), how long Learnlab may keep a delisted course, how translations made by Learnlab or by other creators are owned.
- Creators warrant that they hold the rights to every dataset, figure, quotation and image. A takedown and counter-notice process is required.
- Learnlab's own curriculum is owned by Learnlab and marked as such in the catalog.
- Each creator accepts the terms in the product before first publish, and the accepted version and date are stored.

## 4. Roles

| Role | Can do |
|---|---|
| Learner | Browse, buy, read, answer quizzes, track progress |
| Creator | Everything a learner can, plus create and edit their own courses, submit for review, see their sales |
| Reviewer | Approve or reject submissions, request changes |
| Admin | Manage fees, takedowns, refunds, roles |

## 5. Changes by part of the system

### 5.1 Data model (new Hexago entities, in `gen/*.yaml`)

New: `Account` (email, role, terms version), `Creator` (account, display name, payout status), `Listing` (course, price, currency, status draft/in review/published/delisted), `Purchase` (account, listing, amount, fee, provider reference, status), `Submission` (course version, reviewer notes, state).

Changed: `Course` gets `creator_id` (null for Learnlab's own) and `visibility`. `Learner` becomes or links to `Account`. `Progress` keeps its shape.

Course versions: a published course needs an immutable version so a review applies to exactly what learners read. Either a `CourseVersion` entity or a content hash on `Submission`.

Generator limits discovered so far (for example omitempty zeros, issue #5834) are filed against Hexago, not worked around by hand.

### 5.2 Authentication and access control

- Sign-in (email link or a provider) and sessions. Nothing exists now.
- Access rule on every content read: a lesson of a paid course is served only to its creator, a reviewer, an admin or a learner with a completed purchase. A free preview (first lesson or module) is a listing option.
- The static frontend is served from disk; paid lesson text must come from an authorized API call, never from a public file. Quiz answers must not ship to the browser before the learner answers, and stay server-side for paid courses.
- Labs are code, not course text; see 5.5.

### 5.3 Payments and payouts

- Use a payment provider's marketplace product (one that splits a payment between the platform and a creator, such as Stripe Connect) so Learnlab never holds creators' money or collects their identity documents itself. Provider choice depends on the countries served; Indonesia and international support must be checked.
- Platform fee: a percentage of each sale, set per listing or globally. The fee has to cover the provider's cut, refunds, review cost and support.
- Required flows: checkout, receipt, refund (who decides, how long), chargeback, creator onboarding and verification (done by the provider), payout schedule, tax and VAT or local equivalent, invoices.
- Purchases are recorded from the provider's signed webhooks, not from the browser.
- Never type or store card numbers; the provider's hosted checkout is used.

### 5.4 Creator tooling, in stages

1. Pilot (no payments): invited creators send courses in the existing file format as pull requests or archives; a maintainer runs the lint and the checks and seeds them.
2. Portal: a web editor or upload with live preview, lint results in plain language, submit for review, version history, sales dashboard.
3. Optional assistant channel: an MCP server that exposes the guidelines, `new-lab`, lint, checks and preview to an approved creator's AI assistant. It is a convenience layer on top of stages 1 and 2.

Translation: a creator can publish in one language. A second language is optional and labelled; the interface strings of the platform are Learnlab's.

### 5.5 Labs

Creator-written lab code on learner pages is a security and privacy risk (it can read the page, the session and other data). Order of preference:

1. Creators reuse a reviewed library of Learnlab labs and configure them (dataset, parameters, text). This is the version-one rule.
2. Later, creators submit new labs. A lab is reviewed by a maintainer for the math, the teaching claim and the code, then added to the library as a platform lab. The creator is credited and can be paid per use under a separate agreement.
3. Only if needed: creator labs run in a sandboxed frame with no access to the page or the session, talking to the host through a narrow message interface.

Each lab must pass the layout checks (phone, fullscreen at several sizes, both themes) before it is listed. A layout test that runs every lab at fixed sizes is a precondition for opening labs to third parties.

### 5.6 Review and quality

- A submission is checked automatically (lint, quiz structure, length limits, both-language parity if two languages are offered, broken figures, dataset license declared).
- A human reviews accuracy and the teaching claim. A plausible but wrong simulation or explanation is the worst failure. Quiz answers must be checkable against the lesson text.
- Re-review is required for big changes to a published course; small fixes can be fast-tracked.
- Learners can rate and report. Reports route to reviewers, with takedown for copyright or safety.

### 5.7 Moderation, support, compliance

Abuse reports, copyright claims, refunds and disputes need an owner and a response time. Learner data (accounts, purchases, progress) brings privacy obligations: a privacy notice, deletion and export on request, minimum retention. Creator and buyer terms, a refund policy and a content policy are written and versioned.

## 6. Risks

- Cold start: creators need learners and learners need courses. The Learnlab curriculum is the seed.
- Quality dilution: one weak course lowers trust in all of them. Review capacity limits growth.
- Fee competition: the percentage must compete with established course sites and also cover provider fees.
- Operational weight: payments, tax, refunds and moderation are larger than the course platform itself.
- Security: access control mistakes leak paid content; third-party lab code is a risk until sandboxed.

## 7. Phases

| Phase | Scope | Exit check |
|---|---|---|
| 0 | Decide code and content licenses, contributor and creator terms, fee, first country. Legal review. | Written terms exist |
| 1 | Accounts, roles, access control on the API, free courses only. Layout test for all labs. | A creator's free course is visible only after approval |
| 2 | Invited creator pilot with free or invite-only courses; review workflow; creator dashboard (no money) | 3 to 5 creators published and reviewed |
| 3 | Payments through the provider's marketplace product, one country, fee, refunds, webhooks | A real test purchase splits correctly end to end |
| 4 | Self-serve portal, lab library for creators, optional assistant channel | Creators publish without a maintainer's hands-on help |

## 8. Open decisions for the owner

1. Licenses: code license, content license for Learnlab's own courses, creator license terms.
2. Fee: percentage, who pays the provider's cut, minimum payout.
3. Countries and currencies for phase 3; the provider.
4. Is a free tier required (free preview, free courses by creators)?
5. Who reviews, and how many reviews a week the team can afford.
6. Do creators write labs, or only reuse the library, in version one?
7. Does Learnlab's existing curriculum stay free, become paid, or stay free with paid creator courses beside it?

## 9. First steps that carry no regret

- A layout test that opens every lab at fixed screen sizes and fails on clipped cards.
- The Markdown contribution guide and templates.
- The `new-lab` generator.
- The terms and license decisions in section 8, since every later step depends on them.
