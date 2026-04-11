# Technical Architecture
## Data Modeling (Durable Objects)
The platform utilizes a single **Global Durable Object** class to act as a high-performance KV and Indexing store. We implement the `IndexedEntity` pattern to provide type-safe, isolated state for different domains:
- **DeviceEntity:** Tracks node telemetry, security nonces, and assigned playlists.
- **PlaylistEntity:** Manages versioned content manifests and publication signing.
## Heartbeat & Security Protocol
The communication between ScreenMesh and OmniSign follows a strict cryptographic handshake:
1. **Initial Boot:** Device generates an Ed25519 keypair and requests `/init`.
2. **Challenge:** Server responds with a 6-digit code and a unique UUID challenge.
3. **Pairing:** Device signs the challenge and code; Server verifies and issues a JWT-style Access Token.
4. **Heartbeat:** Every heartbeat must be signed using a **rotating nonce** provided by the server in the previous response header (`X-Next-Challenge`).
## ScreenMesh Execution Engine
The player loop is built for stability:
- **RAF Watchdog:** Uses `requestAnimationFrame` to monitor the main thread. If the "drift" between frames exceeds 5000ms, the watchdog triggers a hot-reload of the engine.
- **Traffic Shaping:** The backend calculates a jittered interval for each device (default 60s ± 15s). This prevents "Thundering Herd" scenarios where thousands of devices attempt to sync at the exact same millisecond.
- **Integrity Queue:** Before an item is displayed, it enters a background verification queue where its content is fetched and SHA256 hashed to match the manifest signature.
## Data Flow Diagram
`[ScreenMesh Player] --(Signed Heartbeat)--> [Hono API] --(CAS Update)--> [Durable Object]`
`[CMS Dashboard] <--(REST API)--> [Hono API] <--(List Index)--> [Durable Object]`