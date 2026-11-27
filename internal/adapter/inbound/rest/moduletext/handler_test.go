package moduletextrest

import (
	"bytes" // capture slog output for log-safety regression tests (#2784)
	"context"
	"encoding/json" // decode JSON error / envelope response bodies (#1696 item 6, #3359) / options nil-vs-[] (#3234)
	"errors"        // CountBy error degradation test (#2582)
	"io"            // read response bodies for JSON-body assertions (#1696 item 6, #3359)
	"log/slog"      // log-safety regression tests (#2784)
	"net/http"
	"net/http/httptest"
	"net/url" // #3236: path-escape a multi-byte refID for the rune-safe truncation test
	"strings"
	"testing"
	"time"

	"github.com/inxpired/hexago-runtime/httperr"

	inputport "example.com/learnlab/internal/core/ports/input/moduletext"
)

// fakeModuleTextService is a function-field-driven stub of the
// inputport.ModuleTextService interface. Each handler test sets the
// op-specific Fn and leaves the rest at zero — unused branches return
// the zero value (which httperr translates to a 500 if hit), so a test
// hitting the wrong branch would surface as a status mismatch rather
// than silent passing.
type fakeModuleTextService struct {
	CreateFn        func(ctx context.Context, cmd inputport.CreateModuleTextCommand) (*inputport.ModuleTextResponse, error)
	GetByIDFn       func(ctx context.Context, q inputport.GetModuleTextByIDQuery) (*inputport.ModuleTextResponse, error)
	ListFn          func(ctx context.Context, q inputport.ListModuleTextQuery) ([]*inputport.ModuleTextResponse, error)
	ListByModuleFn  func(ctx context.Context, q inputport.ListModuleTextByModuleQuery) ([]*inputport.ModuleTextResponse, error)
	CountByModuleFn func(ctx context.Context, q inputport.ListModuleTextByModuleQuery) (int, error)
	OptionsFn       func(ctx context.Context, q inputport.ModuleTextOptionsQuery) ([]inputport.ModuleTextOption, error)
	UpdateFn        func(ctx context.Context, cmd inputport.UpdateModuleTextCommand) (*inputport.ModuleTextResponse, error)
	DeleteFn        func(ctx context.Context, cmd inputport.DeleteModuleTextCommand) error
}

func (f *fakeModuleTextService) Create(ctx context.Context, cmd inputport.CreateModuleTextCommand) (*inputport.ModuleTextResponse, error) {
	if f.CreateFn == nil {
		return nil, nil
	}
	return f.CreateFn(ctx, cmd)
}
func (f *fakeModuleTextService) GetByID(ctx context.Context, q inputport.GetModuleTextByIDQuery) (*inputport.ModuleTextResponse, error) {
	if f.GetByIDFn == nil {
		return nil, nil
	}
	return f.GetByIDFn(ctx, q)
}
func (f *fakeModuleTextService) List(ctx context.Context, q inputport.ListModuleTextQuery) ([]*inputport.ModuleTextResponse, error) {
	if f.ListFn == nil {
		return nil, nil
	}
	return f.ListFn(ctx, q)
}

// ListByModule pins the auto-emitted ref-listing port method
// (#403 sub-3) on the fake. Body returns nil/nil when the test left
// ListByModuleFn unset — surfaces missing wiring as the handler's
// 500 path rather than a nil-deref. Closes #484.
func (f *fakeModuleTextService) ListByModule(ctx context.Context, q inputport.ListModuleTextByModuleQuery) ([]*inputport.ModuleTextResponse, error) {
	if f.ListByModuleFn == nil {
		return nil, nil
	}
	return f.ListByModuleFn(ctx, q)
}

// CountByModule pins the auto-emitted ref-count port method (#2202) on
// the fake. Returns 0/nil when CountByModuleFn is unset so list tests
// that don't exercise the count path still compile and run cleanly.
func (f *fakeModuleTextService) CountByModule(ctx context.Context, q inputport.ListModuleTextByModuleQuery) (int, error) {
	if f.CountByModuleFn == nil {
		return 0, nil
	}
	return f.CountByModuleFn(ctx, q)
}

// ListByModuleSince pins the auto-emitted keyset-paginated sibling of
// ListByModule on the fake (#4237) — never exercised by these
// REST-transport tests (it backs the derive-rows-reader's gRPC surface
// only), but the method MUST exist or the fake's interface-satisfaction
// assertion fails to compile.
func (f *fakeModuleTextService) ListByModuleSince(ctx context.Context, refID string, afterCreatedAt time.Time, afterID string, limit int) ([]*inputport.ModuleTextResponse, error) {
	return nil, nil
}

// Options pins the auto-emitted `[{id, label}]` port method (#403
// sub-5 / #421). Closes #484.
func (f *fakeModuleTextService) Options(ctx context.Context, q inputport.ModuleTextOptionsQuery) ([]inputport.ModuleTextOption, error) {
	if f.OptionsFn == nil {
		return nil, nil
	}
	return f.OptionsFn(ctx, q)
}
func (f *fakeModuleTextService) Update(ctx context.Context, cmd inputport.UpdateModuleTextCommand) (*inputport.ModuleTextResponse, error) {
	if f.UpdateFn == nil {
		return nil, nil
	}
	return f.UpdateFn(ctx, cmd)
}
func (f *fakeModuleTextService) Delete(ctx context.Context, cmd inputport.DeleteModuleTextCommand) error {
	if f.DeleteFn == nil {
		return nil
	}
	return f.DeleteFn(ctx, cmd)
}

// Compile-time assertion: fake satisfies the inbound port. Failing here
// means the inputport interface gained a method the fake hasn't been
// updated for — fix the fake, don't paper over it.
var _ inputport.ModuleTextService = (*fakeModuleTextService)(nil)

// newTestServer mounts the handler on a fresh ServeMux, wraps it in
// httperr.JSONErrors — the SAME middleware the generated composition root
// applies in production (main.go: `httperr.JSONErrors(restMux)`) — and serves
// it via httptest.NewServer. Wrapping is load-bearing, not cosmetic: without
// it a no-route/no-record 404 returns the stdlib text/plain "404 page not
// found" body, whereas production rewrites it to `{"error":"not found"}` with
// Content-Type application/json. Testing the bare mux would let that
// test/production body divergence pass unnoticed (#3359). t.Cleanup closes the
// server when the test ends.
func newTestServer(t *testing.T, svc inputport.ModuleTextService) *httptest.Server {
	t.Helper()
	h := NewHandler(svc, 0, nil)
	mux := http.NewServeMux()
	h.RegisterRoutes(mux)
	srv := httptest.NewServer(httperr.JSONErrors(mux))
	t.Cleanup(srv.Close)
	return srv
}

// newTestServerWithLogger mounts the handler with a caller-supplied logger
// so tests can capture log output for security-property assertions (#2784).
// It applies the same httperr.JSONErrors wrap as newTestServer so the served
// stack matches production (#3359).
func newTestServerWithLogger(t *testing.T, svc inputport.ModuleTextService, logger *slog.Logger) *httptest.Server {
	t.Helper()
	h := NewHandler(svc, 0, logger)
	mux := http.NewServeMux()
	h.RegisterRoutes(mux)
	srv := httptest.NewServer(httperr.JSONErrors(mux))
	t.Cleanup(srv.Close)
	return srv
}

// TestHandler_List_OK pins the GET /<entity>s happy path: status 200 +
// JSON body. The List fake returns an empty slice so the body decode
// stays spec-shape-independent.
func TestHandler_List_OK(t *testing.T) {
	called := false
	svc := &fakeModuleTextService{
		ListFn: func(_ context.Context, _ inputport.ListModuleTextQuery) ([]*inputport.ModuleTextResponse, error) {
			called = true
			return []*inputport.ModuleTextResponse{}, nil
		},
	}
	srv := newTestServer(t, svc)
	resp, err := http.Get(srv.URL + "/module-texts")
	if err != nil {
		t.Fatalf("GET list: %v", err)
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode != http.StatusOK {
		t.Errorf("status = %d, want 200", resp.StatusCode)
	}
	if !called {
		t.Errorf("List service method was not invoked")
	}
}

// TestHandler_List_BadLimit pins query-string validation: a non-numeric
// `limit=` parameter is rejected with non-2xx (httperr maps strconv
// errors to 400).
func TestHandler_List_BadLimit(t *testing.T) {
	srv := newTestServer(t, &fakeModuleTextService{})
	resp, err := http.Get(srv.URL + "/module-texts?limit=not-a-number")
	if err != nil {
		t.Fatalf("GET list: %v", err)
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		t.Errorf("status = %d on bad limit; want non-2xx", resp.StatusCode)
	}
}

// TestHandler_GetByID_PassesPathID pins that the handler passes the
// path-bound id straight through to inputport.Get<E>ByIDQuery. A future
// regen that swaps r.PathValue for a different binding would silently
// break this routing seam.
func TestHandler_GetByID_PassesPathID(t *testing.T) {
	var gotID string
	svc := &fakeModuleTextService{
		GetByIDFn: func(_ context.Context, q inputport.GetModuleTextByIDQuery) (*inputport.ModuleTextResponse, error) {
			gotID = q.ID
			return &inputport.ModuleTextResponse{}, nil
		},
	}
	srv := newTestServer(t, svc)
	resp, err := http.Get(srv.URL + "/module-texts/abc-123")
	if err != nil {
		t.Fatalf("GET getByID: %v", err)
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode != http.StatusOK {
		t.Errorf("status = %d, want 200", resp.StatusCode)
	}
	if gotID != "abc-123" {
		t.Errorf("query.ID = %q, want abc-123", gotID)
	}
}

// TestHandler_GetByID_NilResponseIs404 is the regression backstop for
// #2907: a hand-edited service returning (nil, nil) from GetByID must
// surface as 404 Not Found, NOT 200 with a JSON null body. A null body
// with 200 breaks JS clients doing property access on the result
// (undefined access on null).
func TestHandler_GetByID_NilResponseIs404(t *testing.T) {
	svc := &fakeModuleTextService{
		GetByIDFn: func(_ context.Context, _ inputport.GetModuleTextByIDQuery) (*inputport.ModuleTextResponse, error) {
			// Simulate a hand-edited service that returns (nil, nil) —
			// "no record, but also no error". The handler must gate this.
			return nil, nil
		},
	}
	srv := newTestServer(t, svc)
	resp, err := http.Get(srv.URL + "/module-texts/no-such-id")
	if err != nil {
		t.Fatalf("GET getByID: %v", err)
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode != http.StatusNotFound {
		t.Errorf("#2907: GetByID nil-response must return 404, got %d (bare-null-200 footgun)", resp.StatusCode)
	}
	// #3359: the test server mirrors production by wrapping the mux in
	// httperr.JSONErrors, so the nil-response 404 MUST be delivered as a JSON
	// body with Content-Type application/json — NOT the stdlib text/plain "404
	// page not found" a bare ServeMux emits. A client that parses the 404 body
	// as JSON must get the same shape in tests as in production. Asserting only
	// the status code (the pre-#3359 test) let that body divergence pass silently.
	if ct := resp.Header.Get("Content-Type"); ct != "application/json" {
		t.Errorf("#3359: nil-response 404 Content-Type = %q, want application/json (JSONErrors wrap must rewrite the text/plain 404)", ct)
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read 404 body: %v", err)
	}
	// A valid JSON decode proves the body is NOT the stdlib text/plain "404
	// page not found\n" (which would fail json.Unmarshal), and the non-empty
	// "error" key pins the httperr envelope shape production clients consume.
	var errBody map[string]string
	if err := json.Unmarshal(body, &errBody); err != nil {
		t.Fatalf("#3359: nil-response 404 body must be JSON, got %q: %v", body, err)
	}
	if errBody["error"] == "" {
		t.Errorf("#3359: nil-response 404 JSON body must carry a non-empty \"error\" field:\n%s", body)
	}
}

// TestHandler_Delete_NoContent pins the 204 contract on the delete
// happy path. Delete returns no body, and clients (especially HTMX
// callers) rely on the 204 vs 200 distinction.
func TestHandler_Delete_NoContent(t *testing.T) {
	svc := &fakeModuleTextService{
		DeleteFn: func(_ context.Context, _ inputport.DeleteModuleTextCommand) error { return nil },
	}
	srv := newTestServer(t, svc)
	req, err := http.NewRequest(http.MethodDelete, srv.URL+"/module-texts/x", nil)
	if err != nil {
		t.Fatalf("build DELETE: %v", err)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("DELETE: %v", err)
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode != http.StatusNoContent {
		t.Errorf("status = %d, want 204", resp.StatusCode)
	}
}

// TestHandler_Create_RejectsMalformedBody pins decoder rejection: a
// blatantly non-JSON body returns non-2xx without invoking the service.
// (A spec-shape-aware "missing required field" test lives in the
// commands package's own test, where the wire-required list is known.)
func TestHandler_Create_RejectsMalformedBody(t *testing.T) {
	called := false
	svc := &fakeModuleTextService{
		CreateFn: func(_ context.Context, _ inputport.CreateModuleTextCommand) (*inputport.ModuleTextResponse, error) {
			called = true
			return &inputport.ModuleTextResponse{}, nil
		},
	}
	srv := newTestServer(t, svc)
	resp, err := http.Post(srv.URL+"/module-texts", "application/json", strings.NewReader("not-json"))
	if err != nil {
		t.Fatalf("POST create: %v", err)
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		t.Errorf("status = %d on malformed body; want non-2xx", resp.StatusCode)
	}
	if called {
		t.Errorf("Create service was invoked despite decode failure")
	}
}

// TestHandler_Options_NilSliceIsEmptyArray is the regression backstop for
// #3234. When svc.Options returns (nil, nil) — a hand-edited service, or the
// zero-value fake — the handler must coerce the nil slice to an empty slice so
// the JSON body is `[]`, never `null`. A nil JSON-tagged slice marshals to
// `null`, which crashes JS clients populating a `<select>` with
// `for..of resp` / `resp.map(...)` / `Array.isArray(resp)`. Mirrors the plain
// list handler's null-vs-[] guard (#2272).
//
// The body is decoded into a typed slice: JSON `null` decodes to a nil slice,
// JSON `[]` decodes to a non-nil empty slice — so `got == nil` distinguishes
// the defect from the fix without any string matching on the wire format.
func TestHandler_Options_NilSliceIsEmptyArray(t *testing.T) {
	svc := &fakeModuleTextService{
		OptionsFn: func(_ context.Context, _ inputport.ModuleTextOptionsQuery) ([]inputport.ModuleTextOption, error) {
			// Simulate a service that returns a nil slice (no rows, no error).
			return nil, nil
		},
	}
	srv := newTestServer(t, svc)
	resp, err := http.Get(srv.URL + "/module-texts/options")
	if err != nil {
		t.Fatalf("GET options: %v", err)
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("options status = %d, want 200", resp.StatusCode)
	}
	var got []inputport.ModuleTextOption
	if err := json.NewDecoder(resp.Body).Decode(&got); err != nil {
		t.Fatalf("#3234: options body must be valid JSON: %v", err)
	}
	if got == nil {
		t.Errorf("#3234: options body decoded to a nil slice — handler emitted JSON " +
			"`null` instead of `[]`; JS clients doing for..of / Array.isArray on the " +
			"dropdown response break on null")
	}
}

// TestHandler_ListByModule_RouteRegistered pins that the generated
// ListByModule route is registered and reachable over HTTP (closes #1078).
// It asserts: (1) the route responds 200, (2) the refID path value is forwarded
// to the service, (3) the service method is actually called — not silently
// swallowed by another route.
func TestHandler_ListByModule_RouteRegistered(t *testing.T) {
	var gotRefID string
	svc := &fakeModuleTextService{
		ListByModuleFn: func(_ context.Context, q inputport.ListModuleTextByModuleQuery) ([]*inputport.ModuleTextResponse, error) {
			gotRefID = q.ModuleID
			return []*inputport.ModuleTextResponse{}, nil
		},
	}
	srv := newTestServer(t, svc)
	resp, err := http.Get(srv.URL + "/module-texts/by-module/ref-abc")
	if err != nil {
		t.Fatalf("GET listByModule: %v", err)
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode != http.StatusOK {
		t.Errorf("ListByModule status = %d, want 200 — route may not be registered (closes #1078)", resp.StatusCode)
	}
	if gotRefID != "ref-abc" {
		t.Errorf("ListByModuleQuery.ModuleID = %q, want ref-abc", gotRefID)
	}
}

// TestHandler_ListByModule_WrapsInEnvelope pins the #1696 item 6
// standardization: listByModule returns the `{data, total}` JSON
// envelope (NOT a bare array), and `data` serializes as `[]` — never `null` —
// on an empty result (the null-vs-`[]` invariant). The body is decoded into a
// typed envelope so a regen that reverts to the bare array fails to unmarshal.
func TestHandler_ListByModule_WrapsInEnvelope(t *testing.T) {
	svc := &fakeModuleTextService{
		ListByModuleFn: func(_ context.Context, _ inputport.ListModuleTextByModuleQuery) ([]*inputport.ModuleTextResponse, error) {
			// Return a nil slice on purpose — the handler MUST coerce it to []
			// at the JSON boundary so the body is `"data":[]`, not `"data":null`.
			return nil, nil
		},
	}
	srv := newTestServer(t, svc)
	resp, err := http.Get(srv.URL + "/module-texts/by-module/ref-empty")
	if err != nil {
		t.Fatalf("GET listByModule: %v", err)
	}
	defer func() { _ = resp.Body.Close() }()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read body: %v", err)
	}
	got := string(body)
	// The empty result must marshal `data` as `[]`, never `null` (a nil
	// JSON-tagged slice marshals to null and crashes consumers iterating
	// resp.data — see docs/design/json-envelope-contract.md).
	if strings.Contains(got, `"data":null`) {
		t.Errorf("listByModule envelope must coerce empty data to [] not null:\n%s", got)
	}
	if !strings.Contains(got, `"data":[]`) {
		t.Errorf("listByModule envelope must emit \"data\":[] on empty result:\n%s", got)
	}
	// Decode into a typed envelope so a revert to the bare array (`[...]`)
	// fails to unmarshal into a struct carrying a data field.
	var env struct {
		Data  []*inputport.ModuleTextResponse `json:"data"`
		Total int                             `json:"total"`
	}
	if err := json.Unmarshal(body, &env); err != nil {
		t.Fatalf("listByModule body must be a {data,total} object, not a bare array: %v\n%s", err, got)
	}
	if env.Data == nil {
		t.Errorf("listByModule envelope data decoded to nil; want non-nil [] (null-vs-[] invariant):\n%s", got)
	}
	if env.Total != 0 {
		t.Errorf("listByModule envelope total = %d on empty result, want 0:\n%s", env.Total, got)
	}
}

// TestHandler_ListByModule_CountByError_StillReturnsItems is the
// regression backstop for #2582: a transient CountByModule error MUST
// NOT break the response — the handler must still return the fetched items
// with HTTP 200 and total = len(page) as the degraded-count fallback.
// Before the fix, the error was silently swallowed; after the fix it is logged.
//
// Design properties under test:
//  1. Response is HTTP 200 even when CountByModule errors.
//  2. The `data` array still contains the fetched items.
//  3. The `total` degrades to len(page) — at least as many as the page size.
func TestHandler_ListByModule_CountByError_StillReturnsItems(t *testing.T) {
	svc := &fakeModuleTextService{
		ListByModuleFn: func(_ context.Context, _ inputport.ListModuleTextByModuleQuery) ([]*inputport.ModuleTextResponse, error) {
			return []*inputport.ModuleTextResponse{
				{},
				{},
			}, nil
		},
		CountByModuleFn: func(_ context.Context, _ inputport.ListModuleTextByModuleQuery) (int, error) {
			return 0, errors.New("transient count error")
		},
	}
	srv := newTestServer(t, svc)
	resp, err := http.Get(srv.URL + "/module-texts/by-module/ref-deg")
	if err != nil {
		t.Fatalf("GET listByModule (count error): %v", err)
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode != http.StatusOK {
		t.Errorf("#2582: listByModule with CountByModule error must return 200, got %d", resp.StatusCode)
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read body: %v", err)
	}
	var env struct {
		Data  []*inputport.ModuleTextResponse `json:"data"`
		Total int                             `json:"total"`
	}
	if err := json.Unmarshal(body, &env); err != nil {
		t.Fatalf("#2582: listByModule body must be valid {data,total} JSON even on CountByModule error: %v\n%s", err, body)
	}
	if got := len(env.Data); got != 2 {
		t.Errorf("#2582: expected 2 items in data despite CountByModule error, got %d\n%s", got, body)
	}
	// Total degrades to len(page): the handler must not silently invent
	// a total that would satisfy pagination math without the real count.
	// The key invariant is total == len(data) (page size) when CountBy errors.
	if env.Total != 2 {
		t.Errorf("#2582: expected total=2 (len(page)) on CountByModule error, got %d\n%s", env.Total, body)
	}
}

// TestHandler_ListByModule_CountByError_LogsSafeMessage is the security
// regression backstop for #2784.
//
// Design properties under test:
//  1. The raw DB driver error text is NOT written to the log — logging
//     schema/table/column/constraint names from DB error strings is a
//     minor information-disclosure risk (operator-facing, but hygiene).
//  2. The user-supplied refID is truncated to at most 64 bytes before
//     being written to the log — prevents unbounded log-line bloat from
//     a crafted path value.
//  3. A fixed domain message IS present so operators know a count
//     degradation occurred without parsing raw driver text.
func TestHandler_ListByModule_CountByError_LogsSafeMessage(t *testing.T) {
	rawDriverErr := "pq: column \"nonexistent_col\" of relation \"order_items\" does not exist"
	svc := &fakeModuleTextService{
		ListByModuleFn: func(_ context.Context, _ inputport.ListModuleTextByModuleQuery) ([]*inputport.ModuleTextResponse, error) {
			return []*inputport.ModuleTextResponse{}, nil
		},
		CountByModuleFn: func(_ context.Context, _ inputport.ListModuleTextByModuleQuery) (int, error) {
			return 0, errors.New(rawDriverErr)
		},
	}

	var logBuf bytes.Buffer
	logger := slog.New(slog.NewJSONHandler(&logBuf, &slog.HandlerOptions{Level: slog.LevelError}))
	srv := newTestServerWithLogger(t, svc, logger)

	// Use a refID that is longer than 64 bytes to verify truncation.
	longRefID := strings.Repeat("x", 100)
	resp, err := http.Get(srv.URL + "/module-texts/by-module/" + longRefID)
	if err != nil {
		t.Fatalf("GET listByModule: %v", err)
	}
	defer func() { _ = resp.Body.Close() }()

	logOutput := logBuf.String()

	// #2784 property 1: raw DB driver error text must NOT appear in the log.
	if strings.Contains(logOutput, rawDriverErr) {
		t.Errorf("#2784: raw DB driver error text leaked into log output — must be replaced with a domain message:\n%s", logOutput)
	}
	// Double-check that specific DB schema tokens are absent.
	if strings.Contains(logOutput, "order_items") || strings.Contains(logOutput, "nonexistent_col") {
		t.Errorf("#2784: DB schema tokens leaked into log output:\n%s", logOutput)
	}

	// #2784 property 2: refID in log must not exceed 64 bytes.
	// The JSON log encodes the ref_id field value; verify the untruncated
	// 100-byte value is not present.
	if strings.Contains(logOutput, longRefID) {
		t.Errorf("#2784: untruncated refID (100 bytes) found in log output — must be capped at 64 bytes:\n%s", logOutput)
	}

	// #2784 property 3: a domain message indicating count degradation IS logged
	// so operators know the fallback fired.
	if !strings.Contains(logOutput, "internal count error") {
		t.Errorf("#2784: expected domain message \"internal count error\" in log output (operators must be able to see count degraded):\n%s", logOutput)
	}
}

// TestHandler_ListByModule_LogRefIDTruncationIsRuneSafe is the
// regression backstop for #3236.
//
// The refID log truncation caps the value at 64 BYTES. A byte-level cut can
// land inside a multi-byte UTF-8 rune (e.g. a 3-byte CJK ideograph), leaving
// an invalid UTF-8 tail. slog's JSON handler then escapes the invalid byte to
// the literal `�` replacement-character escape — corrupting the value log
// pipelines use for correlation. The handler must back off to the last
// complete rune so the logged refID is always valid UTF-8.
//
// Discriminators (each fails on the buggy byte-slice, passes on the rune-safe
// fix): (1) the JSON log must NOT contain a `�` escape — a naive [:64] cut
// of 30×中 leaves a lone 0xE4 byte that slog escapes to `�`; (2) the
// decoded ref_id must be ≤64 bytes — the buggy path round-trips to 21 runes +
// one U+FFFD (66 bytes), the fix yields 21 runes (63 bytes).
func TestHandler_ListByModule_LogRefIDTruncationIsRuneSafe(t *testing.T) {
	svc := &fakeModuleTextService{
		ListByModuleFn: func(_ context.Context, _ inputport.ListModuleTextByModuleQuery) ([]*inputport.ModuleTextResponse, error) {
			return []*inputport.ModuleTextResponse{}, nil
		},
		CountByModuleFn: func(_ context.Context, _ inputport.ListModuleTextByModuleQuery) (int, error) {
			// Force the degrade path so the refID is logged.
			return 0, errors.New("boom")
		},
	}

	var logBuf bytes.Buffer
	logger := slog.New(slog.NewJSONHandler(&logBuf, &slog.HandlerOptions{Level: slog.LevelError}))
	srv := newTestServerWithLogger(t, svc, logger)

	// 30 CJK ideographs = 90 bytes. A byte-level [:64] cut lands on the first
	// byte (0xE4) of the 22nd 3-byte sequence, so a naive truncation leaves
	// invalid UTF-8. Path-escape it so the raw multi-byte value reaches the
	// handler's r.PathValue intact.
	refID := strings.Repeat("中", 30)
	resp, err := http.Get(srv.URL + "/module-texts/by-module/" + url.PathEscape(refID))
	if err != nil {
		t.Fatalf("GET listByModule: %v", err)
	}
	defer func() { _ = resp.Body.Close() }()

	logOutput := logBuf.String()

	// #3236 discriminator 1: slog escapes a split multi-byte sequence to the
	// literal `�` replacement-character escape. Its presence proves the
	// truncation split a rune mid-sequence.
	if strings.Contains(logOutput, "\\ufffd") {
		t.Errorf("#3236: log output contains a \\ufffd replacement-character escape — refID truncation split a multi-byte rune:\n%q", logOutput)
	}

	// #3236 discriminator 2: the decoded ref_id must stay within the 64-byte
	// cap. The buggy byte-slice round-trips through slog+json to 21 runes plus a
	// U+FFFD (66 bytes); the rune-safe fix yields 21 runes (63 bytes).
	var entry map[string]any
	if err := json.Unmarshal([]byte(strings.TrimSpace(logOutput)), &entry); err != nil {
		t.Fatalf("#3236: log line must be valid JSON: %v\n%s", err, logOutput)
	}
	gotRefID, _ := entry["ref_id"].(string)
	if gotRefID == "" {
		t.Errorf("#3236: ref_id missing/empty in log entry:\n%s", logOutput)
	}
	if len(gotRefID) > 64 {
		t.Errorf("#3236: logged ref_id = %d bytes, exceeds the 64-byte cap: %q", len(gotRefID), gotRefID)
	}
	// The kept value must be a whole number of 中 runes (no partial/replacement
	// rune): rune-safe truncation keeps exactly 21 complete ideographs.
	if strings.ContainsRune(gotRefID, '�') {
		t.Errorf("#3236: decoded ref_id contains U+FFFD — a rune was split by byte-level truncation: %q", gotRefID)
	}
}

// TestHandler_Update_RejectsBodyIDMismatch pins the path-vs-body id
// invariant. When body id is non-empty AND differs from the path id
// the handler emits a 400 without calling the service. Empty body id
// is acceptable (path wins) and is exercised by the broader Update
// path which is spec-shape-dependent.
func TestHandler_Update_RejectsBodyIDMismatch(t *testing.T) {
	called := false
	svc := &fakeModuleTextService{
		UpdateFn: func(_ context.Context, _ inputport.UpdateModuleTextCommand) (*inputport.ModuleTextResponse, error) {
			called = true
			return &inputport.ModuleTextResponse{}, nil
		},
	}
	srv := newTestServer(t, svc)
	body := `{"id":"body-id"}` // no required fields, but id mismatch is checked first only after decode succeeds; if decode fails we still get non-2xx
	req, err := http.NewRequest(http.MethodPut, srv.URL+"/module-texts/path-id", strings.NewReader(body))
	if err != nil {
		t.Fatalf("build PUT: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("PUT: %v", err)
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		t.Errorf("status = %d on body/path mismatch; want non-2xx", resp.StatusCode)
	}
	if called {
		t.Errorf("Update service was invoked despite id mismatch (or decode failure)")
	}
}

// TestHandler_Update_NilResponseIs404 is the regression backstop for
// #2907: when the service returns (nil, nil) from Update the handler must
// surface 404 Not Found — NOT 200 with a JSON null body. A null body with
// 200 breaks JS clients doing property access on the result (undefined
// access on null).
//
// The request body ({"locale":null,"module_id":null,"title":null}) keys every wire-required Update
// field with a null value so DecodeJSON's wire-presence probe passes and the
// typed decode succeeds (null → zero value for every field type), reaching the
// service. This is load-bearing (#3419): with an empty `{}` body a
// wire-required entity would 400 in DecodeJSON BEFORE the service, so `called`
// stayed false and the guard was never asserted — the test was vacuous for the
// most common entity shape. The `if !called` fail below makes that vacuousness
// impossible: if the body is ever rejected the test FAILS rather than passing
// silently.
func TestHandler_Update_NilResponseIs404(t *testing.T) {
	called := false
	svc := &fakeModuleTextService{
		UpdateFn: func(_ context.Context, _ inputport.UpdateModuleTextCommand) (*inputport.ModuleTextResponse, error) {
			called = true
			// Simulate a hand-edited service that returns (nil, nil) —
			// "no row matched, but also no error". The handler must gate this.
			return nil, nil
		},
	}
	srv := newTestServer(t, svc)
	// Every wire-required field keyed null so the body passes DecodeJSON and the
	// service is reached (#3419); "{}" when the entity has no required fields.
	req, err := http.NewRequest(http.MethodPut, srv.URL+"/module-texts/no-such-id", strings.NewReader("{\"locale\":null,\"module_id\":null,\"title\":null}"))
	if err != nil {
		t.Fatalf("build PUT: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("PUT: %v", err)
	}
	defer func() { _ = resp.Body.Close() }()
	// Non-vacuous guarantee (#3419): the nil→404 guard only runs once the service
	// is reached. If the body did not pass DecodeJSON the guard is untested — fail
	// loudly instead of passing silently.
	if !called {
		t.Fatalf("#3419: Update service was not reached — the nil-guard body did not pass DecodeJSON (got %d); the nil→404 guard is untested", resp.StatusCode)
	}
	// Service reached and returned (nil, nil) — the nil guard MUST have fired.
	if resp.StatusCode != http.StatusNotFound {
		t.Errorf("#2907: Update nil-response must return 404, got %d (bare-null-200 footgun)", resp.StatusCode)
	}
	// #3359: when the nil→404 path actually fires (service reached, returned
	// nil), the 404 must be a JSON body via the httperr.JSONErrors wrap the test
	// server now mirrors from production — never the stdlib text/plain "404 page
	// not found". Gated on called && 404 so a required-field decode 400 (also
	// application/json, but not a 404) does not trip the assertion.
	if called && resp.StatusCode == http.StatusNotFound {
		if ct := resp.Header.Get("Content-Type"); ct != "application/json" {
			t.Errorf("#3359: nil-response 404 Content-Type = %q, want application/json (JSONErrors wrap must rewrite the text/plain 404)", ct)
		}
		body, err := io.ReadAll(resp.Body)
		if err != nil {
			t.Fatalf("read 404 body: %v", err)
		}
		var errBody map[string]string
		if err := json.Unmarshal(body, &errBody); err != nil {
			t.Fatalf("#3359: nil-response 404 body must be JSON, got %q: %v", body, err)
		}
		if errBody["error"] == "" {
			t.Errorf("#3359: nil-response 404 JSON body must carry a non-empty \"error\" field:\n%s", body)
		}
	}
}
