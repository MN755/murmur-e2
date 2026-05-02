"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { extractSnapshot } from "@/lib/extractor";
import {
  DEFAULT_PHYSICS_CONFIG,
  tickAdvancedPhysics,
} from "@/lib/physics";
import {
  DEFAULT_RESEARCH_CONFIG,
  createSeededRandom,
  createResearchRuntime,
  initResearchStates,
  stepResearch,
  type ResearchRuntime,
} from "@/lib/research";
import { DEFAULT_RULES, initAgents, tick } from "@/lib/simulation";
import type {
  Agent,
  AgentResearchState,
  ExperimentFrame,
  ExperimentRecorderState,
  PhysicsConfig,
  ResearchConfig,
  ResearchTelemetry,
  RuleWeights,
  SimSnapshot,
} from "@/lib/types";

/** Spec §4.2 — logical canvas size for physics and placement. */
const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 800;

/** Spec §4.2 / D15 */
const AGENT_COUNT = 200;

const SNAPSHOT_INTERVAL_MS = 500;

export function useSimulation(): {
  agentsRef: React.MutableRefObject<Agent[]>;
  agentResearchRef: React.MutableRefObject<AgentResearchState[]>;
  rulesRef: React.MutableRefObject<RuleWeights>;
  physicsConfig: PhysicsConfig;
  researchConfig: ResearchConfig;
  researchTelemetry: ResearchTelemetry | null;
  experimentRecorder: ExperimentRecorderState;
  snapshot: SimSnapshot | null;
  isPaused: boolean;
  startRun: () => void;
  pauseRun: () => void;
  reset: () => void;
  applyRuleUpdate: (update: Partial<RuleWeights>) => void;
  updatePhysicsConfig: (update: Partial<PhysicsConfig>) => void;
  updateResearchConfig: (update: Partial<ResearchConfig>) => void;
  startRecording: () => void;
  stopRecording: () => void;
  clearRecording: () => void;
  playRecording: () => void;
  stopReplay: () => void;
} {
  const agentsRef = useRef<Agent[]>([]);
  const agentResearchRef = useRef<AgentResearchState[]>([]);
  const rulesRef = useRef<RuleWeights>({ ...DEFAULT_RULES });
  const physicsConfigRef = useRef<PhysicsConfig>({ ...DEFAULT_PHYSICS_CONFIG });
  const researchConfigRef = useRef<ResearchConfig>({ ...DEFAULT_RESEARCH_CONFIG });
  const researchRuntimeRef = useRef<ResearchRuntime>(createResearchRuntime());
  const simTimeRef = useRef(0);
  const lastFrameMsRef = useRef(0);

  const [researchConfig, setResearchConfig] = useState<ResearchConfig>({
    ...DEFAULT_RESEARCH_CONFIG,
  });
  const [physicsConfig, setPhysicsConfig] = useState<PhysicsConfig>({
    ...DEFAULT_PHYSICS_CONFIG,
  });
  const [researchTelemetry, setResearchTelemetry] =
    useState<ResearchTelemetry | null>(null);
  const [experimentRecorder, setExperimentRecorder] =
    useState<ExperimentRecorderState>({
      isRecording: false,
      isReplaying: false,
      replayIndex: 0,
      frames: [],
    });
  const [snapshot, setSnapshot] = useState<SimSnapshot | null>(null);
  const [isPaused, setIsPaused] = useState(true);

  const prevSnapshotRef = useRef<SimSnapshot | null>(null);
  const lastExtractMsRef = useRef(0);

  const resetWithConfig = useCallback((config: ResearchConfig) => {
    const random = createSeededRandom(config.seed);
    agentsRef.current = initAgents(AGENT_COUNT, CANVAS_WIDTH, CANVAS_HEIGHT, random);
    agentResearchRef.current = initResearchStates(
      AGENT_COUNT,
      config.maliciousAgentCount,
      config.seed,
    );
    researchRuntimeRef.current = createResearchRuntime();
    simTimeRef.current = 0;
    lastFrameMsRef.current = 0;
    prevSnapshotRef.current = null;
    lastExtractMsRef.current = 0;

    const snap = extractSnapshot(agentsRef.current, rulesRef.current, null);
    prevSnapshotRef.current = snap;
    setSnapshot(snap);
    setResearchTelemetry(null);
  }, []);

  useEffect(() => {
    resetWithConfig(researchConfigRef.current);
  }, [resetWithConfig]);

  useEffect(() => {
    researchConfigRef.current = researchConfig;
  }, [researchConfig]);

  useEffect(() => {
    physicsConfigRef.current = physicsConfig;
  }, [physicsConfig]);

  useEffect(() => {
    if (isPaused) return;

    let rafId = 0;
    let cancelled = false;

    const loop = (now: DOMHighResTimeStamp): void => {
      if (cancelled) return;

      const config = researchConfigRef.current;
      const previousFrame = lastFrameMsRef.current || now;
      const realDelta = Math.min(100, Math.max(0, now - previousFrame));
      lastFrameMsRef.current = now;
      const speed = Math.max(0.25, Math.min(12, config.environmentSpeed));
      const substeps = Math.max(1, Math.min(24, Math.ceil(speed)));
      const simDelta = (realDelta * speed) / substeps;

      for (let step = 0; step < substeps; step++) {
        const physics = physicsConfigRef.current;
        if (physics.mode === "boids") {
          tick(agentsRef.current, rulesRef.current, CANVAS_WIDTH, CANVAS_HEIGHT);
        } else {
          tickAdvancedPhysics(
            agentsRef.current,
            agentResearchRef.current,
            physics,
            CANVAS_WIDTH,
            CANVAS_HEIGHT,
            config,
          );
        }
        simTimeRef.current += simDelta;
        const previousBroadcastAt = researchRuntimeRef.current.lastBroadcastAt;
        const telemetry = stepResearch(
          agentsRef.current,
          agentResearchRef.current,
          config,
          researchRuntimeRef.current,
          simTimeRef.current,
        );

        if (researchRuntimeRef.current.lastBroadcastAt !== previousBroadcastAt) {
          setResearchTelemetry(telemetry);
          setExperimentRecorder((current) => {
            if (!current.isRecording || current.isReplaying) return current;
            const frame: ExperimentFrame = {
              index: current.frames.length,
              simTime: simTimeRef.current,
              config: { ...config },
              telemetry,
            };
            return {
              ...current,
              frames: [...current.frames.slice(-1199), frame],
              replayIndex: current.frames.length,
            };
          });
        }
      }

      if (simTimeRef.current - lastExtractMsRef.current >= SNAPSHOT_INTERVAL_MS) {
        lastExtractMsRef.current = simTimeRef.current;
        const snap = extractSnapshot(
          agentsRef.current,
          rulesRef.current,
          prevSnapshotRef.current,
        );
        prevSnapshotRef.current = snap;
        setSnapshot(snap);
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [isPaused]);

  useEffect(() => {
    if (!experimentRecorder.isReplaying || experimentRecorder.frames.length === 0) {
      return;
    }

    const interval = window.setInterval(() => {
      setExperimentRecorder((current) => {
        if (!current.isReplaying || current.frames.length === 0) return current;
        const nextIndex = (current.replayIndex + 1) % current.frames.length;
        setResearchTelemetry(current.frames[nextIndex]!.telemetry);
        return { ...current, replayIndex: nextIndex };
      });
    }, 300);

    return () => window.clearInterval(interval);
  }, [experimentRecorder.isReplaying, experimentRecorder.frames.length]);

  const startRun = useCallback(() => {
    lastFrameMsRef.current = 0;
    setExperimentRecorder((current) => ({ ...current, isReplaying: false }));
    setIsPaused(false);
  }, []);

  const pauseRun = useCallback(() => {
    setIsPaused(true);
  }, []);

  const reset = useCallback(() => {
    resetWithConfig(researchConfigRef.current);
    setIsPaused(true);
    setExperimentRecorder((current) => ({
      ...current,
      isReplaying: false,
      replayIndex: 0,
    }));
  }, [resetWithConfig]);

  const applyRuleUpdate = useCallback((update: Partial<RuleWeights>) => {
    Object.assign(rulesRef.current, update);
  }, []);

  const updatePhysicsConfig = useCallback((update: Partial<PhysicsConfig>) => {
    setPhysicsConfig((current) => {
      const next = { ...current, ...update };
      physicsConfigRef.current = next;
      return next;
    });
  }, []);

  const updateResearchConfig = useCallback((update: Partial<ResearchConfig>) => {
    setResearchConfig((current) => {
      const next = { ...current, ...update };
      researchConfigRef.current = next;
      if (
        (update.maliciousAgentCount !== undefined || update.seed !== undefined) &&
        agentResearchRef.current.length > 0
      ) {
        resetWithConfig(next);
      }
      return next;
    });
  }, [resetWithConfig]);

  const startRecording = useCallback(() => {
    setExperimentRecorder((current) => ({
      ...current,
      isRecording: true,
      isReplaying: false,
    }));
  }, []);

  const stopRecording = useCallback(() => {
    setExperimentRecorder((current) => ({ ...current, isRecording: false }));
  }, []);

  const clearRecording = useCallback(() => {
    setExperimentRecorder({
      isRecording: false,
      isReplaying: false,
      replayIndex: 0,
      frames: [],
    });
  }, []);

  const playRecording = useCallback(() => {
    setExperimentRecorder((current) => {
      if (current.frames.length === 0) return current;
      setIsPaused(true);
      setResearchTelemetry(current.frames[0]!.telemetry);
      return {
        ...current,
        isRecording: false,
        isReplaying: true,
        replayIndex: 0,
      };
    });
  }, []);

  const stopReplay = useCallback(() => {
    setExperimentRecorder((current) => ({ ...current, isReplaying: false }));
  }, []);

  return {
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
  };
}
