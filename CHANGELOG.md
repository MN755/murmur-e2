# Changelog

## v1.01 - 2026-05-02

### Research Platform

- Converted the original swarm visualizer into a multi-agent research workbench with lab, docs, graph, and backend-only execution surfaces.
- Added a VS Code Abyss-inspired workbench layout with activity rail navigation, collapsible chat panel, and collapsible research panel.
- Added explicit lab run lifecycle controls: run, pause, and reset. The lab now starts idle and does not advance until a run is started.
- Added mid-run setting-change protection. Changing a setting during an active run pauses the experiment and asks whether to revert, apply and restart, or apply without restarting.
- Added formal experiment JSON export for research settings, physics settings, boids settings, schema version, timestamp, and reproducibility notes.

### Communication And Trust

- Added communication mode for local fragment broadcast, mutation, encode/decode-like transformation, lineage tracking, TTL, and reconstructability.
- Added topology telemetry for connected components, largest component, isolated agents, average degree, and bridge-like agents.
- Added consensus models: weighted trust, majority, Bayesian update, and confidence decay.
- Added entropy controls for global mutation pressure, packet drop, link failure, sensor noise, and key drift.

### Adversarial Dynamics

- Added adversarial strategies for corrupt, replay, trust-farm, isolate, and infect behavior.
- Added infection state with known, hidden, learn-over-time, and delayed-reveal awareness policies.
- Added deception mode where non-malicious agents can feed adversaries false fragments while preserving trusted communication.
- Added quarantine and suspicion telemetry.

### Agent Affect And Defense

- Added bounded affect state per agent: valence, arousal, fear, trust drive, curiosity, aggression, and cohesion.
- Added affect-driven consensus weighting, infection response, adversary avoidance, and blockade/containment behavior.
- Added affect telemetry for mean valence, mean arousal, mean fear, mean cohesion, and blockade-agent count.

### Physics And Headless Execution

- Added physics modes for boids, field, rigid, and quantum-inspired wave-field interaction.
- Added pairwise field forces, rigid collision response, restitution, friction, damping, gravity, spring, charge, solver iterations, wave interference, decoherence, tunneling, and entanglement-radius controls.
- Added deterministic headless execution in `lib/headless.ts`.
- Added backend-only endpoint `POST /api/research/run` for automated datasets, graph generation, AI-agent analysis, and batch tests.
- Updated graph workspace so it remains empty until the user explicitly runs the headless computation.

### Documentation

- Replaced the default Next.js README with project-specific usage, setup, API, reproducibility, and scientific-scope documentation.
- Expanded the in-app manual with workflow, graph semantics, physics scope, backend usage, run lifecycle, affect model, infection defense, measurement protocol, settings reference, entropy, and formal-export guidance.
