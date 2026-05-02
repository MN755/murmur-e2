import Anthropic from "@anthropic-ai/sdk";

import { buildPrompt, parseResponse } from "@/lib/claude";
import type {
  ChatMessage,
  ClaudeResponse,
  ResearchConfig,
  ResearchTelemetry,
  SimSnapshot,
} from "@/lib/types";

export const runtime = "nodejs";

const MODEL = "claude-haiku-4-5-20251001";

const FALLBACK: ClaudeResponse = {
  message: "I missed that — try rephrasing.",
  rule_update: null,
  highlight_cluster: null,
};

const MAX_HISTORY_MESSAGES = 20;

function jsonResponse(body: ClaudeResponse, status = 200) {
  return Response.json(body, { status });
}

function isChatHistory(x: unknown): x is ChatMessage[] {
  if (!Array.isArray(x)) return false;
  return x.slice(-MAX_HISTORY_MESSAGES).every(
    (m) =>
      m !== null &&
      typeof m === "object" &&
      (m.role === "user" || m.role === "assistant") &&
      typeof m.content === "string" &&
      typeof m.timestamp === "number"
  );
}

function isSimSnapshot(x: unknown): x is SimSnapshot {
  if (!x || typeof x !== "object") return false;
  const s = x as Record<string, unknown>;

  const delta = s.delta;
  if (
    !delta ||
    typeof delta !== "object" ||
    typeof (delta as Record<string, unknown>).clusterCountDelta !==
      "number" ||
    typeof (delta as Record<string, unknown>).avgVelocityDelta !==
      "number" ||
    typeof (delta as Record<string, unknown>).timeSinceLastChange !==
      "number"
  ) {
    return false;
  }

  if (
    typeof s.timestamp !== "number" ||
    typeof s.agentCount !== "number" ||
    typeof s.clusterCount !== "number" ||
    typeof s.outlierCount !== "number" ||
    typeof s.averageVelocity !== "number" ||
    typeof s.velocityVariance !== "number" ||
    typeof s.dominantDirection !== "number"
  ) {
    return false;
  }

  if (!Array.isArray(s.clusters)) return false;
  for (const c of s.clusters) {
    if (!c || typeof c !== "object") return false;
    const cl = c as Record<string, unknown>;
    if (
      typeof cl.id !== "number" ||
      typeof cl.size !== "number" ||
      typeof cl.avgVelocity !== "number"
    )
      return false;
    const centroid = cl.centroid;
    if (
      !centroid ||
      typeof centroid !== "object" ||
      typeof (centroid as Record<string, unknown>).x !== "number" ||
      typeof (centroid as Record<string, unknown>).y !== "number"
    )
      return false;
    if (!Array.isArray(cl.agentIds)) return false;
    if (
      !(cl.agentIds as unknown[]).every(
        (id) => typeof id === "number" && Number.isInteger(id)
      )
    )
      return false;
  }

  const rules = s.currentRules;
  if (
    !rules ||
    typeof rules !== "object" ||
    typeof (rules as Record<string, unknown>).separation !== "number" ||
    typeof (rules as Record<string, unknown>).alignment !== "number" ||
    typeof (rules as Record<string, unknown>).cohesion !== "number" ||
    typeof (rules as Record<string, unknown>).speed !== "number" ||
    typeof (rules as Record<string, unknown>).perception !== "number"
  )
    return false;

  return true;
}

function isResearchConfig(x: unknown): x is ResearchConfig {
  if (!x || typeof x !== "object") return false;
  const r = x as Record<string, unknown>;
  return (
    typeof r.enabled === "boolean" &&
    (r.mode === "communication" ||
      r.mode === "collision" ||
      r.mode === "exclusion" ||
      r.mode === "deception") &&
    typeof r.seed === "number" &&
    typeof r.environmentSpeed === "number" &&
    typeof r.communicationRadius === "number" &&
    typeof r.broadcastIntervalMs === "number" &&
    typeof r.packetsPerAgent === "number" &&
    typeof r.packetTtl === "number" &&
    typeof r.mutationBias === "number" &&
    typeof r.entropyRate === "number" &&
    typeof r.packetDropRate === "number" &&
    typeof r.sensorNoise === "number" &&
    typeof r.keyDriftRate === "number" &&
    typeof r.linkFailureRate === "number" &&
    typeof r.collisionCoupling === "number" &&
    typeof r.maliciousAgentCount === "number" &&
    (r.maliciousStrategy === "corrupt" ||
      r.maliciousStrategy === "replay" ||
      r.maliciousStrategy === "trustFarm" ||
      r.maliciousStrategy === "isolate" ||
      r.maliciousStrategy === "infect") &&
    typeof r.infectionRate === "number" &&
    (r.infectionAwareness === "known" ||
      r.infectionAwareness === "hidden" ||
      r.infectionAwareness === "learnOverTime" ||
      r.infectionAwareness === "delayedReveal") &&
    typeof r.infectionDelayMs === "number" &&
    typeof r.suspicionThreshold === "number" &&
    (r.consensusRule === "weightedTrust" ||
      r.consensusRule === "majority" ||
      r.consensusRule === "bayesian" ||
      r.consensusRule === "confidenceDecay") &&
    typeof r.consensusWeight === "number" &&
    typeof r.emotionEnabled === "boolean" &&
    typeof r.emotionPlasticity === "number" &&
    typeof r.fearContagion === "number" &&
    typeof r.cohesionDrive === "number" &&
    typeof r.adversaryAvoidance === "number" &&
    typeof r.blockadeStrength === "number"
  );
}

function isResearchTelemetry(x: unknown): x is ResearchTelemetry | null {
  if (x === null) return true;
  if (!x || typeof x !== "object") return false;
  const t = x as Record<string, unknown>;
  return (
    (t.mode === "communication" ||
      t.mode === "collision" ||
      t.mode === "exclusion" ||
      t.mode === "deception") &&
    typeof t.simTime === "number" &&
    typeof t.activeFragments === "number" &&
    typeof t.uniqueOrigins === "number" &&
    typeof t.linkCount === "number" &&
    typeof t.averageHops === "number" &&
    typeof t.averageSuspicion === "number" &&
    typeof t.maliciousKnownCount === "number" &&
    typeof t.quarantineCount === "number" &&
    typeof t.falseSignalCount === "number" &&
    typeof t.recoveredAgents === "number" &&
    typeof t.infectedCount === "number" &&
    typeof t.knownInfectedCount === "number" &&
    typeof t.avoidedAdversaryContacts === "number" &&
    typeof t.emotion === "object" &&
    t.emotion !== null &&
    typeof (t.emotion as Record<string, unknown>).meanValence === "number" &&
    typeof (t.emotion as Record<string, unknown>).meanArousal === "number" &&
    typeof (t.emotion as Record<string, unknown>).meanFear === "number" &&
    typeof (t.emotion as Record<string, unknown>).meanCohesion === "number" &&
    typeof (t.emotion as Record<string, unknown>).blockadeAgents === "number" &&
    typeof t.topology === "object" &&
    t.topology !== null &&
    typeof (t.topology as Record<string, unknown>).componentCount === "number" &&
    typeof (t.topology as Record<string, unknown>).largestComponentSize === "number" &&
    typeof (t.topology as Record<string, unknown>).isolatedAgents === "number" &&
    typeof (t.topology as Record<string, unknown>).averageDegree === "number" &&
    typeof (t.topology as Record<string, unknown>).bridgeAgentCount === "number" &&
    typeof t.lineage === "object" &&
    t.lineage !== null &&
    typeof (t.lineage as Record<string, unknown>).rootCount === "number" &&
    typeof (t.lineage as Record<string, unknown>).branchCount === "number" &&
    typeof (t.lineage as Record<string, unknown>).maxDepth === "number" &&
    typeof (t.lineage as Record<string, unknown>).averageVariantsPerOrigin === "number" &&
    typeof (t.lineage as Record<string, unknown>).reconstructability === "number" &&
    typeof t.consensus === "object" &&
    t.consensus !== null &&
    typeof (t.consensus as Record<string, unknown>).meanBelief === "number" &&
    typeof (t.consensus as Record<string, unknown>).beliefVariance === "number" &&
    typeof (t.consensus as Record<string, unknown>).meanConfidence === "number" &&
    typeof (t.consensus as Record<string, unknown>).polarizedAgents === "number" &&
    typeof (t.consensus as Record<string, unknown>).convergence === "number"
  );
}

function parseResearchContext(
  value: unknown,
): { config: ResearchConfig; telemetry: ResearchTelemetry | null } | undefined {
  if (!value || typeof value !== "object") return undefined;
  const r = value as Record<string, unknown>;
  if (!isResearchConfig(r.config)) return undefined;
  if (!isResearchTelemetry(r.telemetry ?? null)) return undefined;
  return {
    config: r.config,
    telemetry: (r.telemetry ?? null) as ResearchTelemetry | null,
  };
}

async function callClaude(
  client: Anthropic,
  snapshot: SimSnapshot,
  history: ChatMessage[],
  userMessage: string,
  research?: { config: ResearchConfig; telemetry: ResearchTelemetry | null },
): Promise<string | null> {
  try {
    const { system, messages } = buildPrompt(
      snapshot,
      history,
      userMessage,
      research,
    );
    const result = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system,
      messages,
    });

    const textBlock = result.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") return null;
    return textBlock.text;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(FALLBACK);
  }

  if (!body || typeof body !== "object") {
    return jsonResponse(FALLBACK);
  }

  const { snapshot, research, history, userMessage } = body as Record<
    string,
    unknown
  >;

  if (typeof userMessage !== "string") {
    return jsonResponse(FALLBACK);
  }

  if (!isSimSnapshot(snapshot)) {
    return jsonResponse(FALLBACK);
  }

  const hist: ChatMessage[] = isChatHistory(history)
    ? history.slice(-MAX_HISTORY_MESSAGES)
    : [];
  const researchContext = parseResearchContext(research);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    return jsonResponse(FALLBACK);
  }

  const client = new Anthropic({ apiKey });

  let raw = await callClaude(client, snapshot, hist, userMessage, researchContext);
  let parsed = raw ? parseResponse(raw) : null;

  if (!parsed) {
    raw = await callClaude(client, snapshot, hist, userMessage, researchContext);
    parsed = raw ? parseResponse(raw) : null;
  }

  if (!parsed) {
    return jsonResponse(FALLBACK);
  }

  return jsonResponse(parsed);
}
