# Project Purpose & Philosophy
## The "Black Screen" Problem
In the digital signage industry, the most expensive failure is the "Black Screen"—a display that has crashed, lost connection, or failed to render content. Traditional systems often rely on persistent internet connections and fragile browser-based players. 
**OmniSign** was created to solve this through a "Resilience First" philosophy.
## Resilience Tiers
The ScreenMesh Engine is designed to handle failure gracefully across three tiers:
1. **Tier 1: Live Orchestration:** The device is synced with the CMS, receiving real-time manifest updates.
2. **Tier 2: Cached Execution:** If the network fails, the device falls back to the locally stored manifest and cached media assets.
3. **Tier 3: Emergency Recovery:** If both the network and cache are corrupted, the device enters a hardened emergency mode to prevent system-wide lockups.
## Core Value Propositions
- **Deterministic Execution:** The player logic is decoupled from the UI, ensuring that the media loop remains consistent even under high CPU load.
- **Security as a Foundation:** By using Ed25519 signatures for every heartbeat and SHA256 hashes for every asset, we eliminate "Man-in-the-Middle" attacks on public displays.
- **Fleet Observability:** Fleet managers gain granular telemetry (CPU, Mem, RAF Drift) for every single node, allowing for proactive maintenance before a screen fails.
## Target Audience
OmniSign is built for enterprise-scale deployments: retail networks, transit hubs, and corporate campuses where display uptime is directly tied to brand integrity and operational efficiency.