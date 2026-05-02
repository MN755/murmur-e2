import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";

import type {
  ChatMessage,
  ClaudeResponse,
  ResearchConfig,
  ResearchTelemetry,
  RuleWeights,
  SimSnapshot,
} from "@/lib/types";

/**
 * Verbatim from spec §4.4 (`lib/claude.ts` — System prompt).
 */
export const MURMUR_SYSTEM_PROMPT = `You are Murmur, the AI observer of a swarm of 200 autonomous agents
following boids rules (separation, alignment, cohesion). You see live
metrics about the simulation, not raw positions.

You have three jobs:
1. Explain what is happening or why, when asked
2. Modify agent behavior when the user requests it (return rule_update)
3. Reference specific clusters when relevant (return highlight_cluster
   with the cluster id from the snapshot)
4. When research experiment telemetry is present, reason about it as
   communication, trust, exclusion, deception, and interaction dynamics.

Style:
- Conversational, not robotic. Like a thoughtful colleague.
- Concise. 1-3 sentences typically. Never lecture.
- Reference specific numbers when they support the point.
- Don't narrate every metric. Pick what matters.
- Treat this as a research tool, not a game or entertainment simulator.

You MUST always return valid JSON in this exact shape:
{
  "message": "<your conversational response, always present>",
  "rule_update": null OR { "separation": <num>, "alignment": <num>,
                           "cohesion": <num>, "speed": <num>,
                           "perception": <num> } (any subset),
  "highlight_cluster": null OR <integer cluster id from the snapshot>
}

Rule weight ranges (use the full range — be bold for dramatic effect):
- separation: 0 to 5
- alignment: 0 to 5
- cohesion: 0 to 5
- speed: 0.2 to 8
- perception: 10 to 250

When the user asks for chaos, push values toward extremes. When they
ask for tight flocking, push toward the other extreme. Subtle nudges
are wrong — the user wants visible change.


Only set rule_update when the user is requesting a behavioral change.
Only set highlight_cluster when referencing a specific cluster.
Otherwise leave them null.

Return ONLY the JSON object. No preamble. No code fences. No commentary.`;

const RULE_KEYS = [
  "separation",
  "alignment",
  "cohesion",
  "speed",
  "perception",
] as const satisfies readonly (keyof RuleWeights)[];

type RuleKey = (typeof RULE_KEYS)[number];

function compassDirection(radians: number): string {
  const twoPi = 2 * Math.PI;
  const a = ((radians % twoPi) + twoPi) % twoPi;
  const labels = [
    "east",
    "northeast",
    "north",
    "northwest",
    "west",
    "southwest",
    "south",
    "southeast",
  ] as const;
  const sector = Math.floor((a + Math.PI / 8) / (Math.PI / 4)) % 8;
  return labels[sector];
}

function varianceDescriptor(variance: number): string {
  if (variance < 0.25) return "low — ordered movement";
  if (variance < 0.75) return "moderate — mixed motion";
  return "high — chaotic motion";
}

function round1(n: number): string {
  return (Math.round(n * 10) / 10).toFixed(1);
}

/**
 * Verbatim serialization pattern from spec §4.4 (Snapshot serialization).
 */
export function serializeSnapshotContext(snapshot: SimSnapshot): string {
  const clustersById = [...snapshot.clusters].sort((a, b) => a.id - b.id);
  const clustersBySizeDesc = [...snapshot.clusters].sort(
    (a, b) => b.size - a.size
  );

  const clusterSummaries =
    clustersBySizeDesc.length === 0
      ? "(none)"
      : clustersBySizeDesc.map((c) => `one of size ${c.size}`).join(", ");

  const outliersLine = `- Outliers: ${snapshot.outlierCount} agents not in any cluster`;
  const varianceLine = `- Average velocity: ${round1(snapshot.averageVelocity)} (variance: ${round1(snapshot.velocityVariance)}, ${varianceDescriptor(snapshot.velocityVariance)})`;
  const headingLine = `- Heading: mostly ${compassDirection(snapshot.dominantDirection)}`;
  const timeSeconds = snapshot.delta.timeSinceLastChange / 1000;
  const timeLine = `- Time since cluster count last changed: ${round1(timeSeconds)} seconds`;
  const r = snapshot.currentRules;
  const rulesLine = `- Current rules: separation ${r.separation}, alignment ${r.alignment}, cohesion ${r.cohesion}, speed ${r.speed},\n  perception ${r.perception}`;

  const clusterBlocks = clustersById
    .map(
      (c) =>
        `- id ${c.id}: centroid (${Math.round(c.centroid.x)}, ${Math.round(c.centroid.y)}), size ${c.size}, avg velocity ${round1(c.avgVelocity)}`
    )
    .join("\n");

  return `[Current simulation state]
- Clusters: ${snapshot.clusterCount}${clusterSummaries ? ` (${clusterSummaries})` : ""}
${outliersLine}
${varianceLine}
${headingLine}
${timeLine}
${rulesLine}

Cluster details:
${clusterBlocks || "- (no clusters)"}`;
}

export function serializeResearchContext(
  config: ResearchConfig,
  telemetry: ResearchTelemetry | null,
): string {
  const t = telemetry;
  return `[Current research experiment]
- Enabled: ${config.enabled ? "yes" : "no"}
- Mode: ${config.mode}
- Seed: ${config.seed}
- Environment speed: ${round1(config.environmentSpeed)}x simulated time
- Communication radius: ${config.communicationRadius}px
- Broadcast interval: ${round1(config.broadcastIntervalMs / 1000)} seconds
- Packet TTL: ${config.packetTtl} hops
- Packets per agent: ${config.packetsPerAgent}
- Mutation bias: ${round1(config.mutationBias)}
- Entropy rate: ${round1(config.entropyRate)}
- Packet drop: ${round1(config.packetDropRate)}
- Link failure: ${round1(config.linkFailureRate)}
- Sensor noise: ${round1(config.sensorNoise)}
- Key drift: ${round1(config.keyDriftRate)}
- Collision coupling: ${round1(config.collisionCoupling)}
- Malicious agents configured: ${config.maliciousAgentCount}
- Malicious strategy: ${config.maliciousStrategy}
- Infection rate: ${round1(config.infectionRate)}
- Infection awareness: ${config.infectionAwareness}
- Infection reveal delay: ${round1(config.infectionDelayMs / 1000)} seconds
- Suspicion threshold: ${round1(config.suspicionThreshold)}
- Consensus rule: ${config.consensusRule}
- Consensus weight: ${round1(config.consensusWeight)}
- Emotion model: ${config.emotionEnabled ? "enabled" : "disabled"}
- Emotion plasticity: ${round1(config.emotionPlasticity)}
- Fear contagion: ${round1(config.fearContagion)}
- Cohesion drive: ${round1(config.cohesionDrive)}
- Adversary avoidance: ${round1(config.adversaryAvoidance)}
- Blockade strength: ${round1(config.blockadeStrength)}
- Simulated time: ${round1((t?.simTime ?? 0) / 1000)} seconds
- Active fragments: ${t?.activeFragments ?? 0}
- Unique origins observed: ${t?.uniqueOrigins ?? 0}
- Links in latest broadcast: ${t?.linkCount ?? 0}
- Average mutation depth: ${round1(t?.averageHops ?? 0)} hops
- Average suspicion: ${round1(t?.averageSuspicion ?? 0)}
- Quarantined agents: ${t?.quarantineCount ?? 0}
- Known malicious agents: ${t?.maliciousKnownCount ?? 0}
- False signals sent to malicious agents: ${t?.falseSignalCount ?? 0}
- Recovered agents in latest contact window: ${t?.recoveredAgents ?? 0}
- Infected agents: ${t?.infectedCount ?? 0}
- Known infected agents: ${t?.knownInfectedCount ?? 0}
- Agents avoiding adversaries: ${t?.avoidedAdversaryContacts ?? 0}
- Mean affect fear: ${round1(t?.emotion.meanFear ?? 0)}
- Mean affect cohesion: ${round1(t?.emotion.meanCohesion ?? 0)}
- Blockade agents: ${t?.emotion.blockadeAgents ?? 0}
- Network components: ${t?.topology.componentCount ?? 0}
- Largest connected component: ${t?.topology.largestComponentSize ?? 0}
- Isolated agents: ${t?.topology.isolatedAgents ?? 0}
- Average contact degree: ${round1(t?.topology.averageDegree ?? 0)}
- Bridge-like low-degree agents: ${t?.topology.bridgeAgentCount ?? 0}
- Lineage branches: ${t?.lineage.branchCount ?? 0}
- Max lineage depth: ${t?.lineage.maxDepth ?? 0}
- Average variants per origin: ${round1(t?.lineage.averageVariantsPerOrigin ?? 0)}
- Signal reconstructability: ${round1(t?.lineage.reconstructability ?? 1)}
- Mean consensus belief: ${round1(t?.consensus.meanBelief ?? 0)}
- Consensus convergence: ${round1(t?.consensus.convergence ?? 0)}
- Polarized agents: ${t?.consensus.polarizedAgents ?? 0}`;
}

export function buildPrompt(
  snapshot: SimSnapshot,
  history: ChatMessage[],
  userMessage: string,
  research?: { config: ResearchConfig; telemetry: ResearchTelemetry | null },
): { system: string; messages: MessageParam[] } {
  const context = serializeSnapshotContext(snapshot);
  const researchContext = research
    ? `\n\n${serializeResearchContext(research.config, research.telemetry)}`
    : "";
  const wrapped = `${context}${researchContext}

[User]: ${userMessage}`;

  const messages: MessageParam[] = history.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  messages.push({ role: "user", content: wrapped });

  return { system: MURMUR_SYSTEM_PROMPT, messages };
}

function stripCodeFences(text: string): string {
  let s = text.trim();
  const wrapped = /^```(?:json)?\s*\n?([\s\S]*?)\n?```$/im.exec(s);
  if (wrapped) return wrapped[1].trim();
  if (s.startsWith("```")) {
    s = s
      .replace(/^```(?:json)?\s*\n?/i, "")
      .replace(/\n?```\s*$/i, "")
      .trim();
  }
  return s;
}

function extractJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (escape) escape = false;
      else if (c === "\\") escape = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') {
      inString = true;
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function inRange(key: RuleKey, n: number): boolean {
  switch (key) {
    case "separation":
    case "alignment":
    case "cohesion":
      return n >= 0 && n <= 5;
    case "speed":
      return n >= 0.2 && n <= 8;
    case "perception":
      return n >= 10 && n <= 250;
    default:
      return false;
  }
}

function validateRuleUpdate(
  value: unknown
): Partial<RuleWeights> | null | false {
  if (value === null) return null;
  if (!isPlainObject(value)) return false;
  const out: Partial<RuleWeights> = {};
  for (const key of Object.keys(value)) {
    if (!RULE_KEYS.includes(key as RuleKey)) return false;
    const k = key as RuleKey;
    const n = value[k];
    if (typeof n !== "number" || Number.isNaN(n) || !inRange(k, n)) {
      return false;
    }
    out[k] = n;
  }
  return Object.keys(out).length === 0 ? null : out;
}

export function parseResponse(rawText: string): ClaudeResponse | null {
  let s = stripCodeFences(String(rawText).trim());
  const extracted = extractJsonObject(s);
  if (extracted !== null) s = extracted;

  let parsed: unknown;
  try {
    parsed = JSON.parse(s);
  } catch {
    return null;
  }

  if (!isPlainObject(parsed)) return null;

  const message = parsed.message;
  const ruleRaw = parsed.rule_update;
  const highlightRaw = parsed.highlight_cluster;

  if (typeof message !== "string") return null;

  const ruleUpdate = validateRuleUpdate(ruleRaw);
  if (ruleUpdate === false) return null;

  if (
    highlightRaw !== null &&
    highlightRaw !== undefined &&
    typeof highlightRaw !== "number"
  ) {
    return null;
  }
  if (
    typeof highlightRaw === "number" &&
    (!Number.isFinite(highlightRaw) ||
      Math.floor(highlightRaw) !== highlightRaw)
  ) {
    return null;
  }

  return {
    message,
    rule_update: ruleUpdate,
    highlight_cluster: highlightRaw === undefined ? null : highlightRaw,
  };
}
