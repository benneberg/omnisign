# OmniSign API Specification v1.1
## Base URL
`/v1`
## Security Model
- **Device Identity**: Ed25519 Keypair generated on first boot.
- **Authentication**: JWT-style access tokens issued upon successful pairing.
- **Signing**: All heartbeats and manifests require cryptographic signatures.
## Endpoints
### 1. Device Orchestration
#### `POST /devices/init`
Registers a new hardware node and generates a pairing challenge.
- **Request**: `{ platform: string, appVersion: string, publicKey: string }`
- **Response**: `{ deviceId: string, pairingCode: string, pairingExpiresAt: number, challenge: string }`
#### `POST /devices/:id/pair`
Completes the challenge-response handshake.
- **Request**: `{ code: string, signature?: string }`
- **Response**: `DeviceState` (including access/refresh tokens).
#### `POST /devices/:id/heartbeat`
Secure telemetry update.
- **Headers**: `Authorization: Bearer <token>`
- **Payload**: Includes `telemetry` (cpu, mem, disk) and `signature`.
#### `POST /devices/:id/token/refresh`
Rotates session keys for active nodes.
### 2. Content & Manifests
#### `GET /playlists`
Lists all available content manifests.
#### `POST /playlists/:id/publish`
Signs a new revision of the playlist and increments the version.
- **Constraint**: All items must have verified `integrity` (SHA256) hashes.
#### `GET /devices/:id/playlist`
Retrieves the latest signed manifest for a specific node.
- **Response Headers**:
  - `X-Content-Signature`: Ed25519 signature of the manifest JSON.
  - `X-Signer-Key`: Public key of the signing authority.
### 3. Traffic Shaping
The API may include `X-Next-Sync` headers to provide jittered polling intervals to prevent thundering herd issues across large fleets.
---
*OmniSign Platform Engineering (2025)*