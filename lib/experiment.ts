import type { PhysicsConfig, ResearchConfig, RuleWeights } from "./types";

export interface FormalExperimentOptions {
  schema: "murmur.formal-experiment.v1";
  exportedAt: string;
  purpose: string;
  research: ResearchConfig;
  physics: PhysicsConfig;
  boids: RuleWeights;
  notes: string[];
}

export function buildFormalExperimentOptions({
  research,
  physics,
  boids,
}: {
  research: ResearchConfig;
  physics: PhysicsConfig;
  boids: RuleWeights;
}): FormalExperimentOptions {
  return {
    schema: "murmur.formal-experiment.v1",
    exportedAt: new Date().toISOString(),
    purpose:
      "Reproducible configuration for Murmur multi-agent communication, physics, adversary, entropy, and consensus experiments.",
    research,
    physics,
    boids,
    notes: [
      "Use seed, physics, boids, research, adversary, entropy, and graph settings together when reporting a run.",
      "Graph/headless results are deterministic for a fixed exported configuration and run duration.",
      "Quantum mode is a controllable wave/entanglement/tunneling-inspired interaction model, not a verified quantum mechanics simulator.",
    ],
  };
}
