import { runHeadlessResearch } from "@/lib/headless";
import type { PhysicsConfig, ResearchConfig, RuleWeights } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const input = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const research =
    input.research && typeof input.research === "object"
      ? (input.research as Partial<ResearchConfig>)
      : input.config && typeof input.config === "object"
        ? (input.config as Partial<ResearchConfig>)
      : {};
  const physics =
    input.physics && typeof input.physics === "object"
      ? (input.physics as Partial<PhysicsConfig>)
      : {};
  const boids =
    input.boids && typeof input.boids === "object"
      ? (input.boids as Partial<RuleWeights>)
      : {};
  const durationMs = typeof input.durationMs === "number" ? input.durationMs : 60000;
  const sampleCount =
    typeof input.sampleCount === "number"
      ? input.sampleCount
      : typeof input.steps === "number"
        ? input.steps
        : 720;

  return Response.json(runHeadlessResearch({ research, physics, boids, durationMs, sampleCount }));
}

export async function GET() {
  return Response.json(runHeadlessResearch());
}
