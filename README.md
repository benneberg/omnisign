# OmniSign + ScreenMesh
### Enterprise-Grade Digital Signage & Fleet Orchestration Platform
OmniSign is a high-performance, resilient digital signage ecosystem designed for mission-critical displays. It is strictly divided into two layers: the **Control Plane (OmniSign CMS)** for orchestration and the **Execution Layer (ScreenMesh Player)** for deterministic, offline-first media playback.
---
## 🏗️ High-Level Architecture
The platform leverages a modern edge-computing stack to ensure low latency and high availability.
- **Control Plane (OmniSign CMS):** A React + Vite dashboard providing fleet observability, cryptographic device provisioning, and visual playlist authoring.
- **Execution Layer (ScreenMesh Engine):** A specialized player engine (simulated in-browser) that handles manifest verification, content hashing, and watchdog-monitored playback.
- **State Layer (Cloudflare Durable Objects):** Uses the `IndexedEntity` pattern to provide isolated, atomic state management for every device and playlist in the fleet.
## ✨ Key Features
- **Resilient Playback:** ScreenMesh features a requestAnimationFrame (RAF) watchdog that detects engine stalls and triggers automatic recovery.
- **Cryptographic Identity:** Secure device onboarding using Ed25519 challenge-response handshakes.
- **High-Integrity Manifests:** All playlists are versioned and signed. The player verifies SHA256 content hashes before execution.
- **Traffic Shaping:** Intelligent polling logic using `X-Next-Sync` headers to prevent "thundering herd" sync spikes across large fleets.
- **Offline-First:** Multi-tier fallback logic (Live -> Cached -> Emergency) ensuring screens never go black.
## 🚀 Quickstart
### Development Setup
1. **Install Dependencies:**
   ```bash
   bun install
   ```
2. **Start Local Environment:**
   ```bash
   bun run dev
   ```
3. **Access CMS:** Open `http://localhost:3000` to access the dashboard.
4. **Launch Simulator:** Navigate to `Fleet Monitor` and open a device simulator link.
### Deployment
The project is optimized for Cloudflare Workers and Assets:
```bash
bun run deploy
```
## 📋 PRD Alignment Matrix
| Feature | Implementation Status | View / Component |
| :--- | :--- | :--- |
| Fleet Health Monitoring | ✅ Completed | `HomePage.tsx` (Dashboard) |
| Device Registry & Filters | ✅ Completed | `FleetPage.tsx` |
| Cryptographic Pairing | ✅ Completed | `ProvisionPage.tsx` / `SimulatorPage.tsx` |
| Visual Playlist Editor | ✅ Completed | `PlaylistsPage.tsx` |
| Technical Debug Overlay | ✅ Completed | `SimulatorPage.tsx` |
| API Documentation | ✅ Completed | `DocsPage.tsx` |
## 🛠️ Tech Stack
- **Frontend:** React 18, TypeScript, Tailwind CSS, ShadCN UI, Framer Motion, Recharts.
- **Backend:** Hono (Middleware-based routing), Cloudflare Workers.
- **Persistence:** Cloudflare Durable Objects (Entity Pattern).
- **Security:** Web Crypto API (Ed25519, SHA256).
---
*OmniSign Platform Engineering v1.2*