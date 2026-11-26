package main

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

// lintLesson returns every way a lesson breaks the authoring rules (see
// docs/lesson-authoring.md). Both `go test` and `go run ./cmd/seed -lint <lesson dir>`
// use it, so an author and the test suite check the same thing.
func lintLesson(staticDir, course string, l Lesson) []string {
	var out []string
	bad := func(format string, a ...any) { out = append(out, fmt.Sprintf(format, a...)) }

	if strings.TrimSpace(l.Title) == "" || l.Minutes <= 0 {
		bad("needs a title and minutes")
	}
	switch l.Kind {
	case "simulator":
		if l.Simulator == "" {
			bad("simulator lesson without a simulator key")
		} else if _, err := os.Stat(filepath.Join(staticDir, "sims", "labs", l.Simulator+".js")); err != nil {
			bad("lab %q has no sims/labs/%s.js", l.Simulator, l.Simulator)
		}
	case "reading":
		if l.Simulator != "" {
			bad("reading lesson names a simulator")
		}
	default:
		bad("unknown kind %q", l.Kind)
	}
	if len(l.Body) > 20000 {
		bad("body is %d characters, over the lesson max_length of 20000", len(l.Body))
	}
	if hasLab := strings.Contains(l.Body, "\n@@lab\n"); hasLab != (l.Kind == "simulator") {
		bad("the @@lab section must exist exactly for simulator lessons")
	}
	out = append(out, lintBody(staticDir, course, l.Slug, l.Body)...)
	out = append(out, lintQuestions(l.Questions)...)
	for loc, t := range l.Translations {
		out = append(out, lintTranslation(staticDir, course, l, loc, t)...)
	}
	return out
}

func lintQuestions(qs []Question) []string {
	var out []string
	if len(qs) < 8 {
		out = append(out, fmt.Sprintf("only %d quiz questions, want at least 8", len(qs)))
	}
	seen := map[string]bool{}
	correct := map[int]int{}
	for _, q := range qs {
		if seen[q.Prompt] {
			out = append(out, fmt.Sprintf("duplicate question %q", q.Prompt))
		}
		seen[q.Prompt] = true
		if strings.TrimSpace(q.Prompt) == "" || strings.TrimSpace(q.Explanation) == "" {
			out = append(out, fmt.Sprintf("question %q needs a prompt and an explanation", q.Prompt))
		}
		if len(q.Options) < 2 || len(q.Options) > 5 {
			out = append(out, fmt.Sprintf("%q has %d options (want 2 to 5)", q.Prompt, len(q.Options)))
		}
		if q.Answer < 0 || q.Answer >= len(q.Options) {
			out = append(out, fmt.Sprintf("answer out of range for %q", q.Prompt))
		}
		opts := map[string]bool{}
		for _, o := range q.Options {
			if opts[o] {
				out = append(out, fmt.Sprintf("%q repeats the option %q", q.Prompt, o))
			}
			opts[o] = true
		}
		correct[q.Answer]++
	}
	// The quiz shuffles options at run time, but a bank where the answer is always the
	// first option usually means options were written in a lazy order.
	if len(qs) >= 8 && correct[0] > len(qs)*3/4 {
		out = append(out, fmt.Sprintf("%d of %d questions have the right answer first; vary the position", correct[0], len(qs)))
	}
	return out
}

var (
	figureRef = regexp.MustCompile(`\[\[figure:([a-z0-9-]+(?:/[a-z0-9-]+)?)\|`)
	leadLine  = regexp.MustCompile(`^\*[^*]+\*$`)
	keyRe     = regexp.MustCompile(`'?([a-z][a-zA-Z0-9-]*)'?\s*[:,]`)
)

// figureBundles are the shared figure files under figures/ that any lesson may use by bare name.
var figureBundles = []string{"common", "clustering", "nearest-neighbors"}

// figureKeys lists the names a figures file registers in `export const figures = {...}`.
func figureKeys(file string) (map[string]bool, bool) {
	src, err := os.ReadFile(file)
	if err != nil {
		return nil, false
	}
	text := string(src)
	i := strings.Index(text, "export const figures")
	if i < 0 {
		return map[string]bool{}, true
	}
	keys := map[string]bool{}
	for _, m := range keyRe.FindAllStringSubmatch(text[i:], -1) {
		keys[m[1]] = true
	}
	return keys, true
}

func lintBody(staticDir, course, lesson, body string) []string {
	var out []string
	bad := func(format string, a ...any) { out = append(out, fmt.Sprintf(format, a...)) }
	learn := strings.SplitN(body, "\n@@lab\n", 2)[0]
	lines := strings.Split(learn, "\n")

	opens, closes := 0, 0
	for _, line := range lines {
		switch {
		case strings.HasPrefix(line, "::: "):
			opens++
		case line == ":::":
			closes++
		}
	}
	if opens != closes {
		bad("%d container openers (::: name) but %d closers (:::)", opens, closes)
	}
	for _, want := range []string{"::: intro", "::: remember"} {
		if !strings.Contains(learn, want) {
			bad("missing %q", want)
		}
	}
	for i, line := range lines {
		if strings.HasPrefix(line, "## ") {
			next := ""
			if i+1 < len(lines) {
				next = lines[i+1]
			}
			if !leadLine.MatchString(next) {
				bad("heading %q needs an italic one-sentence lead line right after it", line)
			}
		}
	}

	// Un-namespaced names live in the shared bundles; namespaced ones in figures/lessons/<lesson>.js.
	shared := map[string]bool{}
	for _, b := range figureBundles {
		keys, _ := figureKeys(filepath.Join(staticDir, "figures", b+".js"))
		for k := range keys {
			shared[k] = true
		}
	}
	for _, m := range figureRef.FindAllStringSubmatch(body, -1) {
		ref := m[1]
		if prefix, name, namespaced := strings.Cut(ref, "/"); namespaced {
			keys, ok := figureKeys(filepath.Join(staticDir, "figures", "lessons", prefix+".js"))
			if !ok || !keys[name] {
				bad("figure %q: figures/lessons/%s.js does not register %q", ref, prefix, name)
			}
			if prefix != lesson {
				bad("figure %q: a lesson may only use its own namespace (%s/...)", ref, lesson)
			}
		} else if !shared[ref] {
			bad("unknown figure %q (not in a shared bundle: %s)", ref, strings.Join(figureBundles, ", "))
		}
	}
	return out
}

// ---- translations ---------------------------------------------------------------

var (
	numToken   = regexp.MustCompile(`\d+(?:[.,]\d+)*`)
	enGrouped  = regexp.MustCompile(`^\d{1,3}(,\d{3})+(\.\d+)?$`)
	idGrouped  = regexp.MustCompile(`^\d{1,3}(\.\d{3})+(,\d+)?$`)
	dotDecimal = regexp.MustCompile(`\b\d+\.\d+\b`)
	fenced     = regexp.MustCompile("(?s)```.*?```")
	inlineCode = regexp.MustCompile("`[^`]*`")
	headingRe  = regexp.MustCompile(`(?m)^## `)
	boxRe      = regexp.MustCompile(`(?m)^::: (intro|deeper|remember)`)
)

// casualID are spoken or slang forms the Indonesian register rule (docs/glossary-id.md) replaces.
var casualID = regexp.MustCompile(`(?i)\b(gimana|nggak|ngga|gak|enggak|cuma|cuman|kenapa|ketemu|makanya|bikin|aja|udah|banget|dikit|sih|deh|nih|kok)\b`)

// normalizeNumber turns a number as written in a locale into a plain dotted decimal.
func normalizeNumber(tok, locale string) string {
	if locale == "id" {
		if idGrouped.MatchString(tok) {
			tok = strings.ReplaceAll(tok, ".", "")
		}
		return strings.ReplaceAll(tok, ",", ".")
	}
	if enGrouped.MatchString(tok) {
		tok = strings.ReplaceAll(tok, ",", "")
	}
	return tok
}

func significantNumbers(text, locale string) map[string]bool {
	out := map[string]bool{}
	for _, tok := range numToken.FindAllString(text, -1) {
		n := normalizeNumber(tok, locale)
		if len(n) >= 2 || strings.Contains(n, ".") {
			out[n] = true
		}
	}
	return out
}

// lintTranslation checks a translated lesson against its English original: same
// structure, same figures, same numbers, same quiz (questions, option counts, answers),
// and number formatting that follows the locale.
func lintTranslation(staticDir, course string, base Lesson, locale string, t *LessonText) []string {
	var out []string
	bad := func(format string, a ...any) {
		out = append(out, fmt.Sprintf("[%s] ", locale)+fmt.Sprintf(format, a...))
	}
	if strings.TrimSpace(t.Title) == "" {
		bad("needs a title")
	}
	for _, p := range lintBody(staticDir, course, base.Slug, t.Body) {
		bad("%s", p)
	}
	if hasLab, baseLab := strings.Contains(t.Body, "\n@@lab\n"), strings.Contains(base.Body, "\n@@lab\n"); hasLab != baseLab {
		bad("the @@lab section must exist exactly when the English lesson has one")
	}
	if a, b := len(headingRe.FindAllString(t.Body, -1)), len(headingRe.FindAllString(base.Body, -1)); a != b {
		bad("%d sections, but the English lesson has %d (keep the same structure)", a, b)
	}
	if a, b := boxRe.FindAllString(t.Body, -1), boxRe.FindAllString(base.Body, -1); strings.Join(a, "|") != strings.Join(b, "|") {
		bad("the intro, deeper and remember blocks differ from the English lesson (%v versus %v)", a, b)
	}
	if a, b := figureRef.FindAllString(t.Body, -1), figureRef.FindAllString(base.Body, -1); strings.Join(a, "|") != strings.Join(b, "|") {
		bad("figure references differ from the English lesson (%v versus %v)", a, b)
	}

	// Numbers: every significant number in one language appears in the other.
	en, tr := significantNumbers(base.Body, "en"), significantNumbers(t.Body, locale)
	for n := range en {
		if !tr[n] {
			bad("the number %s from the English lesson does not appear in the translation", n)
		}
	}
	for n := range tr {
		if !en[n] {
			bad("the number %s is in the translation but not in the English lesson", n)
		}
	}
	// Locale number format in prose: Indonesian uses a decimal comma, so a dot between digits
	// is only valid as a thousands separator (20.000) or inside code.
	if locale == "id" {
		prose := inlineCode.ReplaceAllString(fenced.ReplaceAllString(t.Body, ""), "")
		for _, tok := range dotDecimal.FindAllString(prose, -1) {
			if !idGrouped.MatchString(tok) {
				bad("%q uses a decimal point; Indonesian prose writes a decimal comma (outside code)", tok)
			}
		}
	}

	// Register: no slang or spoken forms in prose, questions, options or explanations (code is exempt).
	if locale == "id" {
		prose := inlineCode.ReplaceAllString(fenced.ReplaceAllString(t.Body, ""), "")
		for _, w := range casualID.FindAllString(prose, -1) {
			bad("casual word %q: use the semi-formal form from docs/glossary-id.md", w)
		}
		for i, q := range t.Questions {
			for _, field := range append([]string{q.Prompt, q.Explanation}, q.Options...) {
				for _, w := range casualID.FindAllString(inlineCode.ReplaceAllString(field, ""), -1) {
					bad("question %d: casual word %q: use the semi-formal form from docs/glossary-id.md", i+1, w)
				}
			}
		}
	}

	// Quiz parity.
	if len(t.Questions) != len(base.Questions) {
		bad("%d quiz questions, but the English quiz has %d (same questions, same order)", len(t.Questions), len(base.Questions))
		return out
	}
	for i, q := range t.Questions {
		b := base.Questions[i]
		if len(q.Options) != len(b.Options) {
			bad("question %d has %d options, English has %d", i+1, len(q.Options), len(b.Options))
		}
		if q.Answer != b.Answer {
			bad("question %d marks option %d, English marks %d (keep the same answer index)", i+1, q.Answer, b.Answer)
		}
		if strings.TrimSpace(q.Prompt) == "" || strings.TrimSpace(q.Explanation) == "" {
			bad("question %d needs a prompt and an explanation", i+1)
		}
		for _, o := range q.Options {
			if strings.TrimSpace(o) == "" {
				bad("question %d has an empty option", i+1)
			}
		}
		// Numbers in the question and its options carry over; the locale format is checked above for prose.
		if locale == "id" {
			for _, field := range append([]string{q.Prompt, q.Explanation}, q.Options...) {
				for _, tok := range dotDecimal.FindAllString(inlineCode.ReplaceAllString(field, ""), -1) {
					if !idGrouped.MatchString(tok) {
						bad("question %d: %q uses a decimal point; write a decimal comma", i+1, tok)
					}
				}
			}
		}
	}
	return out
}
