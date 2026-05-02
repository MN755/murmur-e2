// lib/types.ts
// Canonical type definitions for Murmur.
// All modules import from this file. Do not redefine these locally.

export interface Agent {
  id: number;
  x: number; // position
  y: number;
  vx: number; // velocity
  vy: number;
}

export interface RuleWeights {
  separation: number; // 0..5,  default 1.5
  alignment: number; // 0..5,  default 1.0
  cohesion: number; // 0..5,  default 1.0
  speed: number; // 0.2..8, default 2.0  (max velocity)
  perception: number; // 10..250, default 50  (neighbor radius in px)
}

export interface Cluster {
  id: number; // stable within a single snapshot only
  centroid: { x: number; y: number };
  size: number; // agent count
  avgVelocity: number; // magnitude
  agentIds: number[]; // which agents belong to this cluster
}

export interface SimSnapshot {
  timestamp: number; // ms since epoch
  agentCount: number;
  clusterCount: number;
  clusters: Cluster[];
  outlierCount: number; // agents not in any cluster
  /** Mean velocity magnitude across all agents (§4.4 snapshot context). */
  averageVelocity: number;
  velocityVariance: number;
  dominantDirection: number; // radians, average heading
  delta: {
    clusterCountDelta: number; // vs previous snapshot
    avgVelocityDelta: number;
    timeSinceLastChange: number; // ms since clusterCount last changed
  };
  currentRules: RuleWeights;
}

export interface ClaudeResponse {
  message: string; // always present
  rule_update: Partial<RuleWeights> | null; // null if no change
  highlight_cluster: number | null; // cluster id from snapshot
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export type PhysicsMode = "boids" | "field" | "rigid" | "quantum";

export interface PhysicsConfig {
  mode: PhysicsMode;
  agentRadius: number;
  mass: number;
  damping: number;
  restitution: number;
  friction: number;
  gravity: number;
  chargeStrength: number;
  springStrength: number;
  solverIterations: number;
  quantumTunneling: number;
  quantumDecoherence: number;
  waveInterference: number;
  entanglementRadius: number;
}

export type ResearchMode =
  | "communication"
  | "collision"
  | "exclusion"
  | "deception";

export type MaliciousStrategy =
  | "corrupt"
  | "replay"
  | "trustFarm"
  | "isolate"
  | "infect";

export type InfectionAwarenessMode =
  | "known"
  | "hidden"
  | "learnOverTime"
  | "delayedReveal";

export type ConsensusRule =
  | "weightedTrust"
  | "majority"
  | "bayesian"
  | "confidenceDecay";

export interface ResearchConfig {
  enabled: boolean;
  mode: ResearchMode;
  seed: number;
  environmentSpeed: number;
  communicationRadius: number;
  broadcastIntervalMs: number;
  packetsPerAgent: number;
  packetTtl: number;
  mutationBias: number;
  entropyRate: number;
  packetDropRate: number;
  sensorNoise: number;
  keyDriftRate: number;
  linkFailureRate: number;
  collisionCoupling: number;
  maliciousAgentCount: number;
  maliciousStrategy: MaliciousStrategy;
  infectionRate: number;
  infectionAwareness: InfectionAwarenessMode;
  infectionDelayMs: number;
  suspicionThreshold: number;
  consensusRule: ConsensusRule;
  consensusWeight: number;
  emotionEnabled: boolean;
  emotionPlasticity: number;
  fearContagion: number;
  cohesionDrive: number;
  adversaryAvoidance: number;
  blockadeStrength: number;
}

export interface InformationFragment {
  id: number;
  parentId: number | null;
  originAgentId: number;
  sourceAgentId: number;
  value: number;
  originalHash: number;
  hops: number;
  ttl: number;
  lineageHash: number;
  believedEncoded: boolean;
  lastCarrierId: number;
}

export interface AgentResearchState {
  agentId: number;
  key: number;
  malicious: boolean;
  suspicion: number;
  trust: number;
  belief: number;
  confidence: number;
  infected: boolean;
  infectionKnown: boolean;
  infectionLoad: number;
  infectionSourceId: number | null;
  infectionDiscoveredAt: number | null;
  memory: InformationFragment[];
  knownOrigins: number;
  lastContactAt: number;
  falseFragmentsSent: number;
  emotion: AgentEmotionState;
}

export interface AgentEmotionState {
  valence: number;
  arousal: number;
  fear: number;
  trustDrive: number;
  curiosity: number;
  aggression: number;
  cohesion: number;
}

export interface TopologyTelemetry {
  componentCount: number;
  largestComponentSize: number;
  isolatedAgents: number;
  averageDegree: number;
  bridgeAgentCount: number;
}

export interface LineageTelemetry {
  rootCount: number;
  branchCount: number;
  maxDepth: number;
  averageVariantsPerOrigin: number;
  reconstructability: number;
}

export interface ConsensusTelemetry {
  meanBelief: number;
  beliefVariance: number;
  meanConfidence: number;
  polarizedAgents: number;
  convergence: number;
}

export interface EmotionTelemetry {
  meanValence: number;
  meanArousal: number;
  meanFear: number;
  meanCohesion: number;
  blockadeAgents: number;
}

export interface ResearchTelemetry {
  mode: ResearchMode;
  simTime: number;
  activeFragments: number;
  uniqueOrigins: number;
  linkCount: number;
  averageHops: number;
  averageSuspicion: number;
  maliciousKnownCount: number;
  quarantineCount: number;
  falseSignalCount: number;
  recoveredAgents: number;
  infectedCount: number;
  knownInfectedCount: number;
  avoidedAdversaryContacts: number;
  emotion: EmotionTelemetry;
  topology: TopologyTelemetry;
  lineage: LineageTelemetry;
  consensus: ConsensusTelemetry;
}

export interface ExperimentFrame {
  index: number;
  simTime: number;
  config: ResearchConfig;
  telemetry: ResearchTelemetry;
}

export interface ExperimentRecorderState {
  isRecording: boolean;
  isReplaying: boolean;
  replayIndex: number;
  frames: ExperimentFrame[];
}
