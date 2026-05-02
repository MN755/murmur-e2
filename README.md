# Murmur

Murmur is a browser-based multi-agent research workbench for studying local communication, information mutation, trust formation, adversarial behavior, infection dynamics, and physics-mediated interaction.

The project is intentionally framed as a research tool, not a game. The UI visualizes agents so researchers can inspect behavior, but the core outputs are settings, telemetry, deterministic headless datasets, and reproducible experiment JSON.

## Current Capabilities

- Live 200-agent environment with a VS Code Abyss-inspired workbench UI.
- Collapsible left observer chat panel and right research panel.
- Research modes for communication, collision, exclusion, and deception.
- Adversarial strategies: corrupt, replay, trust-farm, isolate, and infect.
- Infection awareness modes: known, hidden, learn over time, and delayed reveal.
- Information lineage tracking with origins, parent fragments, hops, TTL, lineage hash, and reconstructability.
- Network topology telemetry: components, largest component, isolated agents, degree, and bridge-like low-degree agents.
- Consensus models: weighted trust, majority, Bayesian update, and confidence decay.
- Entropy controls for mutation pressure, packet drop, link failure, sensor noise, and key drift.
- Agent affect model with valence, arousal, fear, trust drive, curiosity, aggression, and cohesion.
- Defensive behavior including adversary avoidance, quarantine, false-feed deception, and affect-driven blockade/containment forces.
- Physics modes: original boids, pairwise field forces, rigid collision handling, and quantum-inspired wave-field interaction.
- Graph workspace that stays empty until explicitly run, then computes deterministic headless datasets.
- Backend-only endpoint for AI agents, tests, and batch analysis: `POST /api/research/run`.
- Formal experiment JSON export for methods sections, supplemental materials, and reproducibility.

## Routes

- `/` - live lab workbench with canvas, chat, run controls, telemetry, settings, recorder, physics, dev controls, and JSON export.
- `/docs` - built-in manual and wiki for concepts, workflow, metrics, settings, and API use.
- `/graph` - headless graph workspace for deterministic metric runs with selectable x/y axes.
- `/api/chat` - optional Anthropic-backed observer chat endpoint.
- `/api/research/run` - backend-only deterministic research run endpoint.

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

The lab starts idle. Review settings, then select `run` in the right research panel. Use `pause` to freeze the current state and `reset` to reinitialize the experiment using the current settings.

## Environment

The observer chat uses Anthropic when an API key is present:

```bash
ANTHROPIC_API_KEY=your_key_here
```

Without the key, the app still runs. The chat endpoint returns a safe fallback response, and the research lab, graph workspace, docs, and headless API remain usable.

## Scripts

```bash
npm run dev      # start local development server
npm run lint     # run ESLint
npm run build    # production build and TypeScript check
npm run start    # start a production server after build
```

## Headless Research API

`POST /api/research/run` accepts partial settings and returns deterministic data:

```json
{
  "durationMs": 60000,
  "sampleCount": 720,
  "research": {
    "mode": "deception",
    "seed": 1729,
    "environmentSpeed": 4,
    "maliciousStrategy": "infect",
    "infectionAwareness": "learnOverTime"
  },
  "physics": {
    "mode": "field"
  },
  "boids": {
    "speed": 2,
    "perception": 50
  }
}
```

The response includes:

- `dataset` - row-wise graph points with normalized metrics and raw telemetry.
- `series` - metric-wise arrays for plotting.
- `summary` - final values for the run.
- `researchNotes` - short interpretation notes.
- Effective `research`, `physics`, and `boids` configs after defaults are applied.

## Reproducibility

For formal experiments, record:

- Exported formal JSON from the right panel API tab.
- Data source: live recording, graph run, or backend API run.
- Seed, duration, sample count, research mode, physics mode, boids settings, adversary strategy, infection awareness, entropy settings, affect settings, and graph axes.
- Whether settings changed during a run. Mid-run changes should not be treated as one uninterrupted condition unless that interruption is part of the experimental design.

The graph workspace and backend endpoint run deterministic headless execution of the same agent loop used by the lab. They do not use decorative or hand-shaped curves.

## Scientific Scope And Limits

Murmur exposes controllable mathematical interaction kernels. It is useful for exploratory research, hypothesis generation, comparative runs, and visualization of multi-agent information dynamics.

It is not a validated physical simulator for a specific real-world domain by default. Field, rigid, and quantum-inspired modes use physically motivated terms, but any paper making domain-specific claims should validate the selected model against the target system.

Quantum mode should be described as quantum-inspired unless it has been independently validated for a specific physical interpretation.

## Project Structure

```text
app/                    Next.js routes, pages, and route handlers
components/             UI panels, graph controls, canvas, nav, help hints
hooks/useSimulation.ts  live run lifecycle and animation loop
lib/research.ts         communication, trust, infection, entropy, affect, telemetry
lib/physics.ts          advanced physics kernels
lib/headless.ts         deterministic backend/graph execution
lib/experiment.ts       formal JSON export schema
lib/simulation.ts       original boids model
lib/extractor.ts        snapshot and cluster extraction
```

## Verification Before Push

Run both commands before publishing:

```bash
npm run lint
npm run build
```

Both should pass without errors.

Credit: Based Off of S. Valine's murmur project and developed further by MN755 using Codex, Vercel, Cursor, Claude Code, Ollama, and of course, localhost. Thanks to them all. 
