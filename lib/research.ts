import type {
  Agent,
  AgentResearchState,
  InformationFragment,
  ResearchConfig,
  ResearchTelemetry,
  TopologyTelemetry,
} from "./types";

const MEMORY_CAP = 48;
const MAX_CONTACTS_PER_AGENT = 10;
const MAX_LINEAGE_EVENTS = 6000;
const MALICIOUS_DISTORTION = 0x9e3779b9;

export const DEFAULT_RESEARCH_CONFIG: ResearchConfig = {
  enabled: true,
  mode: "communication",
  seed: 1729,
  environmentSpeed: 1,
  communicationRadius: 90,
  broadcastIntervalMs: 700,
  packetsPerAgent: 2,
  packetTtl: 9,
  mutationBias: 0.55,
  entropyRate: 0.08,
  packetDropRate: 0.02,
  sensorNoise: 0.04,
  keyDriftRate: 0,
  linkFailureRate: 0.02,
  collisionCoupling: 0.35,
  maliciousAgentCount: 1,
  maliciousStrategy: "corrupt",
  infectionRate: 0.45,
  infectionAwareness: "learnOverTime",
  infectionDelayMs: 6500,
  suspicionThreshold: 0.68,
  consensusRule: "weightedTrust",
  consensusWeight: 0.32,
  emotionEnabled: true,
  emotionPlasticity: 0.34,
  fearContagion: 0.24,
  cohesionDrive: 0.42,
  adversaryAvoidance: 0.72,
  blockadeStrength: 0.38,
};

export interface LineageEvent {
  fragmentId: number;
  parentId: number | null;
  originAgentId: number;
  senderId: number;
  receiverId: number;
  lineageHash: number;
  value: number;
  hop: number;
  simTime: number;
}

export interface ResearchRuntime {
  lastBroadcastAt: number;
  nextFragmentId: number;
  previousContactedAgents: Set<number>;
  recoveredAgents: number;
  lineageEvents: LineageEvent[];
  lastTopology: TopologyTelemetry;
}

export function u32(n: number): number {
  return n >>> 0;
}

export function mix32(n: number): number {
  let x = u32(n);
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b);
  x ^= x >>> 16;
  return u32(x);
}

export function createSeededRandom(seed: number): () => number {
  let state = mix32(seed || 1);
  return () => {
    state = u32(state + 0x6d2b79f5);
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function emptyTopology(): TopologyTelemetry {
  return {
    componentCount: 0,
    largestComponentSize: 0,
    isolatedAgents: 0,
    averageDegree: 0,
    bridgeAgentCount: 0,
  };
}

export function createResearchRuntime(): ResearchRuntime {
  return {
    lastBroadcastAt: 0,
    nextFragmentId: 1,
    previousContactedAgents: new Set(),
    recoveredAgents: 0,
    lineageEvents: [],
    lastTopology: emptyTopology(),
  };
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function shouldDecode(agent: AgentResearchState, fragment: InformationFragment): boolean {
  const coin = mix32(agent.key ^ fragment.lineageHash ^ Math.imul(fragment.hops + 1, 2654435761));
  return (coin & 1) === 0;
}

function adversarialValue(
  sender: AgentResearchState,
  receiver: AgentResearchState,
  fragment: InformationFragment,
  value: number,
  config: ResearchConfig,
): number {
  if (!sender.malicious && !receiver.malicious) return value;

  switch (config.maliciousStrategy) {
    case "replay":
      return fragment.value;
    case "trustFarm":
      return sender.suspicion < 0.35 ? fragment.value : mix32(value ^ MALICIOUS_DISTORTION);
    case "isolate":
      return receiver.knownOrigins < 2 ? mix32(value ^ receiver.key) : value;
    case "infect":
      return receiver.infected ? mix32(value ^ receiver.key ^ MALICIOUS_DISTORTION) : value;
    case "corrupt":
    default:
      return mix32(value ^ MALICIOUS_DISTORTION ^ sender.key);
  }
}

function transformFragment(
  sender: AgentResearchState,
  receiver: AgentResearchState,
  fragment: InformationFragment,
  config: ResearchConfig,
  runtime: ResearchRuntime,
  now: number,
): InformationFragment {
  const decode = shouldDecode(receiver, fragment);
  const keyStream = mix32(receiver.key ^ fragment.lineageHash ^ fragment.id);
  const entropyMask = mix32(keyStream ^ Math.round(config.entropyRate * 10000));
  const biasedMutation = mix32(keyStream ^ Math.round((config.mutationBias + config.entropyRate) * 1000)) % 1000;
  const mutationMask =
    biasedMutation < Math.round(config.mutationBias * 1000)
      ? keyStream
      : mix32(keyStream ^ receiver.agentId);

  let value = u32(fragment.value ^ mutationMask ^ (entropyMask & Math.round(config.entropyRate * 0xffff)));
  value = adversarialValue(sender, receiver, fragment, value, config);

  const next: InformationFragment = {
    id: runtime.nextFragmentId++,
    parentId: fragment.id,
    originAgentId: fragment.originAgentId,
    sourceAgentId: sender.agentId,
    value,
    originalHash: fragment.originalHash,
    hops: fragment.hops + 1,
    ttl: fragment.ttl - 1,
    lineageHash: mix32(fragment.lineageHash ^ value ^ receiver.key),
    believedEncoded: decode ? !fragment.believedEncoded : fragment.believedEncoded,
    lastCarrierId: receiver.agentId,
  };

  runtime.lineageEvents.push({
    fragmentId: next.id,
    parentId: fragment.id,
    originAgentId: next.originAgentId,
    senderId: sender.agentId,
    receiverId: receiver.agentId,
    lineageHash: next.lineageHash,
    value: next.value,
    hop: next.hops,
    simTime: now,
  });
  if (runtime.lineageEvents.length > MAX_LINEAGE_EVENTS) {
    runtime.lineageEvents.splice(0, runtime.lineageEvents.length - MAX_LINEAGE_EVENTS);
  }

  return next;
}

function fragmentSignature(fragment: InformationFragment): string {
  return `${fragment.originAgentId}:${fragment.value}:${fragment.lineageHash}`;
}

function rememberFragment(agent: AgentResearchState, fragment: InformationFragment): boolean {
  if (fragment.ttl <= 0) return false;
  const sig = fragmentSignature(fragment);
  if (agent.memory.some((m) => fragmentSignature(m) === sig)) return false;

  agent.memory.push(fragment);
  if (agent.memory.length > MEMORY_CAP) {
    agent.memory.sort((a, b) => b.ttl - a.ttl || a.hops - b.hops);
    agent.memory.length = MEMORY_CAP;
  }

  agent.knownOrigins = new Set(agent.memory.map((m) => m.originAgentId)).size;
  return true;
}

function seedFragment(
  agent: AgentResearchState,
  runtime: ResearchRuntime,
  config: ResearchConfig,
  now: number,
): void {
  const id = runtime.nextFragmentId++;
  const value = mix32(agent.key ^ id ^ Math.floor(now) ^ config.seed);
  const fragment: InformationFragment = {
    id,
    parentId: null,
    originAgentId: agent.agentId,
    sourceAgentId: agent.agentId,
    value,
    originalHash: mix32(value),
    hops: 0,
    ttl: config.packetTtl,
    lineageHash: mix32(value ^ agent.key),
    believedEncoded: false,
    lastCarrierId: agent.agentId,
  };

  runtime.lineageEvents.push({
    fragmentId: id,
    parentId: null,
    originAgentId: agent.agentId,
    senderId: agent.agentId,
    receiverId: agent.agentId,
    lineageHash: fragment.lineageHash,
    value,
    hop: 0,
    simTime: now,
  });
  rememberFragment(agent, fragment);
}

function distSq(a: Agent, b: Agent): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function syncMaliciousAgents(states: AgentResearchState[], count: number): void {
  const target = Math.max(0, Math.min(states.length, Math.floor(count)));
  const ranked = [...states].sort((a, b) => b.key - a.key);
  const maliciousIds = new Set(ranked.slice(0, target).map((s) => s.agentId));
  for (const state of states) {
    state.malicious = maliciousIds.has(state.agentId);
  }
}

function nearestAgents(
  agents: Agent[],
  idx: number,
  radius: number,
): { index: number; d2: number }[] {
  const radiusSq = radius * radius;
  const out: { index: number; d2: number }[] = [];
  const source = agents[idx]!;
  for (let j = 0; j < agents.length; j++) {
    if (j === idx) continue;
    const d2 = distSq(source, agents[j]!);
    if (d2 <= radiusSq) out.push({ index: j, d2 });
  }
  out.sort((a, b) => a.d2 - b.d2);
  return out.slice(0, MAX_CONTACTS_PER_AGENT);
}

function updateSuspicion(
  sender: AgentResearchState,
  receiver: AgentResearchState,
  accepted: boolean,
  config: ResearchConfig,
): void {
  if (config.mode !== "exclusion" && config.mode !== "deception") return;

  const repeatedOriginDivergence = receiver.memory.some((m) =>
    sender.memory.some(
      (s) =>
        s.originAgentId === m.originAgentId &&
        s.value !== m.value &&
        Math.abs(s.hops - m.hops) <= 2,
    ),
  );

  const strategicPenalty =
    config.maliciousStrategy === "trustFarm" && sender.suspicion < 0.35 ? 0.02 : 0.06;
  const suspicionDelta =
    sender.malicious || repeatedOriginDivergence || !accepted ? strategicPenalty : -0.015;
  sender.suspicion = clamp01(sender.suspicion + suspicionDelta);
  sender.trust = clamp01(1 - sender.suspicion);
}

function updateEmotionOnContact(
  sender: AgentResearchState,
  receiver: AgentResearchState,
  accepted: boolean,
  config: ResearchConfig,
): void {
  if (!config.emotionEnabled) return;

  const plasticity = config.emotionPlasticity;
  const threatVisible =
    sender.malicious ||
    sender.infectionKnown ||
    sender.suspicion >= config.suspicionThreshold ||
    receiver.infectionKnown;
  const evidenceCost = accepted ? 0 : 0.12;
  const threatSignal = clamp01(
    (threatVisible ? 0.55 : 0) +
      sender.suspicion * 0.35 +
      sender.infectionLoad * 0.25 +
      evidenceCost,
  );
  const peerSafety = clamp01(sender.trust * sender.confidence * (accepted ? 1 : 0.55));

  receiver.emotion.fear = clamp01(
    receiver.emotion.fear +
      (threatSignal - receiver.emotion.fear) * plasticity * (0.08 + config.fearContagion * 0.22),
  );
  receiver.emotion.arousal = clamp01(
    receiver.emotion.arousal + (Math.max(threatSignal, 1 - peerSafety) - receiver.emotion.arousal) * plasticity * 0.08,
  );
  receiver.emotion.valence = clamp01(
    receiver.emotion.valence + (peerSafety - threatSignal - receiver.emotion.valence + 0.5) * plasticity * 0.035,
  );
  receiver.emotion.trustDrive = clamp01(
    receiver.emotion.trustDrive + (peerSafety - receiver.emotion.trustDrive) * plasticity * 0.07,
  );
  receiver.emotion.curiosity = clamp01(
    receiver.emotion.curiosity + ((accepted ? 0.58 : 0.24) - receiver.emotion.curiosity) * plasticity * 0.05,
  );
  receiver.emotion.aggression = clamp01(
    receiver.emotion.aggression +
      (threatVisible ? threatSignal : 0.08 - receiver.emotion.aggression) * plasticity * 0.045,
  );
  receiver.emotion.cohesion = clamp01(
    receiver.emotion.cohesion +
      ((threatVisible ? config.cohesionDrive : peerSafety) - receiver.emotion.cohesion) * plasticity * 0.075,
  );
}

function exposeInfection(
  agent: AgentResearchState,
  source: AgentResearchState,
  config: ResearchConfig,
  simTime: number,
): void {
  if (agent.malicious || agent.infected) return;
  const chance = mix32(agent.key ^ source.key ^ Math.floor(simTime / 100)) % 1000;
  if (chance >= Math.round(config.infectionRate * 1000)) return;

  agent.infected = true;
  agent.infectionSourceId = source.agentId;
  agent.infectionDiscoveredAt = simTime + config.infectionDelayMs;
  agent.infectionLoad = Math.max(agent.infectionLoad, 0.2);

  if (config.infectionAwareness === "known") {
    agent.infectionKnown = true;
    agent.suspicion = Math.max(agent.suspicion, 0.55);
  } else if (config.infectionAwareness === "hidden") {
    agent.infectionKnown = false;
  }
}

function updateInfectionAwareness(states: AgentResearchState[], config: ResearchConfig, simTime: number): void {
  for (const state of states) {
    if (!state.infected) continue;
    state.infectionLoad = clamp01(state.infectionLoad + 0.012);
    state.belief = clamp01(state.belief + (0.08 - state.belief) * state.infectionLoad * 0.015);
    state.trust = clamp01(state.trust - state.infectionLoad * 0.006);
    state.confidence = clamp01(state.confidence - state.infectionLoad * 0.004);
    if (config.emotionEnabled) {
      state.emotion.arousal = clamp01(state.emotion.arousal + state.infectionLoad * 0.006);
      state.emotion.valence = clamp01(state.emotion.valence - state.infectionLoad * 0.004);
    }

    if (config.infectionAwareness === "learnOverTime" && state.infectionLoad > 0.65) {
      state.infectionKnown = true;
    }
    if (
      config.infectionAwareness === "delayedReveal" &&
      state.infectionDiscoveredAt !== null &&
      simTime >= state.infectionDiscoveredAt
    ) {
      state.infectionKnown = true;
    }
    if (state.infectionKnown) {
      state.suspicion = clamp01(state.suspicion + 0.025);
      if (config.emotionEnabled) {
        state.emotion.fear = clamp01(state.emotion.fear + config.fearContagion * 0.018);
        state.emotion.cohesion = clamp01(state.emotion.cohesion + config.cohesionDrive * 0.012);
      }
    }
  }
}

function chooseFragments(agent: AgentResearchState, count: number): InformationFragment[] {
  return [...agent.memory]
    .sort((a, b) => b.ttl - a.ttl || a.hops - b.hops)
    .slice(0, Math.max(1, count));
}

function updateConsensus(
  sender: AgentResearchState,
  receiver: AgentResearchState,
  config: ResearchConfig,
): void {
  const weight = config.consensusWeight;
  const infectedPenalty = sender.infected && !sender.infectionKnown ? 0.55 : 1;
  const emotionWeight = config.emotionEnabled
    ? clamp01(0.35 + receiver.emotion.trustDrive * 0.45 + receiver.emotion.curiosity * 0.2 - receiver.emotion.fear * 0.35)
    : 1;
  const trustWeight = (config.consensusRule === "weightedTrust" ? sender.trust : 1) * infectedPenalty;
  const influence = clamp01(weight * trustWeight * receiver.confidence * emotionWeight);
  const senderBelief = sender.belief;
  const receiverBelief = receiver.belief;

  switch (config.consensusRule) {
    case "majority":
      receiver.belief = receiverBelief + (senderBelief >= 0.5 ? influence : -influence) * 0.15;
      break;
    case "bayesian": {
      const prior = clamp01(receiverBelief);
      const evidence = clamp01(senderBelief);
      const likelihood = prior * evidence;
      const inverse = (1 - prior) * (1 - evidence);
      receiver.belief = likelihood + inverse === 0 ? prior : likelihood / (likelihood + inverse);
      receiver.belief = receiverBelief + (receiver.belief - receiverBelief) * influence;
      break;
    }
    case "confidenceDecay":
      receiver.confidence = clamp01(receiver.confidence * 0.985 + sender.confidence * influence * 0.08);
      receiver.belief = receiverBelief + (senderBelief - receiverBelief) * influence * 0.5;
      break;
    case "weightedTrust":
    default:
      receiver.belief = receiverBelief + (senderBelief - receiverBelief) * influence;
      receiver.confidence = clamp01(receiver.confidence + (sender.confidence - receiver.confidence) * influence * 0.2);
      break;
  }

  receiver.belief = clamp01(receiver.belief);
}

function applyCollisionField(
  agents: Agent[],
  states: AgentResearchState[],
  config: ResearchConfig,
): void {
  if (config.mode !== "collision") return;

  const radius = config.communicationRadius;
  const radiusSq = radius * radius;
  const coupling = config.collisionCoupling * 0.018;

  for (let i = 0; i < agents.length; i++) {
    const a = agents[i]!;
    const sa = states[i]!;
    for (let j = i + 1; j < agents.length; j++) {
      const b = agents[j]!;
      const dX = b.x - a.x;
      const dY = b.y - a.y;
      const d2 = dX * dX + dY * dY;
      if (d2 <= 0.0001 || d2 > radiusSq) continue;

      const sb = states[j]!;
      const d = Math.sqrt(d2);
      const nx = dX / d;
      const ny = dY / d;
      const phase = Math.sin((sa.key ^ sb.key) * 0.000001 + d * 0.07);
      const potential = coupling * (1 / Math.max(12, d) - 1 / radius) * (phase >= 0 ? 1 : -1);
      const impulse = Math.max(-0.035, Math.min(0.035, potential * radius));

      a.vx -= nx * impulse;
      a.vy -= ny * impulse;
      b.vx += nx * impulse;
      b.vy += ny * impulse;
    }
  }
}

function computeTopology(agentCount: number, contacts: Map<number, Set<number>>): TopologyTelemetry {
  const seen = new Set<number>();
  let componentCount = 0;
  let largestComponentSize = 0;
  let isolatedAgents = 0;
  let degreeSum = 0;
  let bridgeAgentCount = 0;

  for (let i = 0; i < agentCount; i++) {
    const degree = contacts.get(i)?.size ?? 0;
    degreeSum += degree;
    if (degree === 0) isolatedAgents++;
    if (degree <= 2 && degree > 0) bridgeAgentCount++;
    if (seen.has(i)) continue;

    componentCount++;
    let size = 0;
    const stack = [i];
    seen.add(i);
    while (stack.length > 0) {
      const current = stack.pop()!;
      size++;
      for (const next of contacts.get(current) ?? []) {
        if (!seen.has(next)) {
          seen.add(next);
          stack.push(next);
        }
      }
    }
    largestComponentSize = Math.max(largestComponentSize, size);
  }

  return {
    componentCount,
    largestComponentSize,
    isolatedAgents,
    averageDegree: agentCount === 0 ? 0 : degreeSum / agentCount,
    bridgeAgentCount,
  };
}

function computeTelemetry(
  states: AgentResearchState[],
  linkCount: number,
  mode: ResearchConfig["mode"],
  threshold: number,
  recoveredAgents: number,
  topology: TopologyTelemetry,
  runtime: ResearchRuntime,
  simTime: number,
): ResearchTelemetry {
  let activeFragments = 0;
  let hops = 0;
  let suspicion = 0;
  let falseSignals = 0;
  let infectedCount = 0;
  let knownInfectedCount = 0;
  let beliefSum = 0;
  let confidenceSum = 0;
  let valenceSum = 0;
  let arousalSum = 0;
  let fearSum = 0;
  let cohesionSum = 0;
  let blockadeAgents = 0;
  const origins = new Set<number>();
  const variantsByOrigin = new Map<number, Set<number>>();

  for (const state of states) {
    activeFragments += state.memory.length;
    suspicion += state.suspicion;
    falseSignals += state.falseFragmentsSent;
    if (state.infected) infectedCount++;
    if (state.infectionKnown) knownInfectedCount++;
    beliefSum += state.belief;
    confidenceSum += state.confidence;
    valenceSum += state.emotion.valence;
    arousalSum += state.emotion.arousal;
    fearSum += state.emotion.fear;
    cohesionSum += state.emotion.cohesion;
    if (!state.malicious && state.emotion.fear > 0.45 && state.emotion.cohesion > 0.45) {
      blockadeAgents++;
    }
    for (const fragment of state.memory) {
      origins.add(fragment.originAgentId);
      hops += fragment.hops;
      let variants = variantsByOrigin.get(fragment.originAgentId);
      if (!variants) {
        variants = new Set();
        variantsByOrigin.set(fragment.originAgentId, variants);
      }
      variants.add(fragment.value);
    }
  }

  const meanBelief = states.length === 0 ? 0 : beliefSum / states.length;
  const beliefVariance =
    states.length === 0
      ? 0
      : states.reduce((acc, s) => acc + (s.belief - meanBelief) ** 2, 0) / states.length;
  const meanConfidence = states.length === 0 ? 0 : confidenceSum / states.length;
  const polarizedAgents = states.filter((s) => s.belief < 0.15 || s.belief > 0.85).length;

  let variantTotal = 0;
  for (const variants of variantsByOrigin.values()) variantTotal += variants.size;
  const averageVariantsPerOrigin =
    variantsByOrigin.size === 0 ? 0 : variantTotal / variantsByOrigin.size;
  const reconstructability =
    variantTotal === 0 ? 1 : clamp01(origins.size / Math.max(origins.size, variantTotal));
  const maxDepth = runtime.lineageEvents.reduce((max, event) => Math.max(max, event.hop), 0);

  return {
    mode,
    simTime,
    activeFragments,
    uniqueOrigins: origins.size,
    linkCount,
    averageHops: activeFragments === 0 ? 0 : hops / activeFragments,
    averageSuspicion: states.length === 0 ? 0 : suspicion / states.length,
    maliciousKnownCount: states.filter((s) => s.malicious && s.suspicion >= threshold).length,
    quarantineCount: states.filter((s) => s.suspicion >= threshold).length,
    falseSignalCount: falseSignals,
    recoveredAgents,
    infectedCount,
    knownInfectedCount,
    avoidedAdversaryContacts: states.filter((s) => s.infectionKnown && !s.malicious).length,
    emotion: {
      meanValence: states.length === 0 ? 0 : valenceSum / states.length,
      meanArousal: states.length === 0 ? 0 : arousalSum / states.length,
      meanFear: states.length === 0 ? 0 : fearSum / states.length,
      meanCohesion: states.length === 0 ? 0 : cohesionSum / states.length,
      blockadeAgents,
    },
    topology,
    lineage: {
      rootCount: origins.size,
      branchCount: runtime.lineageEvents.length,
      maxDepth,
      averageVariantsPerOrigin,
      reconstructability,
    },
    consensus: {
      meanBelief,
      beliefVariance,
      meanConfidence,
      polarizedAgents,
      convergence: clamp01(1 - beliefVariance * 4),
    },
  };
}

export function initResearchStates(
  agentCount: number,
  maliciousCount: number,
  seed = DEFAULT_RESEARCH_CONFIG.seed,
): AgentResearchState[] {
  const states: AgentResearchState[] = Array.from({ length: agentCount }, (_, agentId) => {
    const key = mix32((agentId + 1) * 0x45d9f3b ^ seed);
    return {
      agentId,
      key,
      malicious: false,
      suspicion: 0,
      trust: 1,
      belief: (mix32(key ^ 0xa511e9b3) % 1000) / 1000,
      confidence: 0.35 + ((mix32(key ^ 0x63d83595) % 550) / 1000),
      infected: false,
      infectionKnown: false,
      infectionLoad: 0,
      infectionSourceId: null,
      infectionDiscoveredAt: null,
      memory: [],
      knownOrigins: 0,
      lastContactAt: 0,
      falseFragmentsSent: 0,
      emotion: {
        valence: 0.42 + ((mix32(key ^ 0x17ed3c51) % 180) / 1000),
        arousal: 0.2 + ((mix32(key ^ 0x28d4a2bd) % 220) / 1000),
        fear: (mix32(key ^ 0xb5297a4d) % 180) / 1000,
        trustDrive: 0.45 + ((mix32(key ^ 0x68e31da4) % 300) / 1000),
        curiosity: 0.35 + ((mix32(key ^ 0x1b56c4e9) % 360) / 1000),
        aggression: (mix32(key ^ 0x9f6abc13) % 220) / 1000,
        cohesion: 0.35 + ((mix32(key ^ 0x6d2b79f5) % 320) / 1000),
      },
    };
  });
  syncMaliciousAgents(states, maliciousCount);
  return states;
}

function applyKeyDrift(states: AgentResearchState[], config: ResearchConfig, simTime: number): void {
  if (config.keyDriftRate <= 0) return;
  for (const state of states) {
    const gate = mix32(state.key ^ Math.floor(simTime / 1000)) % 10000;
    if (gate < Math.round(config.keyDriftRate * 10000)) {
      state.key = mix32(state.key ^ gate ^ config.seed);
      state.confidence = clamp01(state.confidence - config.keyDriftRate * 0.1);
    }
  }
}

export function stepResearch(
  agents: Agent[],
  states: AgentResearchState[],
  config: ResearchConfig,
  runtime: ResearchRuntime,
  simTime: number,
): ResearchTelemetry {
  if (states.length !== agents.length) {
    states.length = 0;
    states.push(...initResearchStates(agents.length, config.maliciousAgentCount, config.seed));
  }

  syncMaliciousAgents(states, config.maliciousAgentCount);
  applyKeyDrift(states, config, simTime);
  updateInfectionAwareness(states, config, simTime);

  if (!config.enabled) {
    return computeTelemetry(
      states,
      0,
      config.mode,
      config.suspicionThreshold,
      runtime.recoveredAgents,
      runtime.lastTopology,
      runtime,
      simTime,
    );
  }

  applyCollisionField(agents, states, config);

  if (simTime - runtime.lastBroadcastAt < config.broadcastIntervalMs) {
    return computeTelemetry(
      states,
      0,
      config.mode,
      config.suspicionThreshold,
      runtime.recoveredAgents,
      runtime.lastTopology,
      runtime,
      simTime,
    );
  }

  runtime.lastBroadcastAt = simTime;
  const contacted = new Set<number>();
  const contactsByAgent = new Map<number, Set<number>>();
  let linkCount = 0;

  for (const state of states) {
    state.memory = state.memory.filter((fragment) => fragment.ttl > 0);
    state.knownOrigins = new Set(state.memory.map((fragment) => fragment.originAgentId)).size;
  }

  for (const state of states) {
    const seedGate = mix32(state.key ^ Math.floor(simTime / config.broadcastIntervalMs));
    if (state.memory.length === 0 || seedGate % 100 < 14) {
      seedFragment(state, runtime, config, simTime);
    }
  }

  for (let i = 0; i < agents.length; i++) {
    const sender = states[i]!;
    const contacts = nearestAgents(agents, i, config.communicationRadius);
    if (contacts.length === 0) continue;

    const fragments = chooseFragments(sender, config.packetsPerAgent);
    for (const contact of contacts) {
      const linkGate = mix32(sender.key ^ states[contact.index]!.key ^ Math.floor(simTime / 10)) % 10000;
      if (linkGate < Math.round(config.linkFailureRate * 10000)) continue;
      const receiver = states[contact.index]!;

      if (
        (config.mode === "exclusion" || config.mode === "deception") &&
        sender.suspicion >= config.suspicionThreshold
      ) {
        continue;
      }

      linkCount++;
      contacted.add(sender.agentId);
      contacted.add(receiver.agentId);
      sender.lastContactAt = simTime;
      receiver.lastContactAt = simTime;

      if (!contactsByAgent.has(sender.agentId)) contactsByAgent.set(sender.agentId, new Set());
      if (!contactsByAgent.has(receiver.agentId)) contactsByAgent.set(receiver.agentId, new Set());
      contactsByAgent.get(sender.agentId)!.add(receiver.agentId);
      contactsByAgent.get(receiver.agentId)!.add(sender.agentId);

      updateConsensus(sender, receiver, config);

      for (const fragment of fragments) {
        const dropGate = mix32(fragment.lineageHash ^ receiver.key ^ Math.floor(simTime)) % 10000;
        if (dropGate < Math.round(config.packetDropRate * 10000)) continue;

        if (
          config.maliciousStrategy === "infect" &&
          sender.malicious &&
          !receiver.malicious
        ) {
          exposeInfection(receiver, sender, config, simTime);
        }

        const outbound =
          config.mode === "deception" && receiver.malicious
            ? {
                ...fragment,
                value: mix32(fragment.value ^ receiver.key ^ MALICIOUS_DISTORTION),
                lineageHash: mix32(fragment.lineageHash ^ receiver.key),
              }
            : fragment;

        if (config.mode === "deception" && receiver.malicious) {
          sender.falseFragmentsSent += 1;
        }

        const transformed = transformFragment(sender, receiver, outbound, config, runtime, simTime);
        const accepted = rememberFragment(receiver, transformed);
        updateSuspicion(sender, receiver, accepted, config);
        updateEmotionOnContact(sender, receiver, accepted, config);
      }
    }
  }

  let recovered = 0;
  for (const agentId of contacted) {
    if (!runtime.previousContactedAgents.has(agentId)) recovered++;
  }
  runtime.recoveredAgents = recovered;
  runtime.previousContactedAgents = contacted;
  runtime.lastTopology = computeTopology(agents.length, contactsByAgent);

  return computeTelemetry(
    states,
    linkCount,
    config.mode,
    config.suspicionThreshold,
    runtime.recoveredAgents,
    runtime.lastTopology,
    runtime,
    simTime,
  );
}
