# OmniSign + ScreenMesh Platform
Enterprise-grade digital signage orchestration with a high-integrity, offline-first execution engine.
## 🚀 Overview
OmniSign is a specialized CMS and device management platform designed for mission-critical digital signage. It separates the platform into two distinct layers:
1.  **OmniSign CMS (Control Plane)**: A React-based dashboard for fleet orchestration, cryptographic pairing, and visual manifest design.
2.  **ScreenMesh Engine (Execution Layer)**: A resilient playback engine that implements cryptographic challenge-response heartbeats and SHA256 content integrity verification.
## 🏗️ Architecture
### Secure Data Flow
- **Durable Objects**: Each device and playlist is an isolated entity within Cloudflare's Global Durable Object, ensuring atomic state updates and consistent telemetry.
- **Challenge-Response**: Heartbeats are protected by rotating Ed25519 nonces. The server sends a nonce in the heartbeat response; the device must sign this nonce in the subsequent request.
- **Content Integrity**: Playlists are signed manifests. Every media item requires a SHA256 hash. The ScreenMesh engine performs "Read-Verify-Repair" cycles to ensure data corruption does not reach the screen.
### Technical Stack
- **Frontend**: React 18, TypeScript, Tailwind CSS (v3), Shadcn UI, Framer Motion, Recharts.
- **Backend**: Hono, Cloudflare Workers, Durable Objects.
- **Security**: Web Crypto API (Ed25519), SHA256, JWT-style Mesh Tokens.
## 🛠️ Getting Started
### 1. CMS Dashboard
Access the root path `/` to view the **Fleet Integrity** dashboard. From here, you can monitor active nodes, watchdog alerts, and global telemetry.
### 2. Provisioning a Node
1. Navigate to **Fleet Monitor** (`/fleet`).
2. Click **Provision Node**.
3. Select your platform (e.g., WebOS, Tizen, or Simulator).
4. Copy the **6-Digit Pairing Code**.
### 3. Simulator (ScreenMesh Player)
Launch the simulator for a device: `/simulator/:deviceId`.
- **New Devices**: Enter the pairing code from the CMS. The device will generate an Ed25519 keypair, sign the challenge, and receive an orchestration token.
- **Playback**: Once paired, the simulator polls for signed manifests, verifies content hashes, and begins the deterministic playback loop.
## 🛡️ PRD Alignment Verification
| Requirement | Implementation Detail |
| :--- | :--- |
| **Fleet Observability** | Real-time Recharts-based telemetry and watchdog logs in CMS. |
| **Secure Pairing** | Cryptographic 6-digit challenge-response using Ed25519 signatures. |
| **Offline Resilience** | IndexedDB-backed manifest caching + SHA256 integrity verification. |
| **Traffic Shaping** | `X-Next-Sync` headers implementing jittered polling intervals. |
| **Watchdog Logic** | RAF-drift monitoring in Simulator that triggers recovery on stalls. |
---
*OmniSign Platform Engineering (2025)*