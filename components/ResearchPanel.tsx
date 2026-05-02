"use client";

import { useState } from "react";
import type { ReactElement } from "react";

import { HelpHint } from "@/components/HelpHint";
import { ResearchControls } from "@/components/ResearchControls";
import { buildFormalExperimentOptions } from "@/lib/experiment";
import type {
  ExperimentRecorderState,
  PhysicsConfig,
  ResearchConfig,
  ResearchTelemetry,
  RuleWeights,
} from "@/lib/types";

type ResearchPanelProps = {
  config: ResearchConfig;
  telemetry: ResearchTelemetry | null;
  recorder: ExperimentRecorderState;
  rules: RuleWeights;
  physics: PhysicsConfig;
  isPaused: boolean;
  onRun: () => void;
  onPause: () => void;
  onReset: () => void;
  onChange: (update: Partial<ResearchConfig>) => void;
  onRuleChange: (key: keyof RuleWeights, value: number) => void;
  onPhysicsChange: (update: Partial<PhysicsConfig>) => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onClearRecording: () => void;
  onPlayRecording: () => void;
  onStopReplay: () => void;
};

function Stat({ label, value }: { label: string; value: string | number }): ReactElement {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[var(--text-secondary)]">
        {label}
        <HelpHint text={`This monitor value reports ${label} from the latest telemetry frame. Open the docs for the full measurement definition.`} href="/docs" />
      </span>
      <span className="tabular-nums text-[var(--text-primary)]">{value}</span>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format = String,
  help,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
  help?: string;
}): ReactElement {
  return (
    <label className="flex flex-col gap-1">
      <span className="flex items-center justify-between gap-3 font-mono text-[11px]">
        <span className="text-[var(--text-secondary)]">
          {label}
          <HelpHint text={help ?? `This setting changes ${label.toLowerCase()} for the current experiment configuration.`} href="/docs" />
        </span>
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

function Group({
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
        <HelpHint text={help ?? `${title} groups related telemetry or settings in the active workspace panel.`} href="/docs" />
      </h3>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[11px]">
        {children}
      </div>
    </section>
  );
}

function fallbackTelemetry(config: ResearchConfig): ResearchTelemetry {
  return {
    mode: config.mode,
    simTime: 0,
    activeFragments: 0,
    uniqueOrigins: 0,
    linkCount: 0,
    averageHops: 0,
    averageSuspicion: 0,
    maliciousKnownCount: 0,
    quarantineCount: 0,
    falseSignalCount: 0,
    recoveredAgents: 0,
    infectedCount: 0,
    knownInfectedCount: 0,
    avoidedAdversaryContacts: 0,
    emotion: {
      meanValence: 0,
      meanArousal: 0,
      meanFear: 0,
      meanCohesion: 0,
      blockadeAgents: 0,
    },
    topology: {
      componentCount: 0,
      largestComponentSize: 0,
      isolatedAgents: 0,
      averageDegree: 0,
      bridgeAgentCount: 0,
    },
    lineage: {
      rootCount: 0,
      branchCount: 0,
      maxDepth: 0,
      averageVariantsPerOrigin: 0,
      reconstructability: 1,
    },
    consensus: {
      meanBelief: 0,
      beliefVariance: 0,
      meanConfidence: 0,
      polarizedAgents: 0,
      convergence: 0,
    },
  };
}

export function ResearchPanel({
  config,
  telemetry,
  recorder,
  rules,
  physics,
  isPaused,
  onRun,
  onPause,
  onReset,
  onChange,
  onRuleChange,
  onPhysicsChange,
  onStartRecording,
  onStopRecording,
  onClearRecording,
  onPlayRecording,
  onStopReplay,
}: ResearchPanelProps): ReactElement {
  const [tab, setTab] = useState<"monitor" | "experiment" | "physics" | "dev" | "backend">("monitor");
  const t = telemetry ?? fallbackTelemetry(config);
  const exportJson = JSON.stringify(
    buildFormalExperimentOptions({ research: config, physics, boids: rules }),
    null,
    2,
  );
  const tabs = [
    { id: "monitor", label: "MON" },
    { id: "experiment", label: "EXP" },
    { id: "physics", label: "PHY" },
    { id: "dev", label: "DEV" },
    { id: "backend", label: "API" },
  ] as const;

  return (
    <aside
      className="flex h-full min-h-0 flex-col border-l border-[var(--border-subtle)] bg-[var(--bg-page)]"
      style={{ color: "var(--text-primary)" }}
    >
      <header className="shrink-0 border-b border-[var(--border-subtle)] px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--text-primary)]">
              Research
              <HelpHint text="VS Code-style right panel for monitoring, experiment settings, physics engine tuning, dev boids variables, run controls, and formal exports." href="/docs" />
            </h2>
            <p className="mt-1 font-mono text-[10px] text-[var(--text-secondary)]">
              {config.mode} · {config.environmentSpeed.toFixed(2)}x
            </p>
          </div>
          <button
            type="button"
            onClick={() => onChange({ enabled: !config.enabled })}
            className="rounded border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-2 py-1 font-mono text-[10px] text-[var(--text-secondary)] transition-colors duration-200 hover:border-[var(--accent-glow)] hover:text-[var(--text-primary)]"
          >
            {config.enabled ? "active" : "paused"}
          </button>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-1 font-mono text-[10px]">
          <button
            type="button"
            onClick={onRun}
            className="h-7 rounded border border-[var(--accent-glow)] bg-[var(--accent-soft)] text-[var(--text-primary)]"
          >
            run <HelpHint text="Starts or resumes the environment. The lab begins idle so settings can be reviewed before state changes." href="/docs" />
          </button>
          <button
            type="button"
            onClick={onPause}
            className="h-7 rounded border border-[var(--border-subtle)] bg-[var(--bg-panel)] text-[var(--text-secondary)]"
          >
            pause <HelpHint text="Freezes the live loop without changing settings, recorded frames, or the current state." href="/docs" />
          </button>
          <button
            type="button"
            onClick={onReset}
            className="h-7 rounded border border-[var(--border-subtle)] bg-[var(--bg-panel)] text-[var(--text-secondary)]"
          >
            reset <HelpHint text="Reinitializes agents and telemetry from the current settings. It does not alter the selected variables." href="/docs" />
          </button>
        </div>
        <div className="mt-2 font-mono text-[10px] text-[var(--text-secondary)]">
          status: {isPaused ? "idle or paused" : "running"}
        </div>
        <div className="mt-3 grid grid-cols-5 gap-1 font-mono text-[10px]">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className="h-7 rounded border transition-colors duration-200"
              style={{
                borderColor: tab === item.id ? "var(--accent-glow)" : "var(--border-subtle)",
                background: tab === item.id ? "rgba(0,122,204,0.18)" : "var(--bg-panel)",
                color: tab === item.id ? "var(--text-primary)" : "var(--text-secondary)",
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {tab === "monitor" ? (
        <div className="space-y-5">
          <Group title="Network" help="Network telemetry is computed from the latest contact graph produced during a broadcast window.">
            <Stat label="time" value={`${(t.simTime / 1000).toFixed(1)}s`} />
            <Stat label="links" value={t.linkCount} />
            <Stat label="components" value={t.topology.componentCount} />
            <Stat label="largest" value={t.topology.largestComponentSize} />
            <Stat label="isolated" value={t.topology.isolatedAgents} />
            <Stat label="degree" value={t.topology.averageDegree.toFixed(1)} />
          </Group>

          <Group title="Information" help="Information telemetry summarizes fragment lineage, hop count, branching, and reconstructability.">
            <Stat label="fragments" value={t.activeFragments} />
            <Stat label="origins" value={t.uniqueOrigins} />
            <Stat label="hops" value={t.averageHops.toFixed(1)} />
            <Stat label="branches" value={t.lineage.branchCount} />
            <Stat label="depth" value={t.lineage.maxDepth} />
            <Stat label="recover" value={t.lineage.reconstructability.toFixed(2)} />
          </Group>

          <Group title="Trust" help="Trust telemetry combines suspicion, quarantine, infection, deception, and consensus measurements.">
            <Stat label="suspicion" value={t.averageSuspicion.toFixed(2)} />
            <Stat label="quarantine" value={t.quarantineCount} />
            <Stat label="known bad" value={t.maliciousKnownCount} />
            <Stat label="false feed" value={t.falseSignalCount} />
            <Stat label="infected" value={t.infectedCount} />
            <Stat label="known inf" value={t.knownInfectedCount} />
            <Stat label="avoidance" value={t.avoidedAdversaryContacts} />
            <Stat label="belief" value={t.consensus.meanBelief.toFixed(2)} />
            <Stat label="converge" value={t.consensus.convergence.toFixed(2)} />
          </Group>

          <Group title="Emotion" help="Emotion telemetry reports bounded affect variables that alter trust, avoidance, cohesion, and blockade behavior.">
            <Stat label="valence" value={t.emotion.meanValence.toFixed(2)} />
            <Stat label="arousal" value={t.emotion.meanArousal.toFixed(2)} />
            <Stat label="fear" value={t.emotion.meanFear.toFixed(2)} />
            <Stat label="cohesion" value={t.emotion.meanCohesion.toFixed(2)} />
            <Stat label="blockade" value={t.emotion.blockadeAgents} />
          </Group>

          <section className="space-y-2">
            <h3 className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
              Recorder
            </h3>
            <div className="grid grid-cols-4 gap-1 font-mono text-[10px]">
              <button
                type="button"
                onClick={recorder.isRecording ? onStopRecording : onStartRecording}
                className="h-7 rounded border border-[var(--border-subtle)] bg-[var(--bg-panel)] text-[var(--text-secondary)] transition-colors duration-200 hover:border-[var(--accent-glow)] hover:text-[var(--text-primary)]"
              >
                {recorder.isRecording ? "stop" : "record"}
              </button>
              <button
                type="button"
                onClick={recorder.isReplaying ? onStopReplay : onPlayRecording}
                disabled={recorder.frames.length === 0}
                className="h-7 rounded border border-[var(--border-subtle)] bg-[var(--bg-panel)] text-[var(--text-secondary)] transition-colors duration-200 hover:border-[var(--accent-glow)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-45"
              >
                {recorder.isReplaying ? "live" : "replay"}
              </button>
              <button
                type="button"
                onClick={onClearRecording}
                disabled={recorder.frames.length === 0}
                className="h-7 rounded border border-[var(--border-subtle)] bg-[var(--bg-panel)] text-[var(--text-secondary)] transition-colors duration-200 hover:border-[var(--accent-glow)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-45"
              >
                clear
              </button>
              <div className="flex h-7 items-center justify-center rounded border border-[var(--border-subtle)] bg-[var(--bg-panel)] text-[var(--text-secondary)]">
                {recorder.frames.length}
              </div>
            </div>
          </section>
        </div>
        ) : null}

        {tab === "experiment" ? (
          <ResearchControls config={config} onChange={onChange} compact />
        ) : null}

        {tab === "physics" ? (
          <div className="space-y-4">
            <Group title="Engine">
              <button type="button" onClick={() => onPhysicsChange({ mode: "boids" })} className="h-7 rounded border border-[var(--border-subtle)] text-[var(--text-secondary)]">boids</button>
              <button type="button" onClick={() => onPhysicsChange({ mode: "field" })} className="h-7 rounded border border-[var(--border-subtle)] text-[var(--text-secondary)]">field</button>
              <button type="button" onClick={() => onPhysicsChange({ mode: "rigid" })} className="h-7 rounded border border-[var(--border-subtle)] text-[var(--text-secondary)]">rigid</button>
              <button type="button" onClick={() => onPhysicsChange({ mode: "quantum" })} className="h-7 rounded border border-[var(--border-subtle)] text-[var(--text-secondary)]">quantum</button>
              <Stat label="active" value={physics.mode} />
            </Group>
            <Slider label="Radius" value={physics.agentRadius} min={1.5} max={10} step={0.25} onChange={(agentRadius) => onPhysicsChange({ agentRadius })} />
            <Slider label="Mass" value={physics.mass} min={0.2} max={6} step={0.1} onChange={(mass) => onPhysicsChange({ mass })} />
            <Slider label="Damping" value={physics.damping} min={0.9} max={1} step={0.001} onChange={(damping) => onPhysicsChange({ damping })} format={(v) => v.toFixed(3)} />
            <Slider label="Restitution" value={physics.restitution} min={0} max={1} step={0.02} onChange={(restitution) => onPhysicsChange({ restitution })} format={(v) => v.toFixed(2)} />
            <Slider label="Friction" value={physics.friction} min={0} max={0.2} step={0.005} onChange={(friction) => onPhysicsChange({ friction })} format={(v) => v.toFixed(3)} />
            <Slider label="Gravity" value={physics.gravity} min={-0.5} max={0.5} step={0.01} onChange={(gravity) => onPhysicsChange({ gravity })} format={(v) => v.toFixed(2)} />
            <Slider label="Charge" value={physics.chargeStrength} min={-1} max={1} step={0.02} onChange={(chargeStrength) => onPhysicsChange({ chargeStrength })} format={(v) => v.toFixed(2)} />
            <Slider label="Spring" value={physics.springStrength} min={0} max={0.2} step={0.005} onChange={(springStrength) => onPhysicsChange({ springStrength })} format={(v) => v.toFixed(3)} />
            <Slider label="Solver" value={physics.solverIterations} min={1} max={8} step={1} onChange={(solverIterations) => onPhysicsChange({ solverIterations })} />
            <Group title="Quantum">
              <Stat label="model" value="wave-field" />
              <Stat label="status" value={physics.mode === "quantum" ? "active" : "standby"} />
            </Group>
            <Slider label="Tunneling" value={physics.quantumTunneling} min={0} max={1} step={0.02} onChange={(quantumTunneling) => onPhysicsChange({ quantumTunneling })} format={(v) => v.toFixed(2)} />
            <Slider label="Decoherence" value={physics.quantumDecoherence} min={0} max={1} step={0.02} onChange={(quantumDecoherence) => onPhysicsChange({ quantumDecoherence })} format={(v) => v.toFixed(2)} />
            <Slider label="Interference" value={physics.waveInterference} min={0} max={1} step={0.02} onChange={(waveInterference) => onPhysicsChange({ waveInterference })} format={(v) => v.toFixed(2)} />
            <Slider label="Entangle R" value={physics.entanglementRadius} min={10} max={220} step={5} onChange={(entanglementRadius) => onPhysicsChange({ entanglementRadius })} format={(v) => `${v}px`} />
          </div>
        ) : null}

        {tab === "dev" ? (
          <div className="space-y-4">
            <Group title="Boids Rule Weights">
              <Stat label="mode" value={physics.mode === "boids" ? "active" : "standby"} />
            </Group>
            <Slider label="Separation" value={rules.separation} min={0} max={5} step={0.05} onChange={(value) => onRuleChange("separation", value)} />
            <Slider label="Alignment" value={rules.alignment} min={0} max={5} step={0.05} onChange={(value) => onRuleChange("alignment", value)} />
            <Slider label="Cohesion" value={rules.cohesion} min={0} max={5} step={0.05} onChange={(value) => onRuleChange("cohesion", value)} />
            <Slider label="Speed" value={rules.speed} min={0.2} max={8} step={0.05} onChange={(value) => onRuleChange("speed", value)} />
            <Slider label="Perception" value={rules.perception} min={10} max={250} step={1} onChange={(value) => onRuleChange("perception", value)} />
          </div>
        ) : null}

        {tab === "backend" ? (
          <div className="space-y-4 font-mono text-[11px] text-[var(--text-secondary)]">
            <Group title="Headless API">
              <Stat label="endpoint" value="/api/research/run" />
              <Stat label="method" value="POST" />
            </Group>
            <p className="leading-5">
              Send a JSON body with <span className="text-[var(--text-primary)]">research</span>, <span className="text-[var(--text-primary)]">physics</span>, <span className="text-[var(--text-primary)]">boids</span>, and optional duration/sample settings. The response returns deterministic headless datasets, summary metrics, and analysis notes for offline agents.
            </p>
            <Group title="Formal Export">
              <button
                type="button"
                onClick={() => void navigator.clipboard?.writeText(exportJson)}
                className="h-7 rounded border border-[var(--border-subtle)] text-[var(--text-secondary)]"
              >
                copy JSON
              </button>
              <button
                type="button"
                onClick={() => {
                  const blob = new Blob([exportJson], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "murmur-experiment-options.json";
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="h-7 rounded border border-[var(--border-subtle)] text-[var(--text-secondary)]"
              >
                download
              </button>
            </Group>
            <textarea
              readOnly
              value={exportJson}
              className="h-72 w-full resize-none rounded border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-2 text-[10px] leading-4 text-[var(--text-mono)] outline-none"
            />
          </div>
        ) : null}
      </div>
    </aside>
  );
}
