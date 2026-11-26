# Translation guide (English to Indonesian)

Read this whole file and `docs/glossary-id.md` before you translate anything, and `docs/lesson-authoring.md` for how lessons are built. A translation is the same lesson in another language: same structure, same figures, same numbers, same quiz. It is not a rewrite.

## How translations are stored

Each lesson folder gets two extra files beside the English ones:

```
cmd/seed/content/courses/<course>/<lesson>/lesson.id.md   # front matter (slug + title only) and the translated body
cmd/seed/content/courses/<course>/<lesson>/quiz.id.yaml   # the translated quiz, same questions in the same order
```

`lesson.id.md` front matter has exactly two keys, and the slug must equal the folder name:

```
---
slug: <lesson>
title: Judul dalam bahasa Indonesia
---
```

Courses, modules and paths carry `translations:` blocks in their YAML (`title` and `summary`).

## What must match the English version (the linter checks all of it)

Run `go run ./cmd/seed -lint cmd/seed/content/courses/<course>/<lesson>` and fix every line it prints.

- The same number of `##` sections, in the same order, each followed by one italic lead sentence (`*...?*`).
- The same `::: intro`, `::: deeper <title>` and `::: remember` blocks, and `@@lab` only when the English has it.
- The same `[[figure:<lesson>/<name>|caption]]` lines: **names do not change, captions are translated**.
- The same quiz: same number of questions, same number of options per question, **the same index for the right answer**, every question with an explanation. Do not reorder options.
- The same numbers. Every number in the English text appears in the Indonesian text and vice versa.

## Numbers

Indonesian writes a decimal comma and a thousands dot. In prose, tables, quiz text and lab guides write **3,5** (not 3.5) and **20.000** (not 20,000). Inside code spans and fenced code blocks keep the dot (`0.5`, `eps = 0.3`) because code is code. When a lab or figure draws a number, it uses `fmt()` from `i18n.js` and the language decides the format (see below).

## Callouts

Callout labels are translated; the renderer knows these Indonesian labels:

| English | Indonesian (use exactly these) |
|---|---|
| `> Key idea:` | `> Gagasan kunci:` |
| `> Watch out:` | `> Awas:` |
| `> Worked example:` | `> Contoh hitungan:` |
| `> Try it:` | `> Coba sendiri:` |
| `> Note:` | `> Catatan:` |

The intro line `Before you start:` becomes `Sebelum mulai:`. Container headings are rendered by the app ("Dalam pelajaran ini", "Ingat", "Lebih dalam"); you only translate the `::: deeper <title>` title.

## Lab code and figure code (UI strings)

Everything a learner reads in a lab or figure must go through `tr()` and `fmt()`:

```js
import { tr, fmt, pct } from '../../i18n.js';        // from sims/labs/*.js: '../../i18n.js'; from figures/<course>/*.js: '../../i18n.js'; check the path
tr('Straight line', 'Garis lurus')   // string for the current language
fmt(3.5)                              // 3.5 or 3,5
fmt(0.4567, { digits: 2 })            // 0.46 or 0,46
pct(0.965)                            // 96.5% or 96,5%
```

The kit re-exports them: `import { tr, fmt, pct } from '../kit/index.js'`, and figure files get them from `../kit.js`.

Rules:

- Translate labels, hints, button text, `aria-label`s, `title`s, status messages, chart axis titles and legends, plot annotations, panel notes, canvas labels. Do not translate code identifiers, option `value`s, data keys, CSS classes or `data-ref`s.
- Text is built when it is drawn. A lab or figure is rebuilt when the language changes, so call `tr()` at draw time, never once at module load into a long-lived constant (a `const LABEL = tr(...)` at the top of a module goes stale: build the text inside the function that draws).
- Numbers shown to the learner (readouts, tick labels, status text, figure labels) use `fmt()`. Do not use `toFixed` for text a learner reads, because it always prints a dot. `fmt(x, { digits: n })` replaces `x.toFixed(n)`.
- Keep a translated label about as long as the English one so layouts do not break. Check the phone width.
- Unit tests of pure math in `sims/ml/` stay language-free.

## Checking your work

```bash
N=/home/inxpirativ/tools/node/bin/node
go run ./cmd/seed -lint cmd/seed/content/courses/<course>/<lesson>     # includes the translation checks
$N --check <every .js file you touched>
(cd cmd/web/static && $N --test 'sims/**/*.test.js' i18n.test.js)       # must stay green
$N scripts/shot.mjs '#/lab/<lab>' /tmp/<lab>-id.png --lang id         # lab in Indonesian
$N scripts/shot.mjs '#/lab/<lab>' /tmp/<lab>-id-phone.png --lang id --phone
$N scripts/shot.mjs '#/figures/<lesson>' /tmp/<lesson>-id-figures.png --lang id
$N scripts/shot.mjs '#/course/<course>/<lesson>' /tmp/<lesson>-id.png --lang id
```

Look at the screenshots: truncated or overlapping Indonesian text (it is often 20 to 30 percent longer than English), numbers still using a dot, English left behind. Open the English version too (omit `--lang`) and confirm nothing changed there.

Do not run the seeder or `make`, and do not restart servers. Do not touch files you do not own.

## Lab text has one owner

A lab, its figures and its lab guide (the `@@lab` section of the lesson) must use the same control names. Past waves split them across concurrent agents and produced mismatches every time. From now on one agent owns a lab's source file **and** both language versions of that lesson's lab guide (or, when the work is a pipeline, the lab is built first and the guide authored from the finished labels). The guide names a control exactly as the lab shows it, in each language. The lesson author states the English labels in the guide; the translator copies the Indonesian label from the lab's `tr()` calls, never invents one.
