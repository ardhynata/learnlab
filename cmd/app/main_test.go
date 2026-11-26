package main

import (
	"bytes"
	"encoding/hex"
	"strings"
	"testing"
)

// TestEncryptionKeyBytesHexDecodes pins the canonical init form: the
// 64-hex-char value baked into .env.local at scaffold time decodes to
// 32 raw bytes (AES-256). encryptionKeyBytes returns the decoded
// form when the decoded length is one of {16, 24, 32}.
func TestEncryptionKeyBytesHexDecodes(t *testing.T) {
	raw := bytes.Repeat([]byte{0xab}, 32)
	hexed := hex.EncodeToString(raw)
	got := encryptionKeyBytes(hexed)
	if !bytes.Equal(got, raw) {
		t.Errorf("encryptionKeyBytes(%q) = % x; want % x (hex decode broken)", hexed, got, raw)
	}
}

// TestEncryptionKeyBytesNonHexFallsBackToRaw pins the back-compat
// path: a non-hex value (or hex that decodes to a non-AES length) is
// returned as raw bytes so secrets-manager values pass through.
func TestEncryptionKeyBytesNonHexFallsBackToRaw(t *testing.T) {
	in := "not-hex-but-32-bytes-long-padded"
	got := encryptionKeyBytes(in)
	if string(got) != in {
		t.Errorf("encryptionKeyBytes(%q) = %q; want raw passthrough", in, string(got))
	}
}

// TestIndexKeyBytesHexDecodes pins the canonical init form for the
// HMAC-SHA256 index key: 64 hex chars → 32 raw bytes, accepted because
// the decoded length is ≥ 32.
func TestIndexKeyBytesHexDecodes(t *testing.T) {
	raw := bytes.Repeat([]byte{0xcd}, 32)
	hexed := hex.EncodeToString(raw)
	got := indexKeyBytes(hexed)
	if !bytes.Equal(got, raw) {
		t.Errorf("indexKeyBytes(%q) = % x; want % x", hexed, got, raw)
	}
}

// TestIndexKeyBytesShortHexFallsBackToRaw pins the asymmetry vs the
// AES helper: HMAC-SHA256 has a one-sided minimum (≥ 32 bytes), so a
// 32-char ASCII-hex string (decodes to 16 bytes — too short) falls
// back to the raw 32-byte string form.
func TestIndexKeyBytesShortHexFallsBackToRaw(t *testing.T) {
	in := strings.Repeat("a", 32) // decodes to 16 bytes — short for HMAC
	got := indexKeyBytes(in)
	if string(got) != in {
		t.Errorf("indexKeyBytes(%q) = %q; want raw fallback when hex decode too short", in, string(got))
	}
}
