# Spectrum Trainer (Educational Sandbox)

This is a small interactive webapp for teaching spectrum planning basics:
- center frequency, bandwidth, power
- channel spacing (grid) + snap-to-grid behavior
- simple overlap/adjacent conflict detection
- a deliberately simplified SINR estimate

## Run locally

1) Install Node.js 18+.
2) In this folder:

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (typically http://localhost:5173).

## Notes / disclaimers
- Bands included are **illustrative training ranges** (not authoritative allocations).
- The SINR/interference model is intentionally simplified for learning. It is *not* a substitute for real engineering tools.

## Scenarios
Scenarios live in `public/scenarios/` as JSON. You can add your own by copying an existing file.
