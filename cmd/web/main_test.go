package main

import (
	"compress/gzip"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strconv"
	"strings"
	"testing"
	"testing/fstest"
	"time"
)

func TestHandlerServesStaticAndProxiesAPI(t *testing.T) {
	api := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = io.WriteString(w, "api:"+r.URL.Path)
	}))
	defer api.Close()
	u, _ := url.Parse(api.URL)
	h := newHandler(u, fstest.MapFS{"index.html": {Data: []byte("home")}, "app.js": {Data: []byte("x")}})

	get := func(p string) (int, string, http.Header) {
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, httptest.NewRequest("GET", p, nil))
		b, _ := io.ReadAll(rec.Body)
		return rec.Code, string(b), rec.Header()
	}
	if c, b, _ := get("/"); c != 200 || b != "home" {
		t.Fatalf("index: %d %q", c, b)
	}
	if c, b, hd := get("/app.js"); c != 200 || b != "x" || hd.Get("X-Content-Type-Options") != "nosniff" {
		t.Fatalf("asset: %d %q %v", c, b, hd)
	}
	if c, b, _ := get("/api/courses"); c != 200 || b != "api:/courses" {
		t.Fatalf("proxy must strip /api: %d %q", c, b)
	}
	if c, _, _ := get("/missing.js"); c != 404 {
		t.Fatalf("missing: %d", c)
	}
}

func bigJSON() string {
	return `{"items":[` + strings.Repeat(`{"id":"lesson","title":"Hello world, a compressible sentence"},`, 200) + `{}]}`
}

// testServer wires newHandler to a fake API and a small static tree.
func testServer(t *testing.T, apiHandler http.HandlerFunc, files fstest.MapFS) http.Handler {
	t.Helper()
	api := httptest.NewServer(apiHandler)
	t.Cleanup(api.Close)
	u, _ := url.Parse(api.URL)
	return newHandler(u, files)
}

func do(h http.Handler, method, p string, hdr map[string]string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, p, nil)
	for k, v := range hdr {
		req.Header.Set(k, v)
	}
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

func gunzip(t *testing.T, rec *httptest.ResponseRecorder) string {
	t.Helper()
	zr, err := gzip.NewReader(rec.Body)
	if err != nil {
		t.Fatalf("not gzip: %v", err)
	}
	b, err := io.ReadAll(zr)
	if err != nil {
		t.Fatal(err)
	}
	return string(b)
}

func TestGzipStaticTextAndVary(t *testing.T) {
	js := strings.Repeat("export const x = 1;\n", 100)
	h := testServer(t, func(http.ResponseWriter, *http.Request) {}, fstest.MapFS{
		"app.js":     {Data: []byte(js)},
		"style.css":  {Data: []byte(strings.Repeat("a{b:c}\n", 100))},
		"fig.svg":    {Data: []byte("<svg>" + strings.Repeat(" ", 400) + "</svg>")},
		"data.csv":   {Data: []byte(strings.Repeat("a,b\n", 200))},
		"logo.png":   {Data: []byte(strings.Repeat("x", 1000))},
		"tiny.js":    {Data: []byte("x")},
		"index.html": {Data: []byte("<html>" + strings.Repeat("hi ", 200) + "</html>")},
	})
	gz := map[string]string{"Accept-Encoding": "gzip, deflate, br"}

	rec := do(h, "GET", "/app.js", gz)
	if rec.Header().Get("Content-Encoding") != "gzip" || gunzip(t, rec) != js {
		t.Fatalf("app.js not gzipped: %v", rec.Header())
	}
	if rec.Header().Get("Vary") != "Accept-Encoding" || rec.Header().Get("Content-Length") != "" {
		t.Fatalf("vary/length: %v", rec.Header())
	}
	for _, p := range []string{"/style.css", "/fig.svg", "/data.csv", "/"} {
		if rec := do(h, "GET", p, gz); rec.Header().Get("Content-Encoding") != "gzip" {
			t.Errorf("%s not gzipped: %v", p, rec.Header())
		}
	}
	// Already-compressed types and tiny files stay identity.
	for _, p := range []string{"/logo.png", "/tiny.js"} {
		if rec := do(h, "GET", p, gz); rec.Header().Get("Content-Encoding") != "" {
			t.Errorf("%s must not be gzipped: %v", p, rec.Header())
		}
	}
	// Clients that do not ask get identity bytes, still with Vary.
	rec = do(h, "GET", "/app.js", nil)
	if rec.Header().Get("Content-Encoding") != "" || rec.Body.String() != js || rec.Header().Get("Vary") != "Accept-Encoding" {
		t.Fatalf("identity: %v", rec.Header())
	}
	for _, ae := range []string{"gzip;q=0", "br", "identity", "*;q=0", "gzip;q=0, *"} {
		if rec := do(h, "GET", "/app.js", map[string]string{"Accept-Encoding": ae}); rec.Header().Get("Content-Encoding") != "" {
			t.Errorf("Accept-Encoding %q must not gzip", ae)
		}
	}
	if rec := do(h, "GET", "/app.js", map[string]string{"Accept-Encoding": "*"}); rec.Header().Get("Content-Encoding") != "gzip" {
		t.Error("wildcard should gzip")
	}
	// Range requests and HEAD are left alone.
	rec = do(h, "GET", "/app.js", map[string]string{"Accept-Encoding": "gzip", "Range": "bytes=0-9"})
	if rec.Code != 206 || rec.Header().Get("Content-Encoding") != "" || rec.Body.String() != js[:10] {
		t.Fatalf("range: %d %v", rec.Code, rec.Header())
	}
	if rec := do(h, "HEAD", "/app.js", gz); rec.Header().Get("Content-Encoding") != "" {
		t.Fatalf("head: %v", rec.Header())
	}
}

func TestEmbeddedFilesGetStableETagAndRevalidate(t *testing.T) {
	files := fstest.MapFS{"app.js": {Data: []byte(strings.Repeat("let a;\n", 100))}, "index.html": {Data: []byte("home")}}
	h := testServer(t, func(http.ResponseWriter, *http.Request) {}, files)
	first := do(h, "GET", "/app.js", nil)
	tag := first.Header().Get("ETag")
	if tag == "" || strings.HasPrefix(tag, "W/") {
		t.Fatalf("want strong ETag, got %q", tag)
	}
	if tag != do(h, "GET", "/app.js", nil).Header().Get("ETag") {
		t.Fatal("ETag must be stable")
	}
	if first.Header().Get("Cache-Control") != "no-cache" {
		t.Fatalf("cache-control: %v", first.Header())
	}
	for _, inm := range []string{tag, "W/" + tag} {
		rec := do(h, "GET", "/app.js", map[string]string{"If-None-Match": inm, "Accept-Encoding": "gzip"})
		if rec.Code != 304 || rec.Body.Len() != 0 {
			t.Fatalf("If-None-Match %q: %d", inm, rec.Code)
		}
	}
	// The gzip variant carries a weak tag, and a changed file a new tag.
	if w := do(h, "GET", "/app.js", map[string]string{"Accept-Encoding": "gzip"}).Header().Get("ETag"); w != "W/"+tag {
		t.Fatalf("gzip ETag %q", w)
	}
	files["app.js"] = &fstest.MapFile{Data: []byte(strings.Repeat("let b;\n", 120))}
	if do(h, "GET", "/app.js", nil).Header().Get("ETag") == tag {
		t.Fatal("changed content must change the ETag")
	}
	if rec := do(h, "GET", "/", nil); rec.Header().Get("ETag") == "" || rec.Code != 200 {
		t.Fatalf("index: %d %v", rec.Code, rec.Header())
	}
	if rec := do(h, "GET", "/missing.js", nil); rec.Code != 404 || rec.Header().Get("ETag") != "" {
		t.Fatalf("missing: %d %v", rec.Code, rec.Header())
	}
}

func TestFilesWithModTimeRevalidateByLastModified(t *testing.T) {
	mod := time.Date(2026, 1, 2, 3, 4, 5, 0, time.UTC)
	h := testServer(t, func(http.ResponseWriter, *http.Request) {}, fstest.MapFS{"a.js": {Data: []byte("x"), ModTime: mod}})
	rec := do(h, "GET", "/a.js", nil)
	if rec.Header().Get("Last-Modified") == "" || rec.Header().Get("ETag") != "" {
		t.Fatalf("disk-like file: %v", rec.Header())
	}
	rec = do(h, "GET", "/a.js", map[string]string{"If-Modified-Since": mod.Format(http.TimeFormat)})
	if rec.Code != 304 {
		t.Fatalf("If-Modified-Since: %d", rec.Code)
	}
}

func TestProxyJSONIsGzippedTaggedAndRevalidates(t *testing.T) {
	body := bigJSON()
	var gotAE string
	h := testServer(t, func(w http.ResponseWriter, r *http.Request) {
		gotAE = r.Header.Get("Accept-Encoding")
		w.Header().Set("Content-Type", "application/json")
		_, _ = io.WriteString(w, body)
	}, fstest.MapFS{})
	rec := do(h, "GET", "/api/lessons", map[string]string{"Accept-Encoding": "gzip"})
	if rec.Header().Get("Content-Encoding") != "gzip" || gunzip(t, rec) != body {
		t.Fatalf("api not gzipped: %v", rec.Header())
	}
	if rec.Body.Len() >= len(body)/4 {
		t.Fatalf("compression ineffective: %d of %d", rec.Body.Len(), len(body))
	}
	if gotAE != "identity" {
		t.Fatalf("backend should be asked for identity, got %q", gotAE)
	}
	tag := rec.Header().Get("ETag")
	if !strings.HasPrefix(tag, `W/"`) || rec.Header().Get("Vary") != "Accept-Encoding" || rec.Header().Get("Cache-Control") != "no-cache" {
		t.Fatalf("headers: %v", rec.Header())
	}
	rec = do(h, "GET", "/api/lessons", map[string]string{"Accept-Encoding": "gzip", "If-None-Match": tag})
	if rec.Code != 304 || rec.Body.Len() != 0 {
		t.Fatalf("revalidate: %d %d", rec.Code, rec.Body.Len())
	}
	// Identity client: same body, strong tag, correct length.
	rec = do(h, "GET", "/api/lessons", nil)
	if rec.Body.String() != body || rec.Header().Get("Content-Length") != strconv.Itoa(len(body)) || rec.Header().Get("ETag") != strings.TrimPrefix(tag, "W/") {
		t.Fatalf("identity: %v", rec.Header())
	}
	if rec = do(h, "GET", "/api/lessons", map[string]string{"If-None-Match": rec.Header().Get("ETag")}); rec.Code != 304 {
		t.Fatalf("identity revalidate: %d", rec.Code)
	}
}

func TestProxyLeavesOtherResponsesAlone(t *testing.T) {
	h := testServer(t, func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/encoded":
			w.Header().Set("Content-Type", "application/json")
			w.Header().Set("Content-Encoding", "br")
			_, _ = io.WriteString(w, bigJSON())
		case "/tagged":
			w.Header().Set("Content-Type", "application/json")
			w.Header().Set("ETag", `"mine"`)
			_, _ = io.WriteString(w, bigJSON())
		case "/img":
			w.Header().Set("Content-Type", "image/png")
			_, _ = io.WriteString(w, strings.Repeat("p", 1000))
		case "/err":
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			_, _ = io.WriteString(w, `{"error":"`+strings.Repeat("bad ", 100)+`"}`)
		case "/empty":
			w.WriteHeader(http.StatusNoContent)
		default:
			w.Header().Set("Content-Type", "application/json")
			_, _ = io.WriteString(w, `{"ok":true}`)
		}
	}, fstest.MapFS{})
	gz := map[string]string{"Accept-Encoding": "gzip"}

	if rec := do(h, "GET", "/api/encoded", gz); rec.Header().Get("Content-Encoding") != "br" || rec.Header().Get("ETag") != "" {
		t.Errorf("already-encoded must pass through: %v", rec.Header())
	}
	if rec := do(h, "GET", "/api/tagged", gz); rec.Header().Get("ETag") != `W/"mine"` || rec.Header().Get("Content-Encoding") != "gzip" {
		t.Errorf("backend ETag kept (weakened when compressed): %v", rec.Header())
	}
	if rec := do(h, "GET", "/api/img", gz); rec.Header().Get("Content-Encoding") != "" || rec.Header().Get("ETag") != "" {
		t.Errorf("png: %v", rec.Header())
	}
	if rec := do(h, "GET", "/api/err", gz); rec.Code != 400 || rec.Header().Get("ETag") != "" || rec.Header().Get("Content-Encoding") != "gzip" {
		t.Errorf("error body: %d %v", rec.Code, rec.Header())
	}
	if rec := do(h, "GET", "/api/empty", gz); rec.Code != 204 || rec.Header().Get("Content-Encoding") != "" {
		t.Errorf("204: %d %v", rec.Code, rec.Header())
	}
	// Small JSON: tagged but not compressed.
	if rec := do(h, "GET", "/api/small", gz); rec.Header().Get("Content-Encoding") != "" || rec.Header().Get("ETag") == "" || rec.Body.String() != `{"ok":true}` {
		t.Errorf("small: %v", rec.Header())
	}
	// Writes are never buffered or tagged.
	if rec := do(h, "POST", "/api/small", gz); rec.Header().Get("ETag") != "" || rec.Body.String() != `{"ok":true}` {
		t.Errorf("post: %v", rec.Header())
	}
}

func TestProxyStreamsOversizedAndEventStreams(t *testing.T) {
	big := strings.Repeat("a", etagMaxBody+10)
	h := testServer(t, func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/sse" {
			w.Header().Set("Content-Type", "text/event-stream")
			_, _ = io.WriteString(w, "data: 1\n\n")
			w.(http.Flusher).Flush()
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = io.WriteString(w, big[:1<<20])
		w.(http.Flusher).Flush() // unknown length: chunked
		_, _ = io.WriteString(w, big[1<<20:])
	}, fstest.MapFS{})
	rec := do(h, "GET", "/api/big", map[string]string{"Accept-Encoding": "gzip"})
	if rec.Header().Get("ETag") != "" || gunzip(t, rec) != big {
		t.Fatalf("oversized body must stream untagged and intact: %v", rec.Header())
	}
	rec = do(h, "GET", "/api/sse", map[string]string{"Accept-Encoding": "gzip"})
	if rec.Header().Get("Content-Encoding") != "" || rec.Body.String() != "data: 1\n\n" {
		t.Fatalf("event stream: %v", rec.Header())
	}
}
