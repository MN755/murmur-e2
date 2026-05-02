import type { ResearchConfig } from "./types";

export type ProjectionMetric =
  | "collectiveTrust"
  | "adversaryTrust"
  | "adversaryBelief"
  | "contentVolume"
  | "movementNearAdversary"
  | "connectedness"
  | "recoverability"
  | "infected"
  | "knownInfected"
  | "entropy"
  | "meanFear"
  | "meanCohesion"
  | "blockade";

export interface ProjectionPoint {
  t: number;
  collectiveTrust: number;
  adversaryTrust: number;
  adversaryBelief: number;
  contentVolume: number;
  movementNearAdversary: number;
  connectedness: number;
  recoverability: number;
  infected: number;
  knownInfected: number;
  entropy: number;
  meanFear: number;
  meanCohesion: number;
  blockade: number;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function modeFactor(config: ResearchConfig): number {
  switch (config.mode) {
    case "deception":
      return 0.82;
    case "exclusion":
      return 0.72;
    case "collision":
      return 0.58;
    case "communication":
    default:
      return 0.66;
  }
}

function strategyPressure(config: ResearchConfig): number {
  switch (config.maliciousStrategy) {
    case "trustFarm":
      return 0.42;
    case "replay":
      return 0.55;
    case "isolate":
      return 0.68;
    case "infect":
      return 0.86;
    case "corrupt":
    default:
      return 0.76;
  }
}

export function projectResearch(config: ResearchConfig, steps = 96): ProjectionPoint[] {
  const out: ProjectionPoint[] = [];
  const radius = clamp01((config.communicationRadius - 30) / 190);
  const cadence = clamp01(1 - (config.broadcastIntervalMs - 150) / 1650);
  const mutation = clamp01(config.mutationBias);
  const adversaryLoad = clamp01(config.maliciousAgentCount / 8);
  const consensus = clamp01(config.consensusWeight);
  const topologyBase = clamp01(radius * 0.72 + cadence * 0.28 - config.collisionCoupling * 0.18);
  const pressure = strategyPressure(config) * adversaryLoad;
  const mode = modeFactor(config);

  let collectiveTrust = clamp01(0.7 - pressure * 0.18);
  let adversaryTrust = config.maliciousStrategy === "trustFarm" ? 0.72 : 0.46;
  let adversaryBelief = 0.5;
  let contentVolume = clamp01(0.22 + cadence * 0.3 + radius * 0.24);
  let movementNearAdversary = clamp01(0.18 + config.collisionCoupling * 0.45 + adversaryLoad * 0.2);
  let connectedness = topologyBase;
  let recoverability = clamp01(0.86 - mutation * 0.36 - pressure * 0.18);

  for (let i = 0; i < steps; i++) {
    const t = i / Math.max(1, steps - 1);
    const wave = Math.sin((t * 7 + config.seed * 0.001) * Math.PI) * 0.025;
    const detection = clamp01(t * (config.suspicionThreshold < 0.7 ? 1.25 : 0.82) * mode);
    const deceptionGain = config.mode === "deception" ? detection * 0.2 : 0;
    const exclusionGain = config.mode === "exclusion" ? detection * 0.16 : 0;

    connectedness = clamp01(
      topologyBase - config.collisionCoupling * t * 0.16 - pressure * 0.08 + wave,
    );
    contentVolume = clamp01(
      contentVolume + cadence * 0.014 + radius * 0.009 - mutation * 0.006 - detection * 0.003,
    );
    collectiveTrust = clamp01(
      collectiveTrust +
        consensus * connectedness * 0.018 -
        pressure * mutation * 0.012 +
        exclusionGain * 0.01 +
        deceptionGain * 0.008,
    );
    adversaryTrust = clamp01(
      adversaryTrust +
        (config.maliciousStrategy === "trustFarm" && t < 0.36 ? 0.012 : -detection * 0.018) -
        exclusionGain * 0.012,
    );
    adversaryBelief = clamp01(
      adversaryBelief +
        pressure * 0.008 -
        (config.mode === "deception" ? detection * 0.02 : detection * 0.004),
    );
    movementNearAdversary = clamp01(
      movementNearAdversary +
        config.collisionCoupling * 0.012 +
        pressure * 0.006 -
        detection * 0.005,
    );
    recoverability = clamp01(
      recoverability +
        connectedness * 0.008 -
        mutation * contentVolume * 0.013 -
        pressure * 0.004 +
        deceptionGain * 0.008,
    );

    out.push({
      t,
      collectiveTrust,
      adversaryTrust,
      adversaryBelief,
      contentVolume,
      movementNearAdversary,
      connectedness,
      recoverability,
      infected: clamp01(adversaryLoad * t * (config.maliciousStrategy === "infect" ? 1 : 0.18)),
      knownInfected: clamp01(adversaryLoad * t * detection),
      entropy: clamp01(
        config.entropyRate * 0.4 +
          config.packetDropRate * 0.2 +
          config.linkFailureRate * 0.2 +
          config.keyDriftRate * 0.2,
      ),
      meanFear: clamp01(pressure * detection + config.fearContagion * 0.25),
      meanCohesion: clamp01(config.cohesionDrive * (0.35 + detection * 0.65)),
      blockade: clamp01(config.blockadeStrength * detection * adversaryLoad),
    });
  }

  return out;
}
