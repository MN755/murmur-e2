"use client";

import { useCallback, useState, type ReactElement } from "react";

import { HelpHint } from "@/components/HelpHint";
import { ResearchControls } from "@/components/ResearchControls";
import { WorkbenchNav } from "@/components/WorkbenchNav";
import { runHeadlessResearch, type HeadlessPoint, type HeadlessRunResult } from "@/lib/headless";
import { DEFAULT_RESEARCH_CONFIG } from "@/lib/research";
import type { ProjectionMetric } from "@/lib/projection";
import type { ResearchConfig } from "@/lib/types";

const METRICS: { id: ProjectionMetric; label: string; color: string }[] = [
  { id: "collectiveTrust", label: "Collective trust", color: "#7cf8ff" },
  { id: "adversaryTrust", label: "Adversary trust", color: "#ff5c5c" },
  { id: "adversaryBelief", label: "Adversary belief", color: "#ffbe5c" },
  { id: "contentVolume", label: "Content volume", color: "#e8f4ff" },
  { id: "movementNearAdversary", label: "Near adversary motion", color: "#8ea0ff" },
  { id: "connectedness", label: "Connectedness", color: "#83ffb4" },
  { id: "recoverability", label: "Recoverability", color: "#d7ff7c" },
  { id: "infected", label: "Infected", color: "#ff7aa8" },
  { id: "knownInfected", label: "Known infected", color: "#c586c0" },
  { id: "entropy", label: "Entropy", color: "#569cd6" },
  { id: "meanFear", label: "Mean fear", color: "#f48771" },
  { id: "meanCohesion", label: "Mean cohesion", color: "#4ec9b0" },
  { id: "blockade", label: "Blockade", color: "#dcdcaa" },
];

type XAxisMetric = "time" | ProjectionMetric;
type PendingGraphChange =
  | { kind: "config"; update: Partial<ResearchConfig> }
  | { kind: "duration"; value: number }
  | { kind: "samples"; value: number };

function pointX(point: HeadlessPoint, axis: XAxisMetric): number {
  return axis === "time" ? point.t : point[axis];
}

function pathFor(points: HeadlessPoint[], xAxis: XAxisMetric, metric: ProjectionMetric): string {
  const width = 900;
  const height = 360;
  return points
    .map((point, index) => {
      const x = pointX(point, xAxis) * width;
      const y = height - point[metric] * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function MetricToggle({
  metric,
  active,
  onToggle,
}: {
  metric: (typeof METRICS)[number];
  active: boolean;
  onToggle: () => void;
}): ReactElement {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex h-8 items-center justify-between rounded border px-2 font-mono text-[11px] transition-colors duration-200"
      style={{
        borderColor: active ? metric.color : "var(--border-subtle)",
        background: active ? "rgba(255,255,255,0.04)" : "var(--bg-panel)",
        color: active ? "var(--text-primary)" : "var(--text-secondary)",
      }}
    >
      <span>{metric.label}</span>
      <span
        className="h-2 w-2 rounded-full"
        style={{ background: active ? metric.color : "var(--border-subtle)" }}
      />
    </button>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <div className="border-t border-[var(--border-subtle)] py-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
        {label}
      </div>
      <div className="mt-1 font-mono text-lg text-[var(--text-primary)]">{value}</div>
    </div>
  );
}

export default function GraphPage(): ReactElement {
  const [config, setConfig] = useState<ResearchConfig>({ ...DEFAULT_RESEARCH_CONFIG });
  const [settingsVisible, setSettingsVisible] = useState(true);
  const [durationMs, setDurationMs] = useState(90000);
  const [sampleCount, setSampleCount] = useState(1440);
  const [run, setRun] = useState<HeadlessRunResult | null>(null);
  const [isComputing, setIsComputing] = useState(false);
  const [pendingChange, setPendingChange] = useState<PendingGraphChange | null>(null);
  const [activeMetrics, setActiveMetrics] = useState<ProjectionMetric[]>([
    "collectiveTrust",
    "adversaryTrust",
    "contentVolume",
    "recoverability",
  ]);
  const [xAxis, setXAxis] = useState<XAxisMetric>("time");
  const points = run?.dataset ?? [];
  const last = points[points.length - 1] ?? null;

  const executeRun = useCallback(
    (nextConfig = config, nextDurationMs = durationMs, nextSampleCount = sampleCount): void => {
      setIsComputing(true);
      setRun(null);
      window.setTimeout(() => {
        setRun(
          runHeadlessResearch({
            research: nextConfig,
            durationMs: nextDurationMs,
            sampleCount: nextSampleCount,
          }),
        );
        setIsComputing(false);
      }, 0);
    },
    [config, durationMs, sampleCount],
  );

  const applyGraphChange = useCallback(
    (change: PendingGraphChange): {
      nextConfig: ResearchConfig;
      nextDurationMs: number;
      nextSampleCount: number;
    } => {
      let nextConfig = config;
      let nextDurationMs = durationMs;
      let nextSampleCount = sampleCount;

      if (change.kind === "config") {
        nextConfig = { ...config, ...change.update };
        setConfig(nextConfig);
      } else if (change.kind === "duration") {
        nextDurationMs = change.value;
        setDurationMs(nextDurationMs);
      } else {
        nextSampleCount = change.value;
        setSampleCount(nextSampleCount);
      }

      setRun(null);
      return { nextConfig, nextDurationMs, nextSampleCount };
    },
    [config, durationMs, sampleCount],
  );

  const guardedChange = useCallback(
    (change: PendingGraphChange): void => {
      if (run || isComputing) {
        setIsComputing(false);
        setPendingChange(change);
        return;
      }
      applyGraphChange(change);
    },
    [applyGraphChange, isComputing, run],
  );

  function updateConfig(update: Partial<ResearchConfig>): void {
    guardedChange({ kind: "config", update });
  }

  function toggleMetric(metric: ProjectionMetric): void {
    setActiveMetrics((current) =>
      current.includes(metric)
        ? current.filter((item) => item !== metric)
        : [...current, metric],
    );
  }

  return (
    <div className="flex h-[100dvh] min-h-0 bg-[var(--bg-page)] text-[var(--text-primary)]">
      <WorkbenchNav active="graph" />
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--border-subtle)] px-5">
          <div>
            <h1 className="font-mono text-[11px] uppercase tracking-[0.14em]">Projection Graph</h1>
            <p className="mt-1 font-mono text-[10px] text-[var(--text-secondary)]">
              settings-driven forecast workspace
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSettingsVisible((v) => !v)}
            className="rounded border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-3 py-1 font-mono text-[11px] text-[var(--text-secondary)] transition-colors duration-200 hover:border-[var(--accent-glow)] hover:text-[var(--text-primary)]"
          >
            {settingsVisible ? "hide settings" : "show settings"}
          </button>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_260px]">
          <section className="min-w-0 overflow-y-auto p-5">
            <div className="mb-4 grid grid-cols-4 gap-3">
              <SummaryStat label="collective trust" value={last ? last.collectiveTrust.toFixed(2) : "--"} />
              <SummaryStat label="adversary trust" value={last ? last.adversaryTrust.toFixed(2) : "--"} />
              <SummaryStat label="content volume" value={last ? last.contentVolume.toFixed(2) : "--"} />
              <SummaryStat label="recoverability" value={last ? last.recoverability.toFixed(2) : "--"} />
            </div>

            <div className="relative overflow-hidden rounded border border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
              <svg viewBox="0 0 960 430" className="h-[56vh] min-h-[360px] w-full">
                <text x="54" y="28" fill="rgba(232,244,255,0.72)" fontSize="13" fontFamily="monospace">
                  Y: selected metric value (0-1 normalized)
                </text>
                <text x="390" y="410" fill="rgba(232,244,255,0.72)" fontSize="13" fontFamily="monospace">
                  X: {xAxis === "time" ? "time / run progress" : METRICS.find((m) => m.id === xAxis)?.label}
                </text>
                <g transform="translate(44 34)">
                {[0.25, 0.5, 0.75].map((y) => (
                  <line
                    key={y}
                    x1="0"
                    x2="900"
                    y1={360 - y * 360}
                    y2={360 - y * 360}
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth="1"
                  />
                ))}
                {[0, 0.25, 0.5, 0.75, 1].map((y) => (
                  <text
                    key={y}
                    x="-10"
                    y={360 - y * 360 + 4}
                    textAnchor="end"
                    fill="rgba(232,244,255,0.55)"
                    fontSize="11"
                    fontFamily="monospace"
                  >
                    {y.toFixed(2)}
                  </text>
                ))}
                {[0.25, 0.5, 0.75].map((x) => (
                  <line
                    key={x}
                    x1={x * 900}
                    x2={x * 900}
                    y1="0"
                    y2="360"
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth="1"
                  />
                ))}
                {[0, 0.25, 0.5, 0.75, 1].map((x) => (
                  <text
                    key={x}
                    x={x * 900}
                    y="382"
                    textAnchor="middle"
                    fill="rgba(232,244,255,0.55)"
                    fontSize="11"
                    fontFamily="monospace"
                  >
                    {x.toFixed(2)}
                  </text>
                ))}
                {points.length === 0 ? (
                  <text x="450" y="180" textAnchor="middle" fill="rgba(232,244,255,0.55)" fontSize="13" fontFamily="monospace">
                    {isComputing ? "Computing deterministic headless run..." : "Graph is empty until you select run in the settings panel."}
                  </text>
                ) : null}
                {points.length > 0 ? METRICS.filter((metric) => activeMetrics.includes(metric.id)).map((metric) => (
                  <path
                    key={metric.id}
                    d={pathFor(points, xAxis, metric.id)}
                    fill="none"
                    stroke={metric.color}
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )) : null}
                </g>
              </svg>
            </div>

            <div className="mt-4 grid grid-cols-[240px_minmax(0,1fr)] gap-4">
              <div>
                <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                  X axis
                </label>
                <select
                  value={xAxis}
                  onChange={(e) => setXAxis(e.target.value as XAxisMetric)}
                  className="h-9 w-full rounded border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2 font-mono text-[11px] text-[var(--text-primary)] outline-none"
                >
                  <option value="time">Time / run progress</option>
                  {METRICS.map((metric) => (
                    <option key={metric.id} value={metric.id}>
                      {metric.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
              {METRICS.map((metric) => (
                <MetricToggle
                  key={metric.id}
                  metric={metric}
                  active={activeMetrics.includes(metric.id)}
                  onToggle={() => toggleMetric(metric.id)}
                />
              ))}
              </div>
            </div>
          </section>

          <aside className="border-l border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-4">
            <h2 className="mb-4 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
              Headless Readout
            </h2>
            <div className="space-y-2 font-mono text-[11px] text-[var(--text-secondary)]">
              <div>Mode: {config.mode}</div>
              <div>Strategy: {config.maliciousStrategy}</div>
              <div>Consensus: {config.consensusRule}</div>
              <div>Seed: {config.seed}</div>
              <div>Duration: {(durationMs / 1000).toFixed(0)}s</div>
              <div>Samples: {run?.sampleCount ?? sampleCount}</div>
              <div>Source: deterministic agent loop</div>
              <div>Status: {isComputing ? "computing" : run ? "computed" : "not run"}</div>
            </div>
          </aside>
        </div>
      </main>

      {settingsVisible ? (
        <aside className="w-[360px] shrink-0 overflow-y-auto border-l border-[var(--border-subtle)] bg-[var(--bg-page)] p-4">
          <section className="mb-5 space-y-3">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
              Run Window
            </h2>
            <label className="block font-mono text-[11px] text-[var(--text-secondary)]">
              Duration seconds
              <HelpHint text="Duration controls how many simulated milliseconds the headless run advances after you press run." href="/docs" />
              <input
                type="number"
                value={durationMs / 1000}
                onChange={(e) =>
                  guardedChange({
                    kind: "duration",
                    value: Math.max(1, Number(e.target.value) || 90) * 1000,
                  })
                }
                className="mt-1 h-8 w-full rounded border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2 text-[var(--text-primary)]"
              />
            </label>
            <label className="block font-mono text-[11px] text-[var(--text-secondary)]">
              Sample points
              <HelpHint text="Sample points controls graph resolution. More points show finer detail but take longer to compute." href="/docs" />
              <input
                type="number"
                value={sampleCount}
                onChange={(e) =>
                  guardedChange({
                    kind: "samples",
                    value: Math.max(60, Number(e.target.value) || 1440),
                  })
                }
                className="mt-1 h-8 w-full rounded border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2 text-[var(--text-primary)]"
              />
            </label>
          </section>
          <ResearchControls config={config} onChange={updateConfig} />
          <div className="sticky bottom-0 mt-5 border-t border-[var(--border-subtle)] bg-[var(--bg-page)] pt-3">
            <button
              type="button"
              onClick={() => executeRun()}
              disabled={isComputing}
              className="h-9 w-full rounded border border-[var(--accent-glow)] bg-[var(--accent-soft)] font-mono text-[11px] text-[var(--text-primary)] disabled:cursor-wait disabled:opacity-60"
            >
              {isComputing ? "running..." : "run headless graph"}
            </button>
          </div>
        </aside>
      ) : null}
      {pendingChange ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4">
          <section className="w-full max-w-md border border-[var(--accent-glow)] bg-[var(--bg-canvas)] shadow-2xl">
            <header className="border-b border-[var(--border-subtle)] px-4 py-3">
              <h2 className="font-mono text-[11px] uppercase tracking-[0.14em]">
                Existing graph will be invalidated
              </h2>
            </header>
            <div className="space-y-4 px-4 py-4 text-sm leading-6 text-[var(--text-secondary)]">
              <p>
                This setting change no longer matches the computed dataset. Choose whether to
                discard the change, apply and rerun, or apply and leave the graph empty until later.
              </p>
              <div className="grid gap-2 font-mono text-[11px]">
                <button
                  type="button"
                  onClick={() => setPendingChange(null)}
                  className="h-9 rounded border border-[var(--border-subtle)] bg-[var(--bg-panel)] text-[var(--text-secondary)]"
                >
                  revert setting change
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = applyGraphChange(pendingChange);
                    setPendingChange(null);
                    window.setTimeout(
                      () =>
                        executeRun(
                          next.nextConfig,
                          next.nextDurationMs,
                          next.nextSampleCount,
                        ),
                      0,
                    );
                  }}
                  className="h-9 rounded border border-[var(--accent-glow)] bg-[var(--accent-soft)] text-[var(--text-primary)]"
                >
                  apply setting and rerun
                </button>
                <button
                  type="button"
                  onClick={() => {
                    applyGraphChange(pendingChange);
                    setPendingChange(null);
                  }}
                  className="h-9 rounded border border-[var(--border-subtle)] bg-[var(--bg-panel)] text-[var(--text-secondary)]"
                >
                  apply setting, do not run yet
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
