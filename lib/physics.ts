import type { Agent, AgentResearchState, PhysicsConfig, ResearchConfig } from "./types";

export const DEFAULT_PHYSICS_CONFIG: PhysicsConfig = {
  mode: "boids",
  agentRadius: 3.5,
  mass: 1,
  damping: 0.992,
  restitution: 0.76,
  friction: 0.025,
  gravity: 0,
  chargeStrength: 0.18,
  springStrength: 0.025,
  solverIterations: 3,
  quantumTunneling: 0.04,
  quantumDecoherence: 0.12,
  waveInterference: 0.28,
  entanglementRadius: 80,
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function capVelocity(agent: Agent, maxSpeed: number): void {
  const speed = Math.hypot(agent.vx, agent.vy);
  if (speed <= maxSpeed || speed === 0) return;
  const scale = maxSpeed / speed;
  agent.vx *= scale;
  agent.vy *= scale;
}

function applyBounds(agent: Agent, width: number, height: number, config: PhysicsConfig): void {
  const r = config.agentRadius;
  if (agent.x < r) {
    agent.x = r;
    agent.vx = Math.abs(agent.vx) * config.restitution;
  } else if (agent.x > width - r) {
    agent.x = width - r;
    agent.vx = -Math.abs(agent.vx) * config.restitution;
  }

  if (agent.y < r) {
    agent.y = r;
    agent.vy = Math.abs(agent.vy) * config.restitution;
  } else if (agent.y > height - r) {
    agent.y = height - r;
    agent.vy = -Math.abs(agent.vy) * config.restitution;
  }
}

function adversaryAvoidance(
  agent: Agent,
  state: AgentResearchState | undefined,
  other: Agent,
  otherState: AgentResearchState | undefined,
  research?: Pick<ResearchConfig, "adversaryAvoidance">,
): number {
  if (!state || !otherState) return 1;
  if (otherState.malicious && !state.malicious && (state.infectionKnown || otherState.suspicion > 0.5)) {
    const fear = state.emotion?.fear ?? 0.35;
    return -(1.2 + 2.8 * (research?.adversaryAvoidance ?? 0.72) * (0.35 + fear));
  }
  if (state.malicious && !otherState.malicious && state.infected) {
    return 1.9;
  }
  return 1;
}

export function tickAdvancedPhysics(
  agents: Agent[],
  states: AgentResearchState[],
  config: PhysicsConfig,
  width: number,
  height: number,
  research?: Pick<ResearchConfig, "adversaryAvoidance" | "blockadeStrength">,
): void {
  const n = agents.length;
  if (n === 0) return;

  const radius = config.agentRadius;
  const minDist = radius * 2;
  const minDistSq = minDist * minDist;
  const interactionRadius = Math.max(28, radius * 18);
  const interactionSq = interactionRadius * interactionRadius;
  const invMass = 1 / Math.max(0.1, config.mass);

  for (let i = 0; i < n; i++) {
    const a = agents[i]!;
    a.vy += config.gravity * 0.016;
    a.vx *= config.damping;
    a.vy *= config.damping;
  }

  for (let i = 0; i < n; i++) {
    const a = agents[i]!;
    const ai = states[i];
    for (let j = i + 1; j < n; j++) {
      const b = agents[j]!;
      const bj = states[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d2 = dx * dx + dy * dy;
      if (d2 <= 0.0001 || d2 > interactionSq) continue;

      const d = Math.sqrt(d2);
      const nx = dx / d;
      const ny = dy / d;
      const avoidAB = adversaryAvoidance(a, ai, b, bj, research);
      const avoidBA = adversaryAvoidance(b, bj, a, ai, research);
      const quantumPhase =
        config.mode === "quantum"
          ? Math.sin((ai?.key ?? i) * 0.00001 + (bj?.key ?? j) * 0.000013 + d * 0.09)
          : 0;
      const interference =
        config.mode === "quantum" ? quantumPhase * config.waveInterference * 0.28 : 0;
      const coulomb = (config.chargeStrength + interference) / Math.max(d2, minDistSq);
      const charge = coulomb * interactionRadius * interactionRadius * (1 - d / interactionRadius);
      const spring = config.springStrength * (d - interactionRadius * 0.42) / interactionRadius;
      const force = (charge * avoidAB - spring) * invMass;
      const reverse = (charge * avoidBA - spring) * invMass;

      a.vx -= nx * force;
      a.vy -= ny * force;
      b.vx += nx * reverse;
      b.vy += ny * reverse;

      const blockadeAB =
        bj?.malicious && !ai?.malicious && (bj.suspicion > 0.45 || ai?.infectionKnown)
          ? (ai?.emotion.cohesion ?? 0) * (ai?.emotion.fear ?? 0) * (research?.blockadeStrength ?? 0.38)
          : 0;
      const blockadeBA =
        ai?.malicious && !bj?.malicious && (ai.suspicion > 0.45 || bj?.infectionKnown)
          ? (bj?.emotion.cohesion ?? 0) * (bj?.emotion.fear ?? 0) * (research?.blockadeStrength ?? 0.38)
          : 0;
      if (blockadeAB > 0) {
        const tangential = clamp(blockadeAB * (1 - d / interactionRadius) * 0.18, 0, 0.04);
        a.vx += -ny * tangential;
        a.vy += nx * tangential;
        b.vx -= -ny * tangential * 0.28;
        b.vy -= nx * tangential * 0.28;
      }
      if (blockadeBA > 0) {
        const tangential = clamp(blockadeBA * (1 - d / interactionRadius) * 0.18, 0, 0.04);
        b.vx += ny * tangential;
        b.vy += -nx * tangential;
        a.vx -= ny * tangential * 0.28;
        a.vy -= -nx * tangential * 0.28;
      }
    }
  }

  if (config.mode === "quantum") {
    const entangleSq = config.entanglementRadius * config.entanglementRadius;
    for (let i = 0; i < n; i++) {
      const a = agents[i]!;
      const ai = states[i];
      for (let j = i + 1; j < n; j++) {
        const b = agents[j]!;
        const bj = states[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d2 = dx * dx + dy * dy;
        if (d2 <= 0.0001 || d2 > entangleSq) continue;

        const phase = Math.sin(((ai?.key ?? i) ^ (bj?.key ?? j)) * 0.000003 + d2 * 0.0002);
        const blend = config.quantumDecoherence * 0.02;
        const avgVx = (a.vx + b.vx) * 0.5;
        const avgVy = (a.vy + b.vy) * 0.5;
        a.vx += (avgVx - a.vx) * blend + phase * config.waveInterference * 0.01;
        a.vy += (avgVy - a.vy) * blend - phase * config.waveInterference * 0.01;
        b.vx += (avgVx - b.vx) * blend - phase * config.waveInterference * 0.01;
        b.vy += (avgVy - b.vy) * blend + phase * config.waveInterference * 0.01;
      }

      const gate = Math.sin((ai?.key ?? i) * 0.000017 + a.x * 0.013 + a.y * 0.017);
      if (gate > 1 - config.quantumTunneling * 0.08) {
        a.x = (a.x + width * 0.5 + gate * 17) % width;
        a.y = (a.y + height * 0.5 - gate * 13 + height) % height;
      }
    }
  }

  if (config.mode === "rigid") {
    for (let iter = 0; iter < Math.max(1, Math.floor(config.solverIterations)); iter++) {
      for (let i = 0; i < n; i++) {
        const a = agents[i]!;
        for (let j = i + 1; j < n; j++) {
          const b = agents[j]!;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const d2 = dx * dx + dy * dy;
          if (d2 <= 0.0001 || d2 >= minDistSq) continue;

          const d = Math.sqrt(d2);
          const nx = dx / d;
          const ny = dy / d;
          const penetration = minDist - d;
          const correction = penetration * 0.5;
          a.x -= nx * correction;
          a.y -= ny * correction;
          b.x += nx * correction;
          b.y += ny * correction;

          const rvx = b.vx - a.vx;
          const rvy = b.vy - a.vy;
          const normalVel = rvx * nx + rvy * ny;
          if (normalVel > 0) continue;

          const impulse = (-(1 + config.restitution) * normalVel) / 2;
          const tx = -ny;
          const ty = nx;
          const tangentVel = rvx * tx + rvy * ty;
          const frictionImpulse = clamp(-tangentVel * config.friction, -impulse, impulse);

          a.vx -= nx * impulse - tx * frictionImpulse;
          a.vy -= ny * impulse - ty * frictionImpulse;
          b.vx += nx * impulse - tx * frictionImpulse;
          b.vy += ny * impulse - ty * frictionImpulse;
        }
      }
    }
  }

  for (const agent of agents) {
    agent.x += agent.vx;
    agent.y += agent.vy;
    capVelocity(agent, 8);
    applyBounds(agent, width, height, config);
  }
}
