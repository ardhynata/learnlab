# Lesson and lab authoring guide

Read this whole file before you write anything. It is the contract for everyone building a lesson in parallel.

## What we are building

Learnlab teaches machine learning to **beginners** by letting them run the idea. A lesson has three views: **Learn** (study text, one section at a time), **Simulate** (a lab plus a lab guide) and **Quiz** (one question at a time). You build one lesson end to end: the text, the quiz, its figures, its lab, and the math behind the lab.

Quality bar: it must be correct, clear to someone who has never seen the topic, and feel like the existing lessons. Study `cmd/seed/content/courses/clustering/kmeans/` (text and quiz), `cmd/web/static/figures/clustering.js` (figures) and `cmd/web/static/sims/labs/distance-playground.js` (a lab on the kit) before you start.

## Files you own, and nothing else

For lesson `<lesson>` in course `<course>`, lab key `<lab>`:

| File | What |
|---|---|
| `cmd/seed/content/courses/<course>/<lesson>/lesson.md` | front matter, then the lesson text |
| `cmd/seed/content/courses/<course>/<lesson>/quiz.yaml` | the questions |
| `cmd/web/static/figures/lessons/<lesson>.js` | this lesson's figures (create it only if the lesson has figures) |
| `cmd/web/static/sims/labs/<lab>.js` and `<lab>.test.js` | the lab, and tests for any pure logic you put in it |
| `cmd/web/static/sims/ml/<name>.js` and `<name>.test.js` | NEW pure math the lab needs (pick a name that is clearly yours) |

**Do not touch anything else.** In particular: `app.js`, `style.css`, `md.js`, `sims/common.js`, everything in `sims/kit/`, the existing files in `sims/ml/`, other lessons, `course.yaml`, `paths/*.yaml`, `Makefile`, Go code. Other agents are building other lessons at the same time. If you need a kit change or a shared helper, do not work around it silently: finish with what you can and list it under `needs` in your report. Do not run the seeder, restart servers, or run `make`.

You may **import** the kit and the existing math: `import { createLab, createPlot, drawLineChart, panel, rng, clusterColor, distance } from '../kit/index.js'` and the modules in `sims/ml/` (`rng, distance, scale, knn, regression, metrics, linalg, datasets, gd`).

## Lesson file

`lesson.md` is YAML front matter, then Markdown:

```
---
slug: <lesson>
title: Short title
kind: simulator          # or: reading (no lab)
simulator: <lab>         # "" for reading
minutes: 20
---
::: intro
- Goal one (starts with a verb).
- Goal two.
- Goal three.

Before you start: read "<earlier lesson title>".   (or: nothing. ...)
:::

## First section title
*One italic sentence saying what this section answers?*

Body text...

## Second section title
*...?*
...

::: remember
- Three bullets that restate the lesson.
:::

@@lab                    # only for simulator lessons

## Lab: <name>
### Controls
- ...
### Experiments
1. ...
```

Rules (`go run ./cmd/seed -lint <lesson folder>` enforces the mechanical ones):

- **Quote YAML strings that contain a colon** in front matter.
- 5 to 8 `##` sections of about 120 to 180 words each. **Every `##` heading is followed immediately by one italic lead sentence** (`*...?*`, no asterisks inside).
- Start with `::: intro` (3 goal bullets plus a "Before you start" line) and end the learn part with `::: remember` (3 bullets). Containers close with a line containing only `:::`.
- **Figures:** two to four per lesson, written `[[figure:<lesson>/<name>|Caption sentence.]]` on a line of its own. The name must be registered in your `figures/<course>/<lesson>.js`.
- **Go deeper:** one to three optional folds: `::: deeper A short title` ... `:::`. They are collapsed by default; use them for derivations and side topics so the main path stays short.
- Callouts: only `> Key idea: ...` and `> Watch out: ...` stand out. `> Worked example: ...` is neutral. Never use callouts as decoration.
- **Worked examples use real numbers.** Compute them (use `node -e` to check arithmetic) and show the steps. A beginner should be able to follow with a pencil.
- Markdown subset: `##`/`###` headings, `-` and `1.` lists, `|` tables, fenced code blocks, `**bold**`, `*italic*`, `` `code` ``. No HTML, no images, no links.
- Plain words. Define a term the first time. Short sentences. No filler ("it is important to note").
- Never claim something you have not checked. Do not invent statistics, history, or library behavior. If a fact is simplified, say "roughly" or "in this lesson".
- The `@@lab` guide must describe **exactly** the controls and labels your lab has, and give four to six numbered experiments a learner can try and observe (each experiment states what to do and what to look for).

## Quiz file

`quiz.yaml` is a list:

```yaml
- prompt: A question ending in a question mark?
  options:
  - First option
  - Second option
  - Third option
  - Fourth option
  answer: 2            # index of the right option, from 0
  explanation: One or two sentences saying why it is right (and what the common wrong idea is).
```

- **8 to 10 questions**, 3 to 5 options each, an explanation on every question.
- Test understanding, not trivia: interpretation, small calculations from the lesson's worked example, "what would happen if", spotting a misconception.
- Vary where the right answer sits (the lint rejects a bank where it is first almost every time). Options must not repeat. Avoid "all of the above" and "none of the above".
- Every question must be answerable from the lesson text and lab alone.

## Figures

`cmd/web/static/figures/lessons/<lesson>.js`:

```js
import { svg, dot, ring, cross, diamond, text, line, box, k, soft } from '../kit.js';
function myFigure() { return svg(640, 240, `${box(...)} ${text(...)} ...`); }
export const figures = { 'my-figure': myFigure };
```

Colors come from CSS variables only (`k(0)`..`k(6)`, `var(--ink)`, `var(--muted)`, `var(--line)`, `var(--surface)`, `var(--accent-soft)`), so figures follow light and dark mode. Look at `figures/clustering.js` for patterns (flow charts, scatter panels, curves, number lines). Keep the text readable at a 700 px wide figure (font size 12 to 15 in viewBox units), avoid overlapping labels, and keep one idea per figure. Preview all of a lesson's figures at `#/figures/<lesson>`.

## The lab

One file, `sims/labs/<lab>.js`, exporting `mount(root)` that returns a destroy function. Build it on the kit and copy the structure of `distance-playground.js`:

```js
import { createLab, createPlot, drawLineChart, rng, clusterColor, distance } from '../kit/index.js';
export function mount(root) {
  const lab = createLab(root, { title, hint, playback /* Run/Step/Previous toolbar */, status, extra: { title, hint } });
  const plot = createPlot(lab.canvas);                 // 0..10 plot square with themed axes
  const controls = lab.panel([...specs], onChange);     // select, range, number, toggle, button, note
  const stepper = lab.stepper({ init, step, isDone, render });   // step() must return a NEW state
  const chart = lab.chartCard('Title', 'hint');          // a second canvas; draw it with drawLineChart
  lab.onTheme(draw); lab.onResize(draw);
  return lab.destroy;
}
```

Requirements:

- **Interesting immediately:** the defaults must show something meaningful before the learner touches anything. Data is **seeded** (reproducible); offer a "new sample" button where randomness is the point.
- One main idea. Every control has a plain label; every number shown has a name. No jargon in labels.
- Draw only with theme colors (`clusterColor(i)`, `plot.g.t.ink/muted/accent`); it must look right in dark mode. Redraw on `lab.onTheme` and `lab.onResize`.
- Everything is cleaned up in `destroy` (the kit does it for stepper timers, listeners via `lab.on`, and observers).
- Works at 375 px wide (the kit's layout stacks); keyboard-operable (canvas dragging should have a keyboard alternative such as arrow keys, or an equivalent control).
- Math goes in `sims/ml/<name>.js` as pure functions with a `.test.js` (node:test, see `sims/ml/ml.test.js`) that pins real behavior, including at least one hand-computed number. The lab file only draws and wires.
- No `console.log`, no globals, no third-party libraries. No network calls except loading a bundled dataset through `loadDataset()` (`sims/kit/data.js`; bundled files are in `cmd/web/static/data/`, each with a provenance note).
- Fullscreen, theme toggle and Reset come from the kit; wire Reset with `lab.onReset`.
- Preview alone at `#/lab/<lab>` (no database needed).

## Checking your work (do all of these)

The dev stack is already running at `http://localhost:3100` and serves the frontend **from disk**, so a reload shows your latest edit. Use the repo root `/home/inxpirativ/go/src/learnlab` as the working directory.

```bash
N=/home/inxpirativ/tools/node/bin/node          # never the bare `node` (that is the Windows one)
go run ./cmd/seed -lint cmd/seed/content/courses/<course>/<lesson>     # authoring rules
$N --check cmd/web/static/sims/labs/<lab>.js                           # syntax (repeat for each .js you wrote)
(cd cmd/web/static && $N --test 'sims/**/*.test.js')                  # all unit tests must pass
$N scripts/shot.mjs '#/lab/<lab>' /tmp/<lab>.png                       # screenshot + console errors
$N scripts/shot.mjs '#/lab/<lab>' /tmp/<lab>-dark.png --dark
$N scripts/shot.mjs '#/lab/<lab>' /tmp/<lab>-phone.png --phone
$N scripts/shot.mjs '#/figures/<lesson>' /tmp/<lesson>-figures.png
```

Then **look at the screenshots** (open the PNG with the Read tool) and fix what you see: overlapping labels, blank plots, unreadable text, overflow. `shot.mjs` also takes `--click '<css>'` and `--eval '<js>'` to drive controls and read values (for example click `[data-act="step"]`, or evaluate `document.querySelector('[data-ref=status]').textContent`). A lab that merely renders is not done: operate every control and make sure each one does what its label says.

Finally read your own lesson text once as a beginner would, and recompute every number in it.

## Report

End with a short JSON-able report: what you built, the lab key, every file path you created, the number of quiz questions, anything you are unsure about (`concerns`), and anything you needed that you were not allowed to change (`needs`).


## Course structure and lesson design (from ML_Syllabus.docx)

`docs/syllabus.txt` is the source of truth for what each course teaches. A **course** is one syllabus module and has two to four short lessons arranged in two parts: **Core ideas** (reading lessons) and **Lab** (the simulator lesson, which ends the course). Every course's lab lesson has a lab; the course's last Core-ideas lesson hands over to it.

A lab lesson follows the syllabus lesson design, and its lab guide shows it:

1. **Predict** what will happen before changing a setting (each experiment starts with a "Predict:" prompt).
2. **Manipulate** the data or the model and observe the result.
3. **Explain** the result using the module's concepts.
4. **Transfer** to a real dataset: the lab has a **Generated data / Real data** switch (kit helper), and the last experiment asks the learner to repeat the idea on the real data and to check it with a fresh seed or split.

Use the syllabus module's own lab sentence as the starting point for the lab. Labs built on "the course dataset" (k-NN, k-means, regression) start from `SHARED_SEED` in `sims/datasets.js` so the learner sees the same points in each.

Figures: a lesson's own figures live in `figures/lessons/<lesson>.js` (lesson slugs are unique). Bare names `[[figure:name|...]]` come from the shared bundles `figures/common.js`, `clustering.js`, `nearest-neighbors.js`.

The capstone course ends the level; it is a guided project, not a reading.
