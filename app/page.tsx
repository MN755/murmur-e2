"use client";

import { useCallback, useEffect, useRef, useState, type ReactElement } from "react";

import { ChatPanel } from "@/components/ChatPanel";
import { MetricsPanel } from "@/components/MetricsPanel";
import { ResearchPanel } from "@/components/ResearchPanel";
import { SimCanvas } from "@/components/SimCanvas";
import { WorkbenchNav } from "@/components/WorkbenchNav";
import { useSimulation } from "@/hooks/useSimulation";
import { DEFAULT_RULES } from "@/lib/simulation";
import type {
  ChatMessage,
  ClaudeResponse,
  Cluster,
  PhysicsConfig,
  ResearchConfig,
  RuleWeights,
} from "@/lib/types";

const HIGHLIGHT_CLEAR_MS = 8000;
const MAX_HISTORY_MESSAGES = 20;

export default function Home(): ReactElement {
  const {
    agentsRef,
    agentResearchRef,
    rulesRef,
    physicsConfig,
    researchConfig,
    researchTelemetry,
    experimentRecorder,
    snapshot,
    isPaused,
    startRun,
    pauseRun,
    reset,
    applyRuleUpdate,
    updatePhysicsConfig,
    updateResearchConfig,
    startRecording,
    stopRecording,
    clearRecording,
    playRecording,
    stopReplay,
  } = useSimulation();

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isPending, setIsPending] = useState(false);
  const [highlightClusterId, setHighlightClusterId] = useState<number | null>(null);
  const [frozenClusters, setFrozenClusters] = useState<Cluster[] | null>(null);
  const [metricsVisible, setMetricsVisible] = useState(true);
  const [chatVisible, setChatVisible] = useState(true);
  const [researchVisible, setResearchVisible] = useState(true);
  const [devRules, setDevRules] = useState<RuleWeights>({ ...DEFAULT_RULES });
  const [pendingChange, setPendingChange] = useState<
    | { kind: "research"; update: Partial<ResearchConfig> }
    | { kind: "physics"; update: Partial<PhysicsConfig> }
    | { kind: "rule"; key: keyof RuleWeights; value: number }
    | null
  >(null);

  const highlightClearRef = useRef<number | null>(null);

  const clearHighlightTimer = useCallback(() => {
    if (highlightClearRef.current !== null) {
      clearTimeout(highlightClearRef.current);
      highlightClearRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearHighlightTimer();
  }, [clearHighlightTimer]);

  const applyPendingChange = useCallback(
    (
      change:
        | { kind: "research"; update: Partial<ResearchConfig> }
        | { kind: "physics"; update: Partial<PhysicsConfig> }
        | { kind: "rule"; key: keyof RuleWeights; value: number },
    ) => {
      if (change.kind === "research") {
        updateResearchConfig(change.update);
        return;
      }
      if (change.kind === "physics") {
        updatePhysicsConfig(change.update);
        return;
      }
      setDevRules((r) => {
        const next = { ...r, [change.key]: change.value };
        Object.assign(rulesRef.current, { [change.key]: change.value });
        return next;
      });
    },
    [rulesRef, updatePhysicsConfig, updateResearchConfig],
  );

  const requestChange = useCallback(
    (
      change:
        | { kind: "research"; update: Partial<ResearchConfig> }
        | { kind: "physics"; update: Partial<PhysicsConfig> }
        | { kind: "rule"; key: keyof RuleWeights; value: number },
    ) => {
      if (!isPaused) {
        pauseRun();
        setPendingChange(change);
        return;
      }
      applyPendingChange(change);
    },
    [applyPendingChange, isPaused, pauseRun],
  );

  const patchDevRule = useCallback(
    (key: keyof RuleWeights, value: number) => {
      requestChange({ kind: "rule", key, value });
    },
    [requestChange],
  );

  const handleApplyOnly = useCallback(() => {
    if (!pendingChange) return;
    applyPendingChange(pendingChange);
    window.setTimeout(reset, 0);
    setPendingChange(null);
  }, [applyPendingChange, pendingChange, reset]);

  const handleApplyAndRestart = useCallback(() => {
    if (!pendingChange) return;
    applyPendingChange(pendingChange);
    window.setTimeout(() => {
      reset();
      window.setTimeout(startRun, 0);
    }, 0);
    setPendingChange(null);
  }, [applyPendingChange, pendingChange, reset, startRun]);

  const handleSendMessage = useCallback(
    async (userMessage: string) => {
      if (!snapshot) return;

      const historyForApi = chatHistory.slice(-MAX_HISTORY_MESSAGES);
      const userMsg: ChatMessage = {
        role: "user",
        content: userMessage,
        timestamp: Date.now(),
      };

      setChatHistory((h) => [...h, userMsg]);
      setIsPending(true);
      clearHighlightTimer();
      setHighlightClusterId(null);
      setFrozenClusters(null);

      const frozenSnapshot = structuredClone(snapshot);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            snapshot: frozenSnapshot,
            research: {
              config: researchConfig,
              telemetry: researchTelemetry,
            },
            history: historyForApi,
            userMessage,
          }),
        });
        const data = (await res.json()) as ClaudeResponse;

        const assistantMsg: ChatMessage = {
          role: "assistant",
          content: data.message,
          timestamp: Date.now(),
        };
        setChatHistory((h) => [...h, assistantMsg]);

        if (data.rule_update) {
          applyRuleUpdate(data.rule_update);
          setDevRules((current) => ({ ...current, ...data.rule_update }));
        }

        if (data.highlight_cluster != null) {
          setHighlightClusterId(data.highlight_cluster);
          setFrozenClusters(frozenSnapshot.clusters);
          clearHighlightTimer();
          highlightClearRef.current = window.setTimeout(() => {
            setHighlightClusterId(null);
            setFrozenClusters(null);
            highlightClearRef.current = null;
          }, HIGHLIGHT_CLEAR_MS);
        }
      } catch {
        setChatHistory((h) => [
          ...h,
          {
            role: "assistant",
            content: "Request failed — check your connection and try again.",
            timestamp: Date.now(),
          },
        ]);
      } finally {
        setIsPending(false);
      }
    },
    [
      snapshot,
      chatHistory,
      researchConfig,
      researchTelemetry,
      applyRuleUpdate,
      clearHighlightTimer,
    ],
  );

  return (
    <div className="flex h-[100dvh] min-h-0 w-full flex-row bg-[var(--bg-page)]">
      <WorkbenchNav active="lab" />
      <div className="flex w-10 shrink-0 flex-col items-center border-r border-[var(--border-subtle)] bg-[var(--bg-canvas)] py-2 font-mono text-[10px]">
        <button
          type="button"
          onClick={() => setChatVisible((v) => !v)}
          className="mb-1 flex h-9 w-8 items-center justify-center rounded border transition-colors duration-200"
          style={{
            borderColor: chatVisible ? "var(--accent-glow)" : "transparent",
            color: chatVisible ? "var(--text-primary)" : "var(--text-secondary)",
          }}
        >
          CHAT
        </button>
      </div>
      {chatVisible ? (
        <div className="w-[340px] min-w-[300px] max-w-[420px] shrink-0">
          <ChatPanel
            side="left"
            history={chatHistory}
            onSendMessage={handleSendMessage}
            isPending={isPending}
          />
        </div>
      ) : null}
      <div className="relative flex min-w-0 flex-1 flex-col p-6">
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden">
          <SimCanvas
            agentsRef={agentsRef}
            agentResearchRef={agentResearchRef}
            highlightClusterId={highlightClusterId}
            frozenClusters={frozenClusters}
          />
        </div>
        <MetricsPanel
          snapshot={snapshot}
          isVisible={metricsVisible}
          onToggle={() => setMetricsVisible((v) => !v)}
        />
      </div>
      <div className="flex w-10 shrink-0 flex-col items-center border-l border-[var(--border-subtle)] bg-[var(--bg-canvas)] py-2 font-mono text-[10px]">
        <button
          type="button"
          onClick={() => setResearchVisible((v) => !v)}
          className="mb-1 flex h-9 w-8 items-center justify-center rounded border transition-colors duration-200"
          style={{
            borderColor: researchVisible ? "var(--accent-glow)" : "transparent",
            color: researchVisible ? "var(--text-primary)" : "var(--text-secondary)",
          }}
        >
          RES
        </button>
      </div>
      {researchVisible ? (
        <div className="w-[360px] min-w-[320px] max-w-[440px] shrink-0">
          <ResearchPanel
            config={researchConfig}
            telemetry={researchTelemetry}
            recorder={experimentRecorder}
            rules={devRules}
            physics={physicsConfig}
            isPaused={isPaused}
            onRun={startRun}
            onPause={pauseRun}
            onReset={reset}
            onChange={(update) => requestChange({ kind: "research", update })}
            onRuleChange={patchDevRule}
            onPhysicsChange={(update) => requestChange({ kind: "physics", update })}
            onStartRecording={startRecording}
            onStopRecording={stopRecording}
            onClearRecording={clearRecording}
            onPlayRecording={playRecording}
            onStopReplay={stopReplay}
          />
        </div>
      ) : null}
      {pendingChange ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4">
          <section className="w-full max-w-md border border-[var(--accent-glow)] bg-[var(--bg-canvas)] shadow-2xl">
            <header className="border-b border-[var(--border-subtle)] px-4 py-3">
              <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--text-primary)]">
                Run paused for setting change
              </h2>
            </header>
            <div className="space-y-4 px-4 py-4 text-sm leading-6 text-[var(--text-secondary)]">
              <p>
                Changing a variable during a run invalidates the current experimental state. The
                run is paused until you choose how to handle this setting change.
              </p>
              <div className="grid gap-2 font-mono text-[11px]">
                <button
                  type="button"
                  onClick={() => setPendingChange(null)}
                  className="h-9 rounded border border-[var(--border-subtle)] bg-[var(--bg-panel)] text-[var(--text-secondary)] hover:border-[var(--accent-glow)] hover:text-[var(--text-primary)]"
                >
                  revert setting change
                </button>
                <button
                  type="button"
                  onClick={handleApplyAndRestart}
                  className="h-9 rounded border border-[var(--accent-glow)] bg-[var(--accent-soft)] text-[var(--text-primary)]"
                >
                  apply setting and restart run
                </button>
                <button
                  type="button"
                  onClick={handleApplyOnly}
                  className="h-9 rounded border border-[var(--border-subtle)] bg-[var(--bg-panel)] text-[var(--text-secondary)] hover:border-[var(--accent-glow)] hover:text-[var(--text-primary)]"
                >
                  apply setting, do not restart yet
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
