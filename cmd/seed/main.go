// Command seed loads the content catalog (paths, courses, modules, lessons and
// quiz questions) into a running Learnlab API. It speaks only the public REST
// API, so it never touches generated code, and it is idempotent: every row is
// matched by slug (questions by prompt) and updated in place. Rows that are no
// longer in the content tree are removed, children before parents.
package main

import (
	"bytes"
	"embed"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"io/fs"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

//go:embed all:content
var contentFS embed.FS

type client struct {
	base string
	http *http.Client
}

func (c *client) do(method, path string, in, out any) error {
	var body io.Reader
	if in != nil {
		b, err := json.Marshal(in)
		if err != nil {
			return err
		}
		body = bytes.NewReader(b)
	}
	req, err := http.NewRequest(method, c.base+path, body)
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.http.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	data, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 300 {
		return fmt.Errorf("%s %s: %d %s", method, path, resp.StatusCode, strings.TrimSpace(string(data)))
	}
	if out != nil {
		return json.Unmarshal(data, out)
	}
	return nil
}

type row struct {
	ID       string `json:"id"`
	Slug     string `json:"slug"`
	Prompt   string `json:"prompt"`
	Locale   string `json:"locale"`
	Position int    `json:"position"`
}

func byLocale(locale string) func(row) bool { return func(r row) bool { return r.Locale == locale } }

// list reads a collection. Plain lists return a bare array, while the
// by-<ref> lists wrap it as {"data": [...], "total": n}; accept both.
func (c *client) list(path string) ([]row, error) {
	var raw json.RawMessage
	if err := c.do("GET", path, nil, &raw); err != nil {
		return nil, err
	}
	var rows []row
	if err := json.Unmarshal(raw, &rows); err == nil {
		return rows, nil
	}
	var env struct {
		Data []row `json:"data"`
	}
	if err := json.Unmarshal(raw, &env); err != nil {
		return nil, fmt.Errorf("%s: unexpected list shape: %w", path, err)
	}
	return env.Data, nil
}

// upsert creates the row, or updates it in place when match finds an existing one.
func (c *client) upsert(resource string, existing []row, match func(row) bool, payload map[string]any, label string) (string, error) {
	for _, r := range existing {
		if match(r) {
			return r.ID, c.do("PUT", "/"+resource+"/"+r.ID, payload, nil)
		}
	}
	var made row
	if err := c.do("POST", "/"+resource, payload, &made); err != nil {
		return "", err
	}
	log.Printf("%s created: %s", strings.TrimSuffix(resource, "s"), label)
	return made.ID, nil
}

func bySlug(slug string) func(row) bool { return func(r row) bool { return r.Slug == slug } }

// prune deletes the rows whose key is not in keep.
func (c *client) prune(resource string, have []row, keep map[string]bool, key func(row) string) error {
	for _, r := range have {
		if !keep[key(r)] {
			if err := c.do("DELETE", "/"+resource+"/"+r.ID, nil, nil); err != nil {
				return err
			}
			log.Printf("%s removed: %s", strings.TrimSuffix(resource, "s"), key(r))
		}
	}
	return nil
}

func (c *client) seed(cat *Catalog) error {
	// Paths.
	havePaths, err := c.list("/paths?limit=1000")
	if err != nil {
		return err
	}
	pathID := map[string]string{}
	keepPaths := map[string]bool{}
	for _, p := range cat.Paths {
		requires := p.Requires
		if requires == nil {
			requires = []string{}
		}
		id, err := c.upsert("paths", havePaths, bySlug(p.Slug), map[string]any{"slug": p.Slug, "title": p.Title, "summary": p.Summary, "level": p.Level, "position": p.Position, "requires": requires}, p.Slug)
		if err != nil {
			return err
		}
		pathID[p.Slug] = id
		keepPaths[p.Slug] = true
		if err := c.seedTexts("path-texts", "path_id", id, "/path-texts/by-path/", p.Translations); err != nil {
			return err
		}
	}

	// Courses, with their modules and lessons.
	haveCourses, err := c.list("/courses?limit=1000")
	if err != nil {
		return err
	}
	keepCourses := map[string]bool{}
	for _, co := range cat.Courses {
		id, err := c.upsert("courses", haveCourses, bySlug(co.Slug), map[string]any{"path_id": pathID[co.Path], "slug": co.Slug, "title": co.Title, "summary": co.Summary, "topic": co.Topic, "level": co.Level, "position": co.Position}, co.Slug)
		if err != nil {
			return err
		}
		keepCourses[co.Slug] = true
		if err := c.seedTexts("course-texts", "course_id", id, "/course-texts/by-course/", co.Translations); err != nil {
			return err
		}
		if err := c.seedCourse(id, co); err != nil {
			return err
		}
	}

	// Remove what is no longer authored: courses first (their children go with them),
	// then paths.
	if err := c.prune("courses", haveCourses, keepCourses, func(r row) string { return r.Slug }); err != nil {
		return err
	}
	return c.prune("paths", havePaths, keepPaths, func(r row) string { return r.Slug })
}

func (c *client) seedCourse(courseID string, co Course) error {
	haveMods, err := c.list("/modules/by-course/" + courseID + "?limit=1000")
	if err != nil {
		return err
	}
	moduleID := map[string]string{}
	keepMods := map[string]bool{}
	for i, m := range co.Modules {
		id, err := c.upsert("modules", haveMods, bySlug(m.Slug), map[string]any{"course_id": courseID, "slug": m.Slug, "title": m.Title, "summary": m.Summary, "position": i + 1}, co.Slug+"/"+m.Slug)
		if err != nil {
			return err
		}
		moduleID[m.Slug] = id
		keepMods[m.Slug] = true
		if err := c.seedTexts("module-texts", "module_id", id, "/module-texts/by-module/", m.Translations); err != nil {
			return err
		}
	}

	haveLessons, err := c.list("/lessons/by-course/" + courseID + "?limit=1000")
	if err != nil {
		return err
	}
	keepLessons := map[string]bool{}
	for _, l := range co.Lessons {
		id, err := c.upsert("lessons", haveLessons, bySlug(l.Slug), map[string]any{"course_id": courseID, "module_id": moduleID[l.Module], "slug": l.Slug, "title": l.Title, "position": l.Position, "minutes": l.Minutes, "kind": l.Kind, "simulator": l.Simulator, "body": l.Body}, l.Slug)
		if err != nil {
			return err
		}
		keepLessons[l.Slug] = true
		if err := c.seedQuestions(id, l.Questions); err != nil {
			return err
		}
		if err := c.seedLessonTexts(id, l); err != nil {
			return err
		}
	}
	// Lessons first, then modules: a lesson that moved modules was updated above, so
	// removing its old module cannot take it with it.
	if err := c.prune("lessons", haveLessons, keepLessons, func(r row) string { return r.Slug }); err != nil {
		return err
	}
	return c.prune("modules", haveMods, keepMods, func(r row) string { return r.Slug })
}

// seedTexts upserts the translated title and summary of a path, course or module for
// each locale, and removes locales no longer authored.
func (c *client) seedTexts(resource, parentField, parentID, listPath string, tr map[string]Text) error {
	have, err := c.list(listPath + parentID + "?limit=1000")
	if err != nil {
		return err
	}
	keep := map[string]bool{}
	for _, loc := range Locales {
		t, ok := tr[loc]
		if !ok {
			continue
		}
		keep[loc] = true
		payload := map[string]any{parentField: parentID, "locale": loc, "title": t.Title, "summary": t.Summary}
		if _, err := c.upsert(resource, have, byLocale(loc), payload, resource+" "+loc); err != nil {
			return err
		}
	}
	return c.prune(resource, have, keep, func(r row) string { return r.Locale })
}

// seedLessonTexts upserts a lesson's translated title and body, and its translated
// questions (matched to the base questions by position), per locale.
func (c *client) seedLessonTexts(lessonID string, l Lesson) error {
	have, err := c.list("/lesson-texts/by-lesson/" + lessonID + "?limit=1000")
	if err != nil {
		return err
	}
	haveQ, err := c.list("/question-texts/by-lesson/" + lessonID + "?limit=1000")
	if err != nil {
		return err
	}
	keepLoc := map[string]bool{}
	keepQ := map[string]bool{}
	for _, loc := range Locales {
		t := l.Translations[loc]
		if t == nil {
			continue
		}
		keepLoc[loc] = true
		if _, err := c.upsert("lesson-texts", have, byLocale(loc), map[string]any{"lesson_id": lessonID, "locale": loc, "title": t.Title, "body": t.Body}, "lesson-text "+l.Slug+" "+loc); err != nil {
			return err
		}
		for i, q := range t.Questions {
			key := fmt.Sprintf("%s/%d", loc, i+1)
			keepQ[key] = true
			match := func(r row) bool { return r.Locale == loc && r.Position == i+1 }
			payload := map[string]any{"lesson_id": lessonID, "position": i + 1, "locale": loc, "prompt": q.Prompt, "options": q.Options, "explanation": q.Explanation}
			if _, err := c.upsert("question-texts", haveQ, match, payload, "question-text "+l.Slug+" "+key); err != nil {
				return err
			}
		}
	}
	if err := c.prune("lesson-texts", have, keepLoc, func(r row) string { return r.Locale }); err != nil {
		return err
	}
	return c.prune("question-texts", haveQ, keepQ, func(r row) string { return fmt.Sprintf("%s/%d", r.Locale, r.Position) })
}

func (c *client) seedQuestions(lessonID string, qs []Question) error {
	have, err := c.list("/questions/by-lesson/" + lessonID + "?limit=1000")
	if err != nil {
		return err
	}
	keep := map[string]bool{}
	for i, q := range qs {
		payload := map[string]any{"lesson_id": lessonID, "position": i + 1, "prompt": q.Prompt, "options": q.Options, "answer": q.Answer, "explanation": q.Explanation}
		found := false
		for _, r := range have {
			if r.Prompt == q.Prompt {
				found = true
				if err := c.do("PUT", "/questions/"+r.ID, payload, nil); err != nil {
					return err
				}
			}
		}
		if !found {
			if err := c.do("POST", "/questions", payload, nil); err != nil {
				return err
			}
		}
		keep[q.Prompt] = true
	}
	return c.prune("questions", have, keep, func(r row) string { return r.Prompt })
}

func main() {
	api := flag.String("api", envOr("API_URL", "http://127.0.0.1:8080"), "base URL of the Learnlab API")
	content := flag.String("content", "", "read the content tree from this directory instead of the embedded copy (development)")
	lint := flag.String("lint", "", "check one lesson folder against the authoring rules and exit (for example cmd/seed/content/courses/clustering/kmeans)")
	static := flag.String("static", "cmd/web/static", "frontend directory, used by -lint to find figures and labs")
	flag.Parse()
	if *lint != "" {
		os.Exit(lintOne(*lint, *static))
	}
	var root fs.FS
	if *content != "" {
		root = os.DirFS(*content)
	} else {
		embedded, err := fs.Sub(contentFS, "content")
		if err != nil {
			log.Fatal(err)
		}
		root = embedded
	}
	cat, err := loadCatalog(root)
	if err != nil {
		log.Fatal(err)
	}
	c := &client{base: strings.TrimRight(*api, "/"), http: &http.Client{Timeout: 30 * time.Second}}
	if err := c.seed(cat); err != nil {
		log.Fatal(err)
	}
	lessons := 0
	for _, co := range cat.Courses {
		lessons += len(co.Lessons)
	}
	log.Printf("seeded %d paths, %d courses, %d lessons", len(cat.Paths), len(cat.Courses), lessons)
}

func envOr(k, d string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return d
}

// lintOne checks a single lesson folder and prints what is wrong. Returns the exit code.
func lintOne(dir, static string) int {
	dir = filepath.Clean(dir)
	slug, courseDir := filepath.Base(dir), filepath.Dir(dir)
	l, err := loadLesson(os.DirFS(courseDir), slug, slug)
	if err != nil {
		fmt.Println("cannot read the lesson:", err)
		return 1
	}
	problems := lintLesson(static, filepath.Base(courseDir), l)
	for _, p := range problems {
		fmt.Println("-", p)
	}
	if len(problems) > 0 {
		fmt.Printf("%d problem(s) in %s\n", len(problems), dir)
		return 1
	}
	fmt.Printf("ok: %s (%d quiz questions)\n", dir, len(l.Questions))
	return 0
}
