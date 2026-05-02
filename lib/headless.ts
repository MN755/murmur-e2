import {
  DEFAULT_PHYSICS_CONFIG,
  tickAdvancedPhysics,
} from "./physics";
import {
  DEFAULT_RESEARCH_CONFIG,
  createResearchRuntime,
  createSeededRandom,
  initResearchStates,
  stepResearch,
} from "./research";
import { DEFAULT_RULES, initAgents, tick } from "./simulation";
import type { ProjectionMetric } from "./projection";
import type {
  AgentResearchState,
  PhysicsConfig,
  ResearchConfig,
  ResearchTelemetry,
  RuleWeights,
} from "./types";

const WIDTH = 1200;
const HEIGHT = 800;
const AGENT_COUNT = 200;

const METRICS: ProjectionMetric[] = [
  "collectiveTrust",
  "adversaryTrust",
  "adversaryBelief",
  "contentVolume",
  "movementNearAdversary",
  "connectedness",
  "recoverability",
  "infected",
  "knownInfected",
  "entropy",
  "meanFear",
  "meanCohesion",
  "blockade",
];

export interface HeadlessPoint {
  t: number;
  simTime: number;
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
  telemetry: ResearchTelemetry;
}

export interface HeadlessRunResult {
  research: ResearchConfig;
  physics: PhysicsConfig;
  boids: RuleWeights;
  durationMs: number;
  sampleCount: number;
  dataset: HeadlessPoint[];
  series: Record<ProjectionMetric, number[]>;
  summary: Record<string, number | string>;
  researchNotes: string[];
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function pointFromTelemetry(
  telemetry: ResearchTelemetry,
  states: AgentResearchState[],
  t: number,
  research: ResearchConfig,
): HeadlessPoint {
  const adversaries = states.filter((s) => s.malicious);
  const nonAdversaries = states.filter((s) => !s.malicious);
  const adversaryTrust =
    adversaries.length === 0
      ? 0
      : adversaries.reduce((acc, s) => acc + s.trust, 0) / adversaries.length;
  const adversaryBelief =
    adversaries.length === 0
      ? 0
      : adversaries.reduce((acc, s) => acc + s.belief, 0) / adversaries.length;
  const collectiveTrust =
    nonAdversaries.length === 0
      ? 0
      : nonAdversaries.reduce((acc, s) => acc + s.trust, 0) / nonAdversaries.length;

  return {
    t,
    simTime: telemetry.simTime,
    collectiveTrust: clamp01(collectiveTrust),
    adversaryTrust: clamp01(adversaryTrust),
    adversaryBelief: clamp01(adversaryBelief),
    contentVolume: clamp01(telemetry.activeFragments / 7200),
    movementNearAdversary: clamp01(telemetry.avoidedAdversaryContacts / Math.max(1, nonAdversaries.length)),
    connectedness: clamp01(telemetry.topology.largestComponentSize / Math.max(1, states.length)),
    recoverability: telemetry.lineage.reconstructability,
    infected: clamp01(telemetry.infectedCount / Math.max(1, states.length)),
    knownInfected: clamp01(telemetry.knownInfectedCount / Math.max(1, states.length)),
    entropy: clamp01(
      research.entropyRate * 0.4 +
        research.packetDropRate * 0.2 +
        research.linkFailureRate * 0.2 +
        research.keyDriftRate * 0.2,
    ),
    meanFear: clamp01(telemetry.emotion.meanFear),
    meanCohesion: clamp01(telemetry.emotion.meanCohesion),
    blockade: clamp01(telemetry.emotion.blockadeAgents / Math.max(1, states.length)),
    telemetry,
  };
}

export function runHeadlessResearch({
  research: researchInput = {},
  physics: physicsInput = {},
  boids: boidsInput = {},
  durationMs = 60000,
  sampleCount = 720,
}: {
  research?: Partial<ResearchConfig>;
  physics?: Partial<PhysicsConfig>;
  boids?: Partial<RuleWeights>;
  durationMs?: number;
  sampleCount?: number;
} = {}): HeadlessRunResult {
  const research: ResearchConfig = { ...DEFAULT_RESEARCH_CONFIG, ...researchInput };
  const physics: PhysicsConfig = { ...DEFAULT_PHYSICS_CONFIG, ...physicsInput };
  const boids: RuleWeights = { ...DEFAULT_RULES, ...boidsInput };
  const safeDuration = Math.max(1000, Math.min(30 * 60 * 1000, Math.floor(durationMs)));
  const safeSamples = Math.max(60, Math.min(4000, Math.floor(sampleCount)));
  const random = createSeededRandom(research.seed);
  const agents = initAgents(AGENT_COUNT, WIDTH, HEIGHT, random);
  const states = initResearchStates(AGENT_COUNT, research.maliciousAgentCount, research.seed);
  const runtime = createResearchRuntime();
  const dataset: HeadlessPoint[] = [];
  const dt = safeDuration / safeSamples;
  let simTime = 0;
  let lastTelemetry: ResearchTelemetry | null = null;

  for (let i = 0; i < safeSamples; i++) {
    const substeps = Math.max(1, Math.min(24, Math.ceil(research.environmentSpeed)));
    for (let s = 0; s < substeps; s++) {
      if (physics.mode === "boids") {
        tick(agents, boids, WIDTH, HEIGHT);
      } else {
        tickAdvancedPhysics(agents, states, physics, WIDTH, HEIGHT, research);
      }
      simTime += (dt * research.environmentSpeed) / substeps;
      lastTelemetry = stepResearch(agents, states, research, runtime, simTime);
    }

    const telemetry = lastTelemetry ?? stepResearch(agents, states, research, runtime, simTime);
    dataset.push(pointFromTelemetry(telemetry, states, i / Math.max(1, safeSamples - 1), research));
  }

  const last = dataset[dataset.length - 1]!;
  const series = Object.fromEntries(
    METRICS.map((metric) => [metric, dataset.map((point) => point[metric])]),
  ) as Record<ProjectionMetric, number[]>;

  return {
    research,
    physics,
    boids,
    durationMs: safeDuration,
    sampleCount: safeSamples,
    dataset,
    series,
    summary: {
      mode: research.mode,
      physicsMode: physics.mode,
      maliciousStrategy: research.maliciousStrategy,
      finalCollectiveTrust: last.collectiveTrust,
      finalAdversaryTrust: last.adversaryTrust,
      finalAdversaryBelief: last.adversaryBelief,
      finalContentVolume: last.contentVolume,
      finalMovementNearAdversary: last.movementNearAdversary,
      finalConnectedness: last.connectedness,
      finalRecoverability: last.recoverability,
      finalInfected: last.infected,
      finalKnownInfected: last.knownInfected,
      finalMeanFear: last.meanFear,
      finalMeanCohesion: last.meanCohesion,
      finalBlockade: last.blockade,
    },
    researchNotes: [
      "Dataset was produced by deterministic headless execution of the agent loop.",
      `Duration ${safeDuration}ms sampled into ${safeSamples} points.`,
      `Physics mode ${physics.mode}; research mode ${research.mode}; adversary strategy ${research.maliciousStrategy}.`,
      "The dataset contains normalized plotting metrics plus raw telemetry per sample.",
    ],
  };
}
