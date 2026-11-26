package encryptor

import (
	"reflect"
	"testing"
)

// TestPortShape pins the cross-context encryptor Port surface. The four
// methods are the contract every adapter (in-process AES, KMS-backed,
// HSM-backed, …) must implement, so a regression here breaks every
// outbound adapter that handles encrypted fields. We assert the contract
// with a compile-time interface check rather than a runtime test —
// any change to method names / signatures fails the build, which is
// the strongest possible guard for a port-only file.
func TestPortShape(t *testing.T) {
	var _ Port = portShapeProbe{}
	typ := reflect.TypeOf((*Port)(nil)).Elem()
	if typ.NumMethod() != 4 {
		t.Errorf("Port has %d methods, want 4 (Encrypt, Decrypt, HMAC, Trigrams)", typ.NumMethod())
	}
	for _, name := range []string{"Encrypt", "Decrypt", "HMAC", "Trigrams"} {
		if _, ok := typ.MethodByName(name); !ok {
			t.Errorf("Port has no %s method", name)
		}
	}
	t.Log("Port has Encrypt / Decrypt / HMAC / Trigrams methods")
}

// portShapeProbe is a compile-time witness that the four methods named
// in the Port interface haven't drifted. If a method is renamed or its
// signature changes, this struct stops satisfying Port and the test
// file fails to compile.
type portShapeProbe struct{}

func (portShapeProbe) Encrypt(domain, plaintext string) (string, error)  { return "", nil }
func (portShapeProbe) Decrypt(domain, ciphertext string) (string, error) { return "", nil }
func (portShapeProbe) HMAC(domain, plaintext string) string              { return "" }
func (portShapeProbe) Trigrams(domain, plaintext string) []string        { return nil }
