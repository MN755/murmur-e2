"use client";

import type { ReactElement } from "react";

import { HelpHint } from "@/components/HelpHint";
import type {
  ConsensusRule,
  MaliciousStrategy,
  ResearchConfig,
  ResearchMode,
} from "@/lib/types";

const MODES: { id: ResearchMode; label: string }[] = [
  { id: "communication", label: "Comm" },
  { id: "collision", label: "Collision" },
  { id: "exclusion", label: "Exclude" },
  { id: "deception", label: "Deceive" },
];

const STRATEGIES: { id: MaliciousStrategy; label: string }[] = [
  { id: "corrupt", label: "Corrupt" },
  { id: "replay", label: "Replay" },
  { id: "trustFarm", label: "Trust" },
  { id: "isolate", label: "Isolate" },
  { id: "infect", label: "Infect" },
];

const CONSENSUS_RULES: { id: ConsensusRule; label: string }[] = [
  { id: "weightedTrust", label: "Trust" },
  { id: "majority", label: "Majority" },
  { id: "bayesian", label: "Bayes" },
  { id: "confidenceDecay", label: "Decay" },
];

type ResearchControlsProps = {
  config: ResearchConfig;
  onChange: (update: Partial<ResearchConfig>) => void;
  compact?: boolean;
};

function Section({
  title,
  help,
  children,
}: {
  title: string;
  help?: string;
  children: React.ReactNode;
}): ReactElement {
  return (
    <section className="space-y-2">
      <h3 className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
        {title}
        {help ? <HelpHint text={help} /> : null}
      </h3>
      {children}
    </section>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  help,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
  help: string;
}): ReactElement {
  return (
    <div className="space-y-1">
      <div className="font-mono text-[11px] text-[var(--text-secondary)]">
        {label}
        <HelpHint text={help} />
      </div>
      <div className="grid grid-cols-4 gap-1">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className="h-7 rounded border px-1 text-[10px] transition-colors duration-200"
            style={{
              borderColor:
                value === option.id ? "var(--accent-glow)" : "var(--border-subtle)",
              background:
                value === option.id ? "rgba(124,248,255,0.08)" : "var(--bg-panel)",
              color:
                value === option.id ? "var(--text-primary)" : "var(--text-secondary)",
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Slider({
  label,
  help,
  value,
  min,
  max,
  step,
  onChange,
  format = String,
}: {
  label: string;
  help?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
}): ReactElement {
  return (
    <label className="flex flex-col gap-1">
      <span className="flex items-center justify-between gap-3 font-mono text-[11px]">
        <span className="text-[var(--text-secondary)]">{label}</span>
        {help ? <HelpHint text={help} /> : null}
        <span className="tabular-nums text-[var(--text-primary)]">{format(value)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--accent)]"
      />
    </label>
  );
}

export function ResearchControls({
  config,
  onChange,
  compact = false,
}: ResearchControlsProps): ReactElement {
  return (
    <div className={compact ? "space-y-4" : "space-y-5"}>
      <Section title="Run" help="Seed and speed define reproducibility and simulated-time acceleration for formal runs.">
        <div className="grid grid-cols-[minmax(0,1fr)_84px] items-center gap-3">
          <label className="font-mono text-[11px] text-[var(--text-secondary)]" htmlFor="research-seed">
            Seed <HelpHint text="Deterministic seed used for initial positions, agent keys, and repeatable headless runs." />
          </label>
          <input
            id="research-seed"
            type="number"
            value={config.seed}
            onChange={(e) => onChange({ seed: Number(e.target.value) || 1 })}
            className="h-7 rounded border border-[var(--border-subtle)] bg-transparent px-2 text-right font-mono text-[11px] text-[var(--text-primary)] outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)]"
          />
        </div>
        <Slider
          label="Speed"
          help="Multiplies simulated time while preserving deterministic action updates."
          value={config.environmentSpeed}
          min={0.25}
          max={12}
          step={0.25}
          onChange={(environmentSpeed) => onChange({ environmentSpeed })}
          format={(v) => `${v.toFixed(2)}x`}
        />
      </Section>

      <Section title="Experiment" help="Communication settings define who can exchange fragments and how long information persists.">
        <Segmented
          label="Mode"
          help="Selects the research process being emphasized: communication propagation, collision coupling, adversarial exclusion, or deceptive counter-signaling."
          value={config.mode}
          options={MODES}
          onChange={(mode) => onChange({ mode })}
        />
        <Slider
          label="Radius"
          help="Spatial communication radius used for contact graph construction and packet exchange."
          value={config.communicationRadius}
          min={30}
          max={220}
          step={5}
          onChange={(communicationRadius) => onChange({ communicationRadius })}
          format={(v) => `${v}px`}
        />
        <Slider
          label="Interval"
          help="Simulated milliseconds between broadcast windows. Shorter intervals create more contact updates per unit time."
          value={config.broadcastIntervalMs}
          min={150}
          max={1800}
          step={50}
          onChange={(broadcastIntervalMs) => onChange({ broadcastIntervalMs })}
          format={(v) => `${(v / 1000).toFixed(2)}s`}
        />
        <Slider
          label="TTL"
          help="Maximum remaining rebroadcast hops for a fragment before it expires from agent memory."
          value={config.packetTtl}
          min={2}
          max={20}
          step={1}
          onChange={(packetTtl) => onChange({ packetTtl })}
        />
        <Slider
          label="Packets"
          help="Number of remembered fragments a sender attempts to transmit to each contacted neighbor."
          value={config.packetsPerAgent}
          min={1}
          max={6}
          step={1}
          onChange={(packetsPerAgent) => onChange({ packetsPerAgent })}
        />
        <Slider
          label="Mutation"
          help="Probability pressure for transforming fragment values during encode/decode hops."
          value={config.mutationBias}
          min={0}
          max={1}
          step={0.05}
          onChange={(mutationBias) => onChange({ mutationBias })}
          format={(v) => v.toFixed(2)}
        />
      </Section>

      <Section title="Entropy" help="Entropy controls uncertainty sources that degrade links, packets, keys, and observations.">
        <Slider
          label="Entropy"
          help="Global disorder applied to mutation and state stability."
          value={config.entropyRate}
          min={0}
          max={1}
          step={0.02}
          onChange={(entropyRate) => onChange({ entropyRate })}
          format={(v) => v.toFixed(2)}
        />
        <Slider
          label="Packet drop"
          help="Probability that a fragment transmission disappears during a contact."
          value={config.packetDropRate}
          min={0}
          max={0.8}
          step={0.02}
          onChange={(packetDropRate) => onChange({ packetDropRate })}
          format={(v) => v.toFixed(2)}
        />
        <Slider
          label="Link fail"
          help="Probability that an otherwise valid contact link fails for the broadcast window."
          value={config.linkFailureRate}
          min={0}
          max={0.8}
          step={0.02}
          onChange={(linkFailureRate) => onChange({ linkFailureRate })}
          format={(v) => v.toFixed(2)}
        />
        <Slider
          label="Sensor noise"
          help="Observation noise reserved for noisy measurement experiments and formal exports."
          value={config.sensorNoise}
          min={0}
          max={1}
          step={0.02}
          onChange={(sensorNoise) => onChange({ sensorNoise })}
          format={(v) => v.toFixed(2)}
        />
        <Slider
          label="Key drift"
          help="Probability that an agent's stable key mutates over time, degrading reproducibility within a run."
          value={config.keyDriftRate}
          min={0}
          max={0.4}
          step={0.01}
          onChange={(keyDriftRate) => onChange({ keyDriftRate })}
          format={(v) => v.toFixed(2)}
        />
      </Section>

      <Section title="Adversary" help="Adversarial controls configure malicious agent count, behavior, infection, and discovery policy.">
        <Slider
          label="Count"
          value={config.maliciousAgentCount}
          min={0}
          max={8}
          step={1}
          onChange={(maliciousAgentCount) => onChange({ maliciousAgentCount })}
        />
        <Segmented
          label="Strategy"
          help="Selects how malicious agents alter the network: corrupt content, replay content, farm trust, isolate weak-context agents, or infect receivers."
          value={config.maliciousStrategy}
          options={STRATEGIES}
          onChange={(maliciousStrategy) => onChange({ maliciousStrategy })}
        />
        <Slider
          label="Suspicion"
          help="Threshold where a sender is treated as risky enough for quarantine, exclusion, or defensive deception."
          value={config.suspicionThreshold}
          min={0.2}
          max={0.95}
          step={0.05}
          onChange={(suspicionThreshold) => onChange({ suspicionThreshold })}
          format={(v) => v.toFixed(2)}
        />
        <Segmented
          label="Awareness"
          help="Controls when infected agents know they are infected: immediately, never, gradually, or after a fixed delay."
          value={config.infectionAwareness}
          options={[
            { id: "known", label: "Known" },
            { id: "hidden", label: "Hidden" },
            { id: "learnOverTime", label: "Learn" },
            { id: "delayedReveal", label: "Delay" },
          ]}
          onChange={(infectionAwareness) => onChange({ infectionAwareness })}
        />
        <Slider
          label="Infection"
          help="Probability that an infecting adversary alters a receiving agent on contact."
          value={config.infectionRate}
          min={0}
          max={1}
          step={0.05}
          onChange={(infectionRate) => onChange({ infectionRate })}
          format={(v) => v.toFixed(2)}
        />
        <Slider
          label="Reveal"
          help="Delay before delayed-reveal infections become known to the affected agent."
          value={config.infectionDelayMs}
          min={1000}
          max={20000}
          step={500}
          onChange={(infectionDelayMs) => onChange({ infectionDelayMs })}
          format={(v) => `${(v / 1000).toFixed(1)}s`}
        />
      </Section>

      <Section title="Dynamics" help="Consensus and collision controls shape group-level belief and spatial interaction dynamics.">
        <Slider
          label="Collision"
          value={config.collisionCoupling}
          min={0}
          max={1}
          step={0.05}
          onChange={(collisionCoupling) => onChange({ collisionCoupling })}
          format={(v) => v.toFixed(2)}
        />
        <Segmented
          label="Consensus rule"
          help="Selects the mathematical rule used to update receiver belief after contact with a sender."
          value={config.consensusRule}
          options={CONSENSUS_RULES}
          onChange={(consensusRule) => onChange({ consensusRule })}
        />
        <Slider
          label="Consensus"
          value={config.consensusWeight}
          min={0}
          max={1}
          step={0.05}
          onChange={(consensusWeight) => onChange({ consensusWeight })}
          format={(v) => v.toFixed(2)}
        />
      </Section>

      <Section title="Affect" help="Affect controls bounded emotion variables that shape trust weighting, infection response, cohesion, avoidance, and blockade motion.">
        <div className="grid grid-cols-[minmax(0,1fr)_84px] items-center gap-3">
          <label className="font-mono text-[11px] text-[var(--text-secondary)]" htmlFor="emotion-enabled">
            Emotion model <HelpHint text="Enables bounded affect state per agent. The model changes interaction weights through valence, arousal, fear, trust drive, curiosity, aggression, and cohesion." />
          </label>
          <button
            id="emotion-enabled"
            type="button"
            onClick={() => onChange({ emotionEnabled: !config.emotionEnabled })}
            className="h-7 rounded border border-[var(--border-subtle)] bg-[var(--bg-panel)] font-mono text-[11px] text-[var(--text-secondary)]"
          >
            {config.emotionEnabled ? "on" : "off"}
          </button>
        </div>
        <Slider
          label="Plasticity"
          help="Rate at which affect variables move after contact, infection evidence, or threat exposure."
          value={config.emotionPlasticity}
          min={0}
          max={1}
          step={0.02}
          onChange={(emotionPlasticity) => onChange({ emotionPlasticity })}
          format={(v) => v.toFixed(2)}
        />
        <Slider
          label="Fear contagion"
          help="How strongly threat observations and known infection increase fear and arousal across contacts."
          value={config.fearContagion}
          min={0}
          max={1}
          step={0.02}
          onChange={(fearContagion) => onChange({ fearContagion })}
          format={(v) => v.toFixed(2)}
        />
        <Slider
          label="Cohesion drive"
          help="How strongly non-malicious agents increase group cohesion under visible adversarial or infection pressure."
          value={config.cohesionDrive}
          min={0}
          max={1}
          step={0.02}
          onChange={(cohesionDrive) => onChange({ cohesionDrive })}
          format={(v) => v.toFixed(2)}
        />
        <Slider
          label="Avoidance"
          help="Strength of motion away from known or highly suspicious adversarial agents."
          value={config.adversaryAvoidance}
          min={0}
          max={1}
          step={0.02}
          onChange={(adversaryAvoidance) => onChange({ adversaryAvoidance })}
          format={(v) => v.toFixed(2)}
        />
        <Slider
          label="Blockade"
          help="Strength of tangential containment motion when cohesive agents surround a known adversary instead of only fleeing."
          value={config.blockadeStrength}
          min={0}
          max={1}
          step={0.02}
          onChange={(blockadeStrength) => onChange({ blockadeStrength })}
          format={(v) => v.toFixed(2)}
        />
      </Section>
    </div>
  );
}
