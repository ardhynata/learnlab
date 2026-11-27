// Command web serves the Learnlab frontend (hand-written, embedded) and
// reverse-proxies /api/* to the Hexago-generated API, so the browser sees
// one origin. Nothing here is generated; it lives in its own binary because
// the generated cmd/app has no seam for static files.
package main

import (
	"bytes"
	"compress/gzip"
	"crypto/sha256"
	"embed"
	"encoding/hex"
	"io"
	"io/fs"
	"log"
	"mime"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"path"
	"strconv"
	"strings"
	"sync"
	"time"
)

//go:embed static
var staticFS embed.FS

func env(k, d string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return d
}

// publicAPICall reports whether a request may reach the API through this
// public server. The generated REST API has no authentication, so the web
// server is the gate: reading is open, and the only writes are the two the
// frontend makes (create a learner; create or update that learner's progress).
// Creating, changing or deleting courses and lessons goes through the seeder,
// which talks to the API directly on the private network.
func publicAPICall(method, p string) bool {
	switch method {
	case http.MethodGet, http.MethodHead:
		return true
	case http.MethodPost:
		return p == "/learners" || p == "/progresses"
	case http.MethodPut:
		id, ok := strings.CutPrefix(p, "/progresses/")
		return ok && id != "" && !strings.Contains(id, "/")
	}
	return false
}

// newHandler serves the static files and proxies /api/* to the API. Text
// responses (JSON, JS, CSS, HTML, CSV, SVG) are gzip-compressed for clients
// that accept it, from both sides, and carry validators so a warm reload
// revalidates (304) instead of re-downloading.
func newHandler(api *url.URL, static fs.FS) http.Handler {
	proxy := httputil.NewSingleHostReverseProxy(api)
	director := proxy.Director
	proxy.Director = func(r *http.Request) {
		r.URL.Path = strings.TrimPrefix(r.URL.Path, "/api")
		if r.URL.Path == "" {
			r.URL.Path = "/"
		}
		director(r)
		r.Host = api.Host
		// The API answers in plain text and this server compresses once, on
		// the way out; asking for identity also stops the transport from
		// negotiating (and undoing) its own gzip hop.
		r.Header.Set("Accept-Encoding", "identity")
	}
	files := http.FileServer(http.FS(static))
	tags := &embeddedTags{fsys: static}
	mux := http.NewServeMux()
	mux.Handle("/api/", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !publicAPICall(r.Method, strings.TrimPrefix(r.URL.Path, "/api")) {
			w.Header().Set("Content-Type", "application/json")
			w.Header().Set("Allow", "GET, HEAD")
			w.WriteHeader(http.StatusMethodNotAllowed)
			_, _ = io.WriteString(w, `{"error":"this endpoint is read-only on the public site"}`)
			return
		}
		ew := newETagWriter(w, r)
		proxy.ServeHTTP(ew, r)
		ew.finish()
	}))
	mux.Handle("/", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		// Unfingerprinted assets: always revalidate. Files from disk answer
		// with Last-Modified; embedded files (no mod time) get a content ETag.
		w.Header().Set("Cache-Control", "no-cache")
		if tag := tags.etag(r.URL.Path); tag != "" {
			w.Header().Set("ETag", tag)
		}
		files.ServeHTTP(w, r)
	}))
	return gzipMiddleware(mux)
}

// embeddedTags computes stable strong ETags for files whose mod time is zero
// (embed.FS). Disk files have a real mod time and are left to Last-Modified,
// so STATIC_DIR development edits are never masked by a cached tag.
type embeddedTags struct {
	fsys  fs.FS
	cache sync.Map // "name\x00size" -> ETag
}

func (t *embeddedTags) etag(urlPath string) string {
	if strings.HasSuffix(urlPath, "/index.html") {
		return "" // FileServer redirects this form to the directory
	}
	name := path.Clean("/" + urlPath)
	if strings.HasSuffix(urlPath, "/") {
		name = path.Join(name, "index.html")
	}
	name = strings.TrimPrefix(name, "/")
	info, err := fs.Stat(t.fsys, name)
	if err != nil || info.IsDir() || !info.ModTime().IsZero() {
		return ""
	}
	key := name + "\x00" + strconv.FormatInt(info.Size(), 10)
	if v, ok := t.cache.Load(key); ok {
		return v.(string)
	}
	data, err := fs.ReadFile(t.fsys, name)
	if err != nil {
		return ""
	}
	sum := sha256.Sum256(data)
	tag := `"` + hex.EncodeToString(sum[:12]) + `"`
	t.cache.Store(key, tag)
	return tag
}

const (
	// gzipMinSize: below this a gzip stream costs more than it saves.
	gzipMinSize = 256
	// etagMaxBody bounds how much of an API response is buffered to hash it.
	etagMaxBody = 8 << 20
)

// compressibleType reports whether a Content-Type is worth gzipping: text,
// JSON, JavaScript, XML and SVG. Images, fonts and archives are already
// compressed; event streams must flush as they go.
func compressibleType(ct string) bool {
	mt, _, err := mime.ParseMediaType(ct)
	if err != nil {
		return false
	}
	switch {
	case mt == "text/event-stream":
		return false
	case strings.HasPrefix(mt, "text/"):
		return true
	case mt == "application/json", mt == "application/javascript", mt == "application/xml",
		mt == "image/svg+xml", strings.HasSuffix(mt, "+json"), strings.HasSuffix(mt, "+xml"):
		return true
	}
	return false
}

// acceptsGzip parses Accept-Encoding, honoring q=0 and the "*" wildcard.
func acceptsGzip(h http.Header) bool {
	gzipQ, starQ := -1.0, -1.0 // -1: not mentioned
	for _, part := range strings.Split(strings.Join(h.Values("Accept-Encoding"), ","), ",") {
		name, params, _ := strings.Cut(strings.TrimSpace(part), ";")
		name = strings.ToLower(strings.TrimSpace(name))
		q := 1.0
		if _, v, found := strings.Cut(strings.ToLower(params), "q="); found {
			if f, err := strconv.ParseFloat(strings.TrimSpace(v), 64); err == nil {
				q = f
			}
		}
		switch name {
		case "gzip", "x-gzip":
			gzipQ = q
		case "*":
			starQ = q
		}
	}
	if gzipQ >= 0 {
		return gzipQ > 0
	}
	return starQ > 0
}

var gzipPool = sync.Pool{New: func() any { return gzip.NewWriter(io.Discard) }}

// gzipMiddleware compresses compressible responses for gzip-accepting clients.
func gzipMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gw := &gzipWriter{ResponseWriter: w, canGzip: acceptsGzip(r.Header) && r.Header.Get("Range") == "" && r.Method != http.MethodHead}
		defer gw.close()
		next.ServeHTTP(gw, r)
	})
}

type gzipWriter struct {
	http.ResponseWriter
	canGzip     bool
	wroteHeader bool
	gz          *gzip.Writer
}

func (g *gzipWriter) WriteHeader(code int) {
	if g.wroteHeader {
		return
	}
	// Informational responses (e.g. 103 Early Hints) are not the final header.
	if code >= 100 && code < 200 && code != http.StatusSwitchingProtocols {
		g.ResponseWriter.WriteHeader(code)
		return
	}
	g.wroteHeader = true
	h := g.Header()
	if compressibleType(h.Get("Content-Type")) && h.Get("Content-Encoding") == "" {
		addVary(h, "Accept-Encoding")
		small := false
		if cl, err := strconv.ParseInt(h.Get("Content-Length"), 10, 64); err == nil && cl < gzipMinSize {
			small = true
		}
		if g.canGzip && !small && code != http.StatusNoContent && code != http.StatusNotModified &&
			code != http.StatusPartialContent && code != http.StatusSwitchingProtocols {
			h.Set("Content-Encoding", "gzip")
			h.Del("Content-Length")
			// The body differs from the identity one, so a strong validator
			// would be a lie; the weak form still matches If-None-Match.
			if tag := h.Get("ETag"); tag != "" && !strings.HasPrefix(tag, "W/") {
				h.Set("ETag", "W/"+tag)
			}
			gz := gzipPool.Get().(*gzip.Writer)
			gz.Reset(g.ResponseWriter)
			g.gz = gz
		}
	}
	g.ResponseWriter.WriteHeader(code)
}

func (g *gzipWriter) Write(b []byte) (int, error) {
	if !g.wroteHeader {
		g.WriteHeader(http.StatusOK)
	}
	if g.gz != nil {
		return g.gz.Write(b)
	}
	return g.ResponseWriter.Write(b)
}

// Flush pushes buffered bytes to the client (streaming responses).
func (g *gzipWriter) Flush() {
	if g.gz != nil {
		_ = g.gz.Flush()
	}
	if f, ok := g.ResponseWriter.(http.Flusher); ok {
		f.Flush()
	}
}

func (g *gzipWriter) close() {
	if g.gz != nil {
		_ = g.gz.Close()
		gzipPool.Put(g.gz)
		g.gz = nil
	}
}

func addVary(h http.Header, v string) {
	for _, have := range h.Values("Vary") {
		for _, p := range strings.Split(have, ",") {
			if t := strings.TrimSpace(p); t == "*" || strings.EqualFold(t, v) {
				return
			}
		}
	}
	h.Add("Vary", v)
}

// etagWriter gives proxied JSON GET responses a content ETag and answers
// If-None-Match with 304, so a warm reload does not re-download the catalog.
// It buffers only plain 200 JSON bodies up to etagMaxBody; everything else
// (other types, other statuses, anything already tagged or encoded, larger or
// streaming bodies) passes straight through.
type etagWriter struct {
	http.ResponseWriter
	req         *http.Request
	mode        int // 0 undecided, 1 buffering, 2 pass-through, 3 finished
	code        int
	buf         bytes.Buffer
	wroteHeader bool
}

func newETagWriter(w http.ResponseWriter, r *http.Request) *etagWriter {
	return &etagWriter{ResponseWriter: w, req: r}
}

func (e *etagWriter) WriteHeader(code int) {
	if e.wroteHeader {
		return
	}
	if code >= 100 && code < 200 && code != http.StatusSwitchingProtocols {
		e.ResponseWriter.WriteHeader(code)
		return
	}
	e.wroteHeader = true
	e.code = code
	h := e.Header()
	cl, err := strconv.ParseInt(h.Get("Content-Length"), 10, 64)
	eligible := (e.req.Method == http.MethodGet) && code == http.StatusOK &&
		h.Get("ETag") == "" && h.Get("Content-Encoding") == "" && h.Get("Content-Range") == "" &&
		isJSON(h.Get("Content-Type")) && (err != nil || cl <= etagMaxBody)
	if eligible {
		e.mode = 1
		return
	}
	e.mode = 2
	e.ResponseWriter.WriteHeader(code)
}

func isJSON(ct string) bool {
	mt, _, err := mime.ParseMediaType(ct)
	return err == nil && (mt == "application/json" || strings.HasSuffix(mt, "+json"))
}

func (e *etagWriter) Write(b []byte) (int, error) {
	if !e.wroteHeader {
		e.WriteHeader(http.StatusOK)
	}
	if e.mode == 1 {
		if e.buf.Len()+len(b) <= etagMaxBody {
			return e.buf.Write(b)
		}
		// Too large to hash: release what is buffered and stream the rest.
		e.mode = 2
		e.ResponseWriter.WriteHeader(e.code)
		if _, err := e.ResponseWriter.Write(e.buf.Bytes()); err != nil {
			return 0, err
		}
		e.buf.Reset()
	}
	return e.ResponseWriter.Write(b)
}

func (e *etagWriter) Flush() {
	if e.mode == 1 {
		return // JSON bodies are sent whole, with a validator, on finish
	}
	if f, ok := e.ResponseWriter.(http.Flusher); ok {
		f.Flush()
	}
}

// finish emits a buffered body with its ETag; a no-op in other modes.
func (e *etagWriter) finish() {
	if e.mode != 1 {
		return
	}
	e.mode = 3
	sum := sha256.Sum256(e.buf.Bytes())
	tag := `"` + hex.EncodeToString(sum[:12]) + `"`
	h := e.Header()
	h.Set("ETag", tag)
	if h.Get("Cache-Control") == "" {
		h.Set("Cache-Control", "no-cache")
	}
	if inm := e.req.Header.Get("If-None-Match"); inm != "" && noneMatchHits(inm, tag) {
		h.Del("Content-Type")
		h.Del("Content-Length")
		e.ResponseWriter.WriteHeader(http.StatusNotModified)
		return
	}
	h.Set("Content-Length", strconv.Itoa(e.buf.Len()))
	e.ResponseWriter.WriteHeader(e.code)
	_, _ = e.ResponseWriter.Write(e.buf.Bytes())
}

// noneMatchHits implements the weak comparison If-None-Match requires, so the
// W/-prefixed tag the gzip layer hands out still matches the identity tag.
func noneMatchHits(header, tag string) bool {
	for _, c := range strings.Split(header, ",") {
		c = strings.TrimSpace(c)
		if c == "*" || strings.TrimPrefix(c, "W/") == tag {
			return true
		}
	}
	return false
}

func main() {
	api, err := url.Parse(env("API_URL", "http://127.0.0.1:8080"))
	if err != nil {
		log.Fatal(err)
	}
	// STATIC_DIR serves the files from disk instead of the embedded copy, so a
	// frontend edit shows up on reload without rebuilding the binary (development only).
	var sub fs.FS = os.DirFS(os.Getenv("STATIC_DIR"))
	if os.Getenv("STATIC_DIR") == "" {
		embedded, err := fs.Sub(staticFS, "static")
		if err != nil {
			log.Fatal(err)
		}
		sub = embedded
	}
	addr := env("WEB_ADDR", ":3100")
	srv := &http.Server{Addr: addr, Handler: newHandler(api, sub), ReadHeaderTimeout: 10 * time.Second}
	log.Printf("learnlab web listening on %s, api %s", addr, api)
	log.Fatal(srv.ListenAndServe())
}
