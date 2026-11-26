package learnerrest

import (
	"context"
	"encoding/json" // decode JSON error / envelope response bodies (#1696 item 6, #3359) / options nil-vs-[] (#3234)
	"io"            // read response bodies for JSON-body assertions (#1696 item 6, #3359)
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/inxpired/hexago/runtime/httperr"

	inputport "example.com/learnlab/internal/core/ports/input/learner"
)

// fakeLearnerService is a function-field-driven stub of the
// inputport.LearnerService interface. Each handler test sets the
// op-specific Fn and leaves the rest at zero — unused branches return
// the zero value (which httperr translates to a 500 if hit), so a test
// hitting the wrong branch would surface as a status mismatch rather
// than silent passing.
type fakeLearnerService struct {
	CreateFn  func(ctx context.Context, cmd inputport.CreateLearnerCommand) (*inputport.LearnerResponse, error)
	GetByIDFn func(ctx context.Context, q inputport.GetLearnerByIDQuery) (*inputport.LearnerResponse, error)
	ListFn    func(ctx context.Context, q inputport.ListLearnerQuery) ([]*inputport.LearnerResponse, error)
	OptionsFn func(ctx context.Context, q inputport.LearnerOptionsQuery) ([]inputport.LearnerOption, error)
	UpdateFn  func(ctx context.Context, cmd inputport.UpdateLearnerCommand) (*inputport.LearnerResponse, error)
	DeleteFn  func(ctx context.Context, cmd inputport.DeleteLearnerCommand) error
}

func (f *fakeLearnerService) Create(ctx context.Context, cmd inputport.CreateLearnerCommand) (*inputport.LearnerResponse, error) {
	if f.CreateFn == nil {
		return nil, nil
	}
	return f.CreateFn(ctx, cmd)
}
func (f *fakeLearnerService) GetByID(ctx context.Context, q inputport.GetLearnerByIDQuery) (*inputport.LearnerResponse, error) {
	if f.GetByIDFn == nil {
		return nil, nil
	}
	return f.GetByIDFn(ctx, q)
}
func (f *fakeLearnerService) List(ctx context.Context, q inputport.ListLearnerQuery) ([]*inputport.LearnerResponse, error) {
	if f.ListFn == nil {
		return nil, nil
	}
	return f.ListFn(ctx, q)
}

// Options pins the auto-emitted `[{id, label}]` port method (#403
// sub-5 / #421). Closes #484.
func (f *fakeLearnerService) Options(ctx context.Context, q inputport.LearnerOptionsQuery) ([]inputport.LearnerOption, error) {
	if f.OptionsFn == nil {
		return nil, nil
	}
	return f.OptionsFn(ctx, q)
}
func (f *fakeLearnerService) Update(ctx context.Context, cmd inputport.UpdateLearnerCommand) (*inputport.LearnerResponse, error) {
	if f.UpdateFn == nil {
		return nil, nil
	}
	return f.UpdateFn(ctx, cmd)
}
func (f *fakeLearnerService) Delete(ctx context.Context, cmd inputport.DeleteLearnerCommand) error {
	if f.DeleteFn == nil {
		return nil
	}
	return f.DeleteFn(ctx, cmd)
}

// Compile-time assertion: fake satisfies the inbound port. Failing here
// means the inputport interface gained a method the fake hasn't been
// updated for — fix the fake, don't paper over it.
var _ inputport.LearnerService = (*fakeLearnerService)(nil)

// newTestServer mounts the handler on a fresh ServeMux, wraps it in
// httperr.JSONErrors — the SAME middleware the generated composition root
// applies in production (main.go: `httperr.JSONErrors(restMux)`) — and serves
// it via httptest.NewServer. Wrapping is load-bearing, not cosmetic: without
// it a no-route/no-record 404 returns the stdlib text/plain "404 page not
// found" body, whereas production rewrites it to `{"error":"not found"}` with
// Content-Type application/json. Testing the bare mux would let that
// test/production body divergence pass unnoticed (#3359). t.Cleanup closes the
// server when the test ends.
func newTestServer(t *testing.T, svc inputport.LearnerService) *httptest.Server {
	t.Helper()
	h := NewHandler(svc, 0, nil)
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
	svc := &fakeLearnerService{
		ListFn: func(_ context.Context, _ inputport.ListLearnerQuery) ([]*inputport.LearnerResponse, error) {
			called = true
			return []*inputport.LearnerResponse{}, nil
		},
	}
	srv := newTestServer(t, svc)
	resp, err := http.Get(srv.URL + "/learners")
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
	srv := newTestServer(t, &fakeLearnerService{})
	resp, err := http.Get(srv.URL + "/learners?limit=not-a-number")
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
	svc := &fakeLearnerService{
		GetByIDFn: func(_ context.Context, q inputport.GetLearnerByIDQuery) (*inputport.LearnerResponse, error) {
			gotID = q.ID
			return &inputport.LearnerResponse{}, nil
		},
	}
	srv := newTestServer(t, svc)
	resp, err := http.Get(srv.URL + "/learners/abc-123")
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
	svc := &fakeLearnerService{
		GetByIDFn: func(_ context.Context, _ inputport.GetLearnerByIDQuery) (*inputport.LearnerResponse, error) {
			// Simulate a hand-edited service that returns (nil, nil) —
			// "no record, but also no error". The handler must gate this.
			return nil, nil
		},
	}
	srv := newTestServer(t, svc)
	resp, err := http.Get(srv.URL + "/learners/no-such-id")
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
	svc := &fakeLearnerService{
		DeleteFn: func(_ context.Context, _ inputport.DeleteLearnerCommand) error { return nil },
	}
	srv := newTestServer(t, svc)
	req, err := http.NewRequest(http.MethodDelete, srv.URL+"/learners/x", nil)
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
	svc := &fakeLearnerService{
		CreateFn: func(_ context.Context, _ inputport.CreateLearnerCommand) (*inputport.LearnerResponse, error) {
			called = true
			return &inputport.LearnerResponse{}, nil
		},
	}
	srv := newTestServer(t, svc)
	resp, err := http.Post(srv.URL+"/learners", "application/json", strings.NewReader("not-json"))
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
	svc := &fakeLearnerService{
		OptionsFn: func(_ context.Context, _ inputport.LearnerOptionsQuery) ([]inputport.LearnerOption, error) {
			// Simulate a service that returns a nil slice (no rows, no error).
			return nil, nil
		},
	}
	srv := newTestServer(t, svc)
	resp, err := http.Get(srv.URL + "/learners/options")
	if err != nil {
		t.Fatalf("GET options: %v", err)
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("options status = %d, want 200", resp.StatusCode)
	}
	var got []inputport.LearnerOption
	if err := json.NewDecoder(resp.Body).Decode(&got); err != nil {
		t.Fatalf("#3234: options body must be valid JSON: %v", err)
	}
	if got == nil {
		t.Errorf("#3234: options body decoded to a nil slice — handler emitted JSON " +
			"`null` instead of `[]`; JS clients doing for..of / Array.isArray on the " +
			"dropdown response break on null")
	}
}

// TestHandler_Update_RejectsBodyIDMismatch pins the path-vs-body id
// invariant. When body id is non-empty AND differs from the path id
// the handler emits a 400 without calling the service. Empty body id
// is acceptable (path wins) and is exercised by the broader Update
// path which is spec-shape-dependent.
func TestHandler_Update_RejectsBodyIDMismatch(t *testing.T) {
	called := false
	svc := &fakeLearnerService{
		UpdateFn: func(_ context.Context, _ inputport.UpdateLearnerCommand) (*inputport.LearnerResponse, error) {
			called = true
			return &inputport.LearnerResponse{}, nil
		},
	}
	srv := newTestServer(t, svc)
	body := `{"id":"body-id"}` // no required fields, but id mismatch is checked first only after decode succeeds; if decode fails we still get non-2xx
	req, err := http.NewRequest(http.MethodPut, srv.URL+"/learners/path-id", strings.NewReader(body))
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
// The request body ({}) keys every wire-required Update
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
	svc := &fakeLearnerService{
		UpdateFn: func(_ context.Context, _ inputport.UpdateLearnerCommand) (*inputport.LearnerResponse, error) {
			called = true
			// Simulate a hand-edited service that returns (nil, nil) —
			// "no row matched, but also no error". The handler must gate this.
			return nil, nil
		},
	}
	srv := newTestServer(t, svc)
	// Every wire-required field keyed null so the body passes DecodeJSON and the
	// service is reached (#3419); "{}" when the entity has no required fields.
	req, err := http.NewRequest(http.MethodPut, srv.URL+"/learners/no-such-id", strings.NewReader("{}"))
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
