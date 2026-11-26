package main

import (
	"bytes"
	"fmt"
	"io/fs"
	"path"
	"sort"
	"strings"

	"gopkg.in/yaml.v3"
)

// The catalog is authored as files:
//
//	content/paths/<path>.yaml
//	content/courses/<course>/course.yaml          metadata + modules[]
//	content/courses/<course>/<lesson>/lesson.md   YAML front matter + body
//	content/courses/<course>/<lesson>/quiz.yaml   questions
//
// loadCatalog reads and validates that tree; the seeder then sends it to the API.

type Question struct {
	Prompt      string   `yaml:"prompt" json:"prompt"`
	Options     []string `yaml:"options" json:"options"`
	Answer      int      `yaml:"answer" json:"answer"`
	Explanation string   `yaml:"explanation" json:"explanation"`
}

// Locales are the languages beyond the base (English) that content can be translated
// into. A lesson's translation lives beside it as lesson.<locale>.md and quiz.<locale>.yaml.
var Locales = []string{"id"}

// Text is a translated title and summary (paths, courses and modules).
type Text struct {
	Title   string `yaml:"title"`
	Summary string `yaml:"summary"`
}

// LessonText is one lesson translated into a locale.
type LessonText struct {
	Title     string
	Body      string
	Questions []Question
}

type Lesson struct {
	Translations map[string]*LessonText `yaml:"-"`
	Slug         string                 `yaml:"slug"`
	Title        string                 `yaml:"title"`
	Kind         string                 `yaml:"kind"`
	Simulator    string                 `yaml:"simulator"`
	Minutes      int                    `yaml:"minutes"`
	Body         string                 `yaml:"-"`
	Questions    []Question
	Module       string // module slug, set by the loader
	Position     int    // 1-based position within the course, set by the loader
}

type Module struct {
	Slug         string          `yaml:"slug"`
	Title        string          `yaml:"title"`
	Summary      string          `yaml:"summary"`
	Lessons      []string        `yaml:"lessons"`
	Translations map[string]Text `yaml:"translations"`
}

type Course struct {
	Slug     string   `yaml:"slug"`
	Title    string   `yaml:"title"`
	Summary  string   `yaml:"summary"`
	Topic    string   `yaml:"topic"`
	Level    string   `yaml:"level"`
	Path     string   `yaml:"path"`
	Position int      `yaml:"position"`
	Modules  []Module `yaml:"modules"`
	Lessons  []Lesson `yaml:"-"` // in module order

	Translations map[string]Text `yaml:"translations"`
}

type Path struct {
	Slug     string   `yaml:"slug"`
	Title    string   `yaml:"title"`
	Summary  string   `yaml:"summary"`
	Level    string   `yaml:"level"`
	Position int      `yaml:"position"`
	Requires []string `yaml:"requires"`

	Translations map[string]Text `yaml:"translations"`
}

type Catalog struct {
	Paths   []Path
	Courses []Course
}

func decodeStrict(data []byte, out any) error {
	dec := yaml.NewDecoder(bytes.NewReader(data))
	dec.KnownFields(true)
	return dec.Decode(out)
}

// splitFrontMatter separates "---\n<yaml>\n---\n<body>".
func splitFrontMatter(src string) (front, body string, err error) {
	if !strings.HasPrefix(src, "---\n") {
		return "", "", fmt.Errorf("missing front matter")
	}
	rest := src[4:]
	end := strings.Index(rest, "\n---\n")
	if end < 0 {
		return "", "", fmt.Errorf("front matter is not closed with ---")
	}
	return rest[:end], strings.TrimLeft(rest[end+5:], "\n"), nil
}

func readYAML(fsys fs.FS, name string, out any) error {
	data, err := fs.ReadFile(fsys, name)
	if err != nil {
		return err
	}
	if err := decodeStrict(data, out); err != nil {
		return fmt.Errorf("%s: %w", name, err)
	}
	return nil
}

// translatedFront is the front matter of lesson.<locale>.md: only what differs by language.
type translatedFront struct {
	Slug  string `yaml:"slug"`
	Title string `yaml:"title"`
}

func loadTranslation(fsys fs.FS, dir, slug, locale string) (*LessonText, error) {
	src, err := fs.ReadFile(fsys, path.Join(dir, "lesson."+locale+".md"))
	if err != nil {
		return nil, nil // not translated (yet)
	}
	front, body, err := splitFrontMatter(string(src))
	if err != nil {
		return nil, fmt.Errorf("%s/lesson.%s.md: %w", dir, locale, err)
	}
	var f translatedFront
	if err := decodeStrict([]byte(front), &f); err != nil {
		return nil, fmt.Errorf("%s/lesson.%s.md front matter: %w", dir, locale, err)
	}
	if f.Slug != slug {
		return nil, fmt.Errorf("%s/lesson.%s.md: slug %q does not match its folder %q", dir, locale, f.Slug, slug)
	}
	t := &LessonText{Title: f.Title, Body: strings.TrimRight(body, "\n")}
	if err := readYAML(fsys, path.Join(dir, "quiz."+locale+".yaml"), &t.Questions); err != nil {
		return nil, fmt.Errorf("%s: a translated lesson needs quiz.%s.yaml: %w", dir, locale, err)
	}
	return t, nil
}

func loadLesson(fsys fs.FS, dir, slug string) (Lesson, error) {
	var l Lesson
	src, err := fs.ReadFile(fsys, path.Join(dir, "lesson.md"))
	if err != nil {
		return l, fmt.Errorf("lesson %q: %w", slug, err)
	}
	front, body, err := splitFrontMatter(string(src))
	if err != nil {
		return l, fmt.Errorf("%s/lesson.md: %w", dir, err)
	}
	if err := decodeStrict([]byte(front), &l); err != nil {
		return l, fmt.Errorf("%s/lesson.md front matter: %w", dir, err)
	}
	if l.Slug != slug {
		return l, fmt.Errorf("%s/lesson.md: slug %q does not match its folder %q", dir, l.Slug, slug)
	}
	l.Body = strings.TrimRight(body, "\n")
	if err := readYAML(fsys, path.Join(dir, "quiz.yaml"), &l.Questions); err != nil {
		return l, err
	}
	for _, loc := range Locales {
		t, err := loadTranslation(fsys, dir, slug, loc)
		if err != nil {
			return l, err
		}
		if t != nil {
			if l.Translations == nil {
				l.Translations = map[string]*LessonText{}
			}
			l.Translations[loc] = t
		}
	}
	return l, nil
}

// loadCatalog reads the content tree from fsys (rooted at the content directory)
// and checks that its pieces fit together.
func loadCatalog(fsys fs.FS) (*Catalog, error) {
	cat := &Catalog{}
	pathFiles, err := fs.Glob(fsys, "paths/*.yaml")
	if err != nil {
		return nil, err
	}
	for _, f := range pathFiles {
		var p Path
		if err := readYAML(fsys, f, &p); err != nil {
			return nil, err
		}
		cat.Paths = append(cat.Paths, p)
	}
	courseDirs, err := fs.ReadDir(fsys, "courses")
	if err != nil {
		return nil, err
	}
	for _, d := range courseDirs {
		if !d.IsDir() {
			continue
		}
		dir := path.Join("courses", d.Name())
		var c Course
		if err := readYAML(fsys, path.Join(dir, "course.yaml"), &c); err != nil {
			return nil, err
		}
		if c.Slug != d.Name() {
			return nil, fmt.Errorf("%s/course.yaml: slug %q does not match its folder", dir, c.Slug)
		}
		placed := map[string]string{}
		for _, m := range c.Modules {
			for _, ls := range m.Lessons {
				if prev, dup := placed[ls]; dup {
					return nil, fmt.Errorf("course %s: lesson %q is in both module %q and %q", c.Slug, ls, prev, m.Slug)
				}
				placed[ls] = m.Slug
				l, err := loadLesson(fsys, path.Join(dir, ls), ls)
				if err != nil {
					return nil, err
				}
				l.Module = m.Slug
				l.Position = len(c.Lessons) + 1
				c.Lessons = append(c.Lessons, l)
			}
		}
		entries, err := fs.ReadDir(fsys, dir)
		if err != nil {
			return nil, err
		}
		for _, e := range entries {
			if e.IsDir() && placed[e.Name()] == "" {
				return nil, fmt.Errorf("course %s: lesson folder %q is not listed in any module", c.Slug, e.Name())
			}
		}
		cat.Courses = append(cat.Courses, c)
	}
	sort.SliceStable(cat.Paths, func(i, j int) bool { return cat.Paths[i].Position < cat.Paths[j].Position })
	sort.SliceStable(cat.Courses, func(i, j int) bool { return cat.Courses[i].Position < cat.Courses[j].Position })
	return cat, cat.validate()
}

func knownLocale(l string) bool {
	for _, k := range Locales {
		if k == l {
			return true
		}
	}
	return false
}

func checkTexts(what string, tr map[string]Text) error {
	for loc, t := range tr {
		if !knownLocale(loc) {
			return fmt.Errorf("%s: unknown locale %q (known: %v)", what, loc, Locales)
		}
		if strings.TrimSpace(t.Title) == "" {
			return fmt.Errorf("%s: %s translation needs a title", what, loc)
		}
	}
	return nil
}

func (c *Catalog) validate() error {
	paths := map[string]bool{}
	for _, p := range c.Paths {
		if p.Slug == "" || paths[p.Slug] {
			return fmt.Errorf("bad or duplicate path slug %q", p.Slug)
		}
		paths[p.Slug] = true
		if err := checkTexts("path "+p.Slug, p.Translations); err != nil {
			return err
		}
	}
	for _, p := range c.Paths {
		for _, r := range p.Requires {
			if !paths[r] {
				return fmt.Errorf("path %s requires unknown path %q", p.Slug, r)
			}
		}
	}
	if err := checkAcyclic(c.Paths); err != nil {
		return err
	}
	seen := map[string]bool{}
	for _, co := range c.Courses {
		if seen[co.Slug] {
			return fmt.Errorf("duplicate course slug %q", co.Slug)
		}
		seen[co.Slug] = true
		if !paths[co.Path] {
			return fmt.Errorf("course %s is in unknown path %q", co.Slug, co.Path)
		}
		if len(co.Lessons) == 0 {
			return fmt.Errorf("course %s has no lessons", co.Slug)
		}
		if err := checkTexts("course "+co.Slug, co.Translations); err != nil {
			return err
		}
		mods := map[string]bool{}
		for _, m := range co.Modules {
			if m.Slug == "" || mods[m.Slug] {
				return fmt.Errorf("course %s: bad or duplicate module slug %q", co.Slug, m.Slug)
			}
			mods[m.Slug] = true
			if err := checkTexts("module "+co.Slug+"/"+m.Slug, m.Translations); err != nil {
				return err
			}
		}
	}
	return nil
}

// checkAcyclic rejects prerequisite cycles between paths.
func checkAcyclic(paths []Path) error {
	deps := map[string][]string{}
	for _, p := range paths {
		deps[p.Slug] = p.Requires
	}
	state := map[string]int{} // 1 visiting, 2 done
	var visit func(string) error
	visit = func(s string) error {
		switch state[s] {
		case 1:
			return fmt.Errorf("prerequisite cycle through path %q", s)
		case 2:
			return nil
		}
		state[s] = 1
		for _, d := range deps[s] {
			if err := visit(d); err != nil {
				return err
			}
		}
		state[s] = 2
		return nil
	}
	for s := range deps {
		if err := visit(s); err != nil {
			return err
		}
	}
	return nil
}
