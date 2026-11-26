package main

import (
	"io/fs"
	"strings"
	"testing"
	"testing/fstest"
)

const staticDir = "../web/static"

func embeddedCatalog(t *testing.T) *Catalog {
	t.Helper()
	root, err := fs.Sub(contentFS, "content")
	if err != nil {
		t.Fatal(err)
	}
	cat, err := loadCatalog(root)
	if err != nil {
		t.Fatal(err)
	}
	return cat
}

// The embedded catalog is the product's content: pin its invariants so a bad
// edit fails here instead of at seed time against a live API.
func TestEmbeddedCatalogIsWellFormed(t *testing.T) {
	cat := embeddedCatalog(t)
	if len(cat.Paths) == 0 || len(cat.Courses) == 0 {
		t.Fatal("empty catalog")
	}
	for _, co := range cat.Courses {
		for _, l := range co.Lessons {
			for _, problem := range lintLesson(staticDir, co.Slug, l) {
				t.Errorf("%s/%s: %s", co.Slug, l.Slug, problem)
			}
		}
	}
}

func TestLintCatchesBrokenLessons(t *testing.T) {
	body := strings.Join([]string{
		"::: intro", "- a", ":::", "",
		"## Heading without a lead", "",
		"Text [[figure:x/missing|Cap]] and [[figure:nope|Cap]].",
	}, "\n")
	bad := Lesson{Slug: "x", Title: "X", Kind: "simulator", Simulator: "no-such-lab", Minutes: 5, Body: body,
		Questions: []Question{{Prompt: "p", Options: []string{"a", "a"}, Answer: 3}}}
	problems := strings.Join(lintLesson(staticDir, "clustering", bad), "\n")
	for _, want := range []string{"no-such-lab", "@@lab", "lead line", `missing "::: remember"`, `unknown figure "nope"`, "does not register", "quiz questions", "answer out of range", "repeats the option", "needs a prompt and an explanation"} {
		if !strings.Contains(problems, want) {
			t.Errorf("lint did not report %q; got:\n%s", want, problems)
		}
	}
}

func TestPathsAndCoursesResolve(t *testing.T) {
	cat := embeddedCatalog(t)
	for _, co := range cat.Courses {
		inModule := map[string]bool{}
		for _, m := range co.Modules {
			if len(m.Lessons) == 0 {
				t.Fatalf("%s/%s: module has no lessons", co.Slug, m.Slug)
			}
			for _, l := range m.Lessons {
				inModule[l] = true
			}
		}
		for _, l := range co.Lessons {
			if !inModule[l.Slug] || l.Module == "" {
				t.Fatalf("%s/%s: lesson is not in a module", co.Slug, l.Slug)
			}
		}
	}
}

// good is a tiny valid tree the negative tests start from.
func good() fstest.MapFS {
	lesson := "---\nslug: one\ntitle: One\nkind: reading\nsimulator: \"\"\nminutes: 5\n---\nbody\n"
	return fstest.MapFS{
		"paths/p.yaml":            {Data: []byte("slug: p\ntitle: P\nsummary: s\nlevel: beginner\nposition: 1\nrequires: []\n")},
		"courses/c/course.yaml":   {Data: []byte("slug: c\ntitle: C\nsummary: s\ntopic: t\nlevel: beginner\npath: p\nposition: 1\nmodules:\n- slug: m\n  title: M\n  summary: s\n  lessons: [one]\n")},
		"courses/c/one/lesson.md": {Data: []byte(lesson)},
		"courses/c/one/quiz.yaml": {Data: []byte("[]\n")},
	}
}

func TestLoadCatalogRejectsBrokenTrees(t *testing.T) {
	if _, err := loadCatalog(good()); err != nil {
		t.Fatalf("the base tree should load: %v", err)
	}
	cases := map[string]func(fstest.MapFS){
		"unknown path": func(m fstest.MapFS) {
			m["courses/c/course.yaml"] = &fstest.MapFile{Data: []byte(strings.Replace(string(m["courses/c/course.yaml"].Data), "path: p", "path: nope", 1))}
		},
		"orphan lesson folder": func(m fstest.MapFS) {
			m["courses/c/two/lesson.md"] = &fstest.MapFile{Data: []byte("---\nslug: two\ntitle: T\nkind: reading\nsimulator: \"\"\nminutes: 1\n---\nx\n")}
			m["courses/c/two/quiz.yaml"] = &fstest.MapFile{Data: []byte("[]\n")}
		},
		"missing lesson folder": func(m fstest.MapFS) { delete(m, "courses/c/one/lesson.md") },
		"slug mismatch": func(m fstest.MapFS) {
			m["courses/c/one/lesson.md"] = &fstest.MapFile{Data: []byte("---\nslug: other\ntitle: T\nkind: reading\nsimulator: \"\"\nminutes: 1\n---\nx\n")}
		},
		"unknown front matter key": func(m fstest.MapFS) {
			m["courses/c/one/lesson.md"] = &fstest.MapFile{Data: []byte("---\nslug: one\ntitle: T\nkind: reading\nsimulator: \"\"\nminutes: 1\nbogus: 1\n---\nx\n")}
		},
		"prerequisite cycle": func(m fstest.MapFS) {
			m["paths/p.yaml"] = &fstest.MapFile{Data: []byte("slug: p\ntitle: P\nsummary: s\nlevel: beginner\nposition: 1\nrequires: [q]\n")}
			m["paths/q.yaml"] = &fstest.MapFile{Data: []byte("slug: q\ntitle: Q\nsummary: s\nlevel: beginner\nposition: 2\nrequires: [p]\n")}
		},
		"lesson in two modules": func(m fstest.MapFS) {
			m["courses/c/course.yaml"] = &fstest.MapFile{Data: []byte("slug: c\ntitle: C\nsummary: s\ntopic: t\nlevel: beginner\npath: p\nposition: 1\nmodules:\n- slug: m\n  title: M\n  summary: s\n  lessons: [one]\n- slug: n\n  title: N\n  summary: s\n  lessons: [one]\n")}
		},
	}
	for name, mutate := range cases {
		t.Run(name, func(t *testing.T) {
			m := good()
			mutate(m)
			if _, err := loadCatalog(m); err == nil {
				t.Fatal("expected an error")
			}
		})
	}
}

func TestNumbersAreComparedAcrossLocalesAndFormats(t *testing.T) {
	if got := normalizeNumber("20.000", "id"); got != "20000" {
		t.Errorf("id thousands: %s", got)
	}
	if got := normalizeNumber("3,5", "id"); got != "3.5" {
		t.Errorf("id decimal: %s", got)
	}
	if got := normalizeNumber("20,000", "en"); got != "20000" {
		t.Errorf("en thousands: %s", got)
	}
	if got := normalizeNumber("3.5", "en"); got != "3.5" {
		t.Errorf("en decimal: %s", got)
	}
}

func TestLintTranslationCatchesDriftFromTheOriginal(t *testing.T) {
	base := Lesson{Slug: "x", Kind: "reading", Body: "::: intro\n- a\n:::\n\n## One\n*Lead?*\n\nThe mean is 3.5 and the total 20,000.\n\n## Two\n*Lead?*\n\nText.\n\n::: remember\n- r\n:::",
		Questions: []Question{{Prompt: "p", Options: []string{"a", "b"}, Answer: 1, Explanation: "e"}}}
	drift := &LessonText{Title: "X", Body: "::: intro\n- a\n:::\n\n## Satu\n*Arah?*\n\nRata-rata 3.5 dan total 20.000 dan juga 99.\n\n::: remember\n- r\n:::",
		Questions: []Question{{Prompt: "p", Options: []string{"a", "b", "c"}, Answer: 0, Explanation: ""}}}
	problems := strings.Join(lintTranslation(staticDir, "clustering", base, "id", drift), "\n")
	for _, want := range []string{"1 sections, but the English lesson has 2", "decimal point", "number 99 is in the translation", "has 3 options, English has 2", "keep the same answer index", "needs a prompt and an explanation"} {
		if !strings.Contains(problems, want) {
			t.Errorf("missing %q in:\n%s", want, problems)
		}
	}
	ok := &LessonText{Title: "X", Body: "::: intro\n- a\n:::\n\n## Satu\n*Arah?*\n\nRata-rata 3,5 dan total 20.000.\n\n## Dua\n*Arah?*\n\nTeks.\n\n::: remember\n- r\n:::",
		Questions: []Question{{Prompt: "p", Options: []string{"a", "b"}, Answer: 1, Explanation: "e"}}}
	if p := lintTranslation(staticDir, "clustering", base, "id", ok); len(p) != 0 {
		t.Errorf("a faithful translation should pass, got %v", p)
	}
}

func TestLintTranslationFlagsCasualIndonesian(t *testing.T) {
	base := Lesson{Slug: "x", Kind: "reading", Body: "::: intro\n- a\n:::\n\n## One\n*Lead?*\n\nText.\n\n::: remember\n- r\n:::",
		Questions: []Question{{Prompt: "p", Options: []string{"a", "b"}, Answer: 1, Explanation: "e"}}}
	casual := &LessonText{Title: "X", Body: "::: intro\n- a\n:::\n\n## Satu\n*Arah?*\n\nGimana cara kerjanya? Cuma sekali jalan, `aja` di kode.\n\n::: remember\n- r\n:::",
		Questions: []Question{{Prompt: "Kenapa begitu?", Options: []string{"a", "tidak"}, Answer: 1, Explanation: "e"}}}
	problems := strings.Join(lintTranslation(staticDir, "clustering", base, "id", casual), "\n")
	for _, want := range []string{`casual word "Gimana"`, `casual word "Cuma"`, `question 1: casual word "Kenapa"`} {
		if !strings.Contains(problems, want) {
			t.Errorf("missing %q in:\n%s", want, problems)
		}
	}
	if strings.Contains(problems, `"aja"`) {
		t.Errorf("a casual word inside code must be exempt:\n%s", problems)
	}
}
