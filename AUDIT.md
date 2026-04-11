# Security & Performance Audit
## Cryptographic Hardening
OmniSign utilizes the **Web Crypto API** for all sensitive operations, ensuring that private keys never leave the execution environment (stored in IndexedDB on the player side).
- **Signatures:** Ed25519 (Edwards-curve Digital Signature Algorithm).
- **Hashing:** SHA-256 for all media assets and manifest blocks.
- **Nonces:** Rotating UUIDv4 nonces for every heartbeat to prevent replay attacks.
## Performance Heuristics
- **State Isolation:** By using Durable Objects, we avoid "noisy neighbor" issues at the database level. Each device's state is handled by its own logical DO instance.
- **Watchdog Heuristics:**
    - `drift > 50ms`: Warning (Yellow UI)
    - `drift > 5000ms`: Critical Stall (Auto-Reload)
- **Memory Management:** The simulator uses strict cleanup of Video and Image elements between playlist transitions to prevent memory leaks in long-running signage sessions.
## Infrastructure Resilience
- **Edge Deployment:** The Hono backend runs on Cloudflare's global edge, ensuring sub-50ms heartbeat latency globally.
- **Storage Contention:** The `IndexedEntity` pattern uses a Compare-And-Swap (CAS) approach with a 4-tier retry loop to handle concurrent updates to device state.