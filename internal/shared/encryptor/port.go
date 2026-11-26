// Package encryptor is the cross-context output port for adapter-level
// encryption. Domain entities stay plaintext; only outbound adapters invoke
// this when reading from / writing to their store.
//
// Lives under internal/shared/ so that every bounded context can import it
// without cross-context coupling. A default implementation ships in the
// runtime module at github.com/inxpirativ/hexago/runtime/encryptor.
package encryptor

// Every method takes a leading domain string — a stable per-field label
// (entity name + snake-case field name, e.g. "User.email") that the generated
// adapter derives identically on the write and read sides. Encrypt/Decrypt
// fold it into the AES-GCM Additional Authenticated Data so a ciphertext moved
// between fields/rows fails authentication; HMAC/Trigrams derive a per-domain
// blind-index subkey so equal plaintexts in different fields yield different
// index values (no cross-field/entity correlation via `*_hash` columns).
type Port interface {
	Encrypt(domain, plaintext string) (string, error)
	Decrypt(domain, ciphertext string) (string, error)
	HMAC(domain, plaintext string) string
	Trigrams(domain, plaintext string) []string
}
