// Provide an in-memory IndexedDB for the storage layer under test.
import "fake-indexeddb/auto";

// Node 20+ exposes a WebCrypto-compatible global `crypto` with subtle + getRandomValues
// + randomUUID, which is what the crypto layer uses. Nothing to polyfill.
