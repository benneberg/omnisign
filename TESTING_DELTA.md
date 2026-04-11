# Verification & Testing Strategy
## Simulator-Driven Development (SDD)
The `SimulatorPage.tsx` is not just a demo; it is a high-fidelity testbed that mimics the runtime constraints of SoC (System on a Chip) environments like LG WebOS or Samsung Tizen.
## Manual Test Suites
1. **Pairing Flow:**
    - Provision a new device in CMS.
    - Launch Simulator.
    - Verify 6-digit code matches.
    - Click "Verify & Activate" and confirm status change in Fleet Monitor.
2. **Integrity Failure:**
    - Publish a playlist with a valid image URL.
    - Manually change the `integrity` hash in the `PlaylistsPage` raw editor.
    - Observe the Simulator correctly identifying the mismatch and triggering the "Repairing" toast.
3. **Network Resilience:**
    - Load the Simulator and then disconnect network (Chrome DevTools).
    - Verify the player continues to loop content using the `manifest_${id}` stored in IndexedDB.
## Automated Logic Verification
The `core-utils.ts` and `entities.ts` include logic for handling CAS contention and index pagination, which are verified via the concurrent usage patterns in the Fleet and Playlist views.