# OmniSign + ScreenMesh 🚀
[![Cloudflare](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Hono](https://img.shields.io/badge/Hono-API-E36002?logo=hono&logoColor=white)](https://hono.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
## Overview
**OmniSign** is an enterprise-grade digital signage platform consisting of a high-performance cloud Control Plane (CMS) and a resilient, offline-first Execution Layer (**ScreenMesh Player**).
- **ScreenMesh**: The player engine designed for deterministic playback on SoC hardware (WebOS, Tizen). It features self-healing caches, cryptographic integrity checks, and watchdog recovery protocols.
- **OmniSign CMS**: A cloud-based orchestration dashboard for fleet management, observability, and signed manifest authoring.
## 🎯 Key Principles
- **Always-on**: 4-level fallback logic (Local Cache → Staged Manifest → Default Media → Error Slate).
- **Offline-first**: Utilizes IndexedDB for media persistence, allowing nodes to run for weeks without connectivity.
- **Secure**: Every heartbeat and manifest is verified via **Ed25519** signatures and **SHA256** content hashes.
- **Observable**: Real-time telemetry stream including CPU, Memory, Heap usage, and playback stall detection.
## 🛠 Features
### CMS Dashboard
- **Fleet Monitor**: Granular device health, hardware profiles, and real-time load monitoring.
- **Secure Pairing**: 6-digit challenge-response workflow with automated public key registration.
- **Playlist Editor**: Drag-and-drop authoring with integrated SHA256 integrity generation.
- **Bulk Orchestration**: Cluster-wide manifest distribution and token rotation.
### ScreenMesh Player Simulator
- **Execution Engine**: Real-time simulation of hardware watchdog and frame-stall recovery.
- **Security Overlay**: Visual debug UI showing cryptographic signatures and cache validity.
- **Self-Healing**: Automatic detection and repair of corrupted local storage objects.
## 🚀 Quickstart
1. **Development**: `bun dev` to launch the Hono worker and Vite frontend.
2. **Fleet Setup**:
   - Navigate to **Fleet Monitor** in the CMS.
   - Click "Launch Simulator" to boot a new ScreenMesh node.
   - Enter the 6-digit code shown on the screen into the CMS pairing dialog.
3. **Distribution**: Assign a playlist to the "Active" device to see the manifest sync and playback begin.
## Architecture
```text
[ CMS (React/Shadcn) ] <-> [ API (Hono/Durable Objects) ] <-> [ Player (ScreenMesh Engine) ]
                                     |                                   |
                                [ R2/CDN ] <----------------------- [ Asset Cache ]
```
## Tech Stack
- **Frontend**: React 18, Tanstack Query, Framer Motion, Recharts.
- **Backend**: Hono, Cloudflare Durable Objects (Atomic Entities).
- **Security**: WebCrypto API (Ed25519, SHA256).
- **Storage**: IndexedDB (Client), Durable Objects (Server).
---
[PRD_v1.2](shared/types.ts) | [API_SPEC_v1.1](API_SPEC_v1.1.md)