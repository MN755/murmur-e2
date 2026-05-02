"use client";

import { useState, type ReactElement } from "react";

import { WorkbenchNav } from "@/components/WorkbenchNav";

const DOCS = [
  {
    id: "overview",
    title: "Research Workstation",
    body: [
      "Murmur is a live multi-agent research workspace. The central canvas is the environment, the left panel is the observer chat, and the right panel is the experiment control and telemetry surface.",
      "The tool is intended for exploratory analysis of communication, trust, adversarial behavior, consensus, and interaction dynamics. It is not a game layer on top of the swarm.",
      "The core mental model is a workbench. The Lab route is for live runs, the Graph route is for projection and comparison, and the Docs route is for interpretation. Each route shares the same experiment vocabulary so a parameter means the same thing everywhere.",
      "Agents have position, velocity, communication memory, a stable session key, local trust state, belief state, infection state, and a malicious flag when configured. The visual canvas only shows a subset of that state; the right panel and backend API expose the measurement layer.",
      "Use the tool for hypothesis generation first. The physics and adversarial models are configurable research abstractions, not claims that a particular drone swarm, immune system, market, or communication network behaves exactly this way.",
    ],
  },
  {
    id: "layout",
    title: "Workbench Layout",
    body: [
      "Use the left activity rail to move between Lab, Docs, and Graph. In the Lab, the CHAT and RES tabs open or close the side panels so the canvas can be inspected without losing state.",
      "The simulation continues while panels are closed. Closing a panel only changes visibility; it does not reset the experiment.",
      "The left chat panel is the conversational observer. It receives the latest swarm snapshot and experiment telemetry when you ask a question. The right panel is the instrument surface. It contains monitor, experiment, physics, development, and backend API tabs.",
      "The workbench follows VS Code-style behavior: routes are tools, sidebars are optional, and the central surface is the active artifact. The canvas is not inside a decorative card because it is the primary research view.",
      "If you need the maximum visual field, close both CHAT and RES. If you need reproducibility, keep RES open on the experiment tab and set seed, physics mode, adversary mode, and graph settings before recording.",
    ],
  },
  {
    id: "experiments",
    title: "Experiment Modes",
    body: [
      "Communication mode studies how local rebroadcasting changes information as fragments move through independently keyed agents.",
      "Collision mode adds a local interaction field so near agents perturb each other's trajectories. Exclusion mode lets agents identify and quarantine suspicious participants. Deception mode keeps communication active while feeding known adversaries distorted information.",
      "Communication mode is best for observing signal propagation, lineage depth, mutation rate, and reconstructability. Increase radius and packets to make the network denser; increase mutation to make recovery harder.",
      "Collision mode is best for studying spatial instability. With boids physics it behaves like an added local perturbation. With field or rigid physics, collision settings become more important because agents can push, deflect, or repel each other through the physics layer.",
      "Exclusion mode is best for containment. Agents reduce contact with sufficiently suspicious senders. This can protect the group, but it can also fragment the graph if suspicion rises too early or the radius is low.",
      "Deception mode is best for counter-adversarial information work. Instead of only avoiding a malicious agent, agents can feed it false or distorted content while preserving communication with trusted peers.",
    ],
  },
  {
    id: "signals",
    title: "Information Lineage",
    body: [
      "Every fragment has an origin, parent, source carrier, hop count, TTL, value, and lineage hash. The panel summarizes branch count, max depth, variants per origin, and reconstructability.",
      "High branch count with low reconstructability means the original information is spreading but becoming harder to recover from observed variants.",
      "A root fragment is created by an originating agent. Every transmission creates a child fragment with a parent pointer, a transformed value, a hop count, and a new lineage hash. This lets the system summarize a branching tree without storing an unbounded amount of UI state.",
      "TTL controls how many additional transmissions a fragment can survive. Lower TTL produces short-lived local information. Higher TTL produces longer chains and more opportunity for divergence.",
      "Variants per origin estimates how many distinct transformed values exist for a single originating signal. Reconstructability is a normalized estimate of how clean the observed signal family remains as variants accumulate.",
      "Use lineage metrics together. Branch count alone can be good or bad depending on context. Branch count rising with recoverability stable suggests robust spread. Branch count rising while recoverability drops suggests mutation or adversarial distortion is overwhelming the network.",
    ],
  },
  {
    id: "topology",
    title: "Network Topology",
    body: [
      "The topology metrics describe the latest contact graph: connected components, largest component size, isolated agents, average degree, and low-degree bridge agents.",
      "These metrics are most useful when tuning radius, interval, speed, or collision coupling because they reveal whether communication loss is spatial, behavioral, or adversarial.",
      "Connected components count how many separate communication islands exist in the latest broadcast window. Largest component size tells you whether most agents remain in one graph or the network is splitting.",
      "Average degree is the mean number of local contacts per agent in the latest contact graph. It is sensitive to radius, density, speed, and avoidance behavior.",
      "Bridge-like agents are low-degree connectors. They are not exact graph-theory articulation points, but they are useful warning indicators: if many communication paths rely on low-degree agents, the system may be fragile under movement or adversarial pressure.",
      "Communication loss and recovery should be read as a topology process. Watch isolated agents, components, recovered agents, and largest component together rather than focusing on one number.",
    ],
  },
  {
    id: "adversaries",
    title: "Adversarial Profiles",
    body: [
      "Corrupt agents distort content aggressively. Replay agents recycle prior content. Trust-farm agents behave normally while suspicion is low, then distort later. Isolate agents target low-context receivers.",
      "Compare strategies using known bad, quarantine, false feed, average suspicion, and consensus convergence.",
      "Infect agents actively alter receivers. Infection can be known immediately, hidden, learned over time, or revealed after a delay. Infected agents drift in belief, confidence, trust, and content behavior until the infection is discovered.",
      "Corrupt is the easiest strategy to detect because it creates obvious divergence. Replay can be harder because it looks familiar. Trust-farm is designed to evade early suspicion. Isolate targets agents with limited context, which can create localized failures.",
      "In deception mode, the defender behavior changes from simple fear to active countermeasure. Agents can try to keep distance from known adversaries while feeding adversaries false content and reducing nearby exposure.",
      "When evaluating adversaries, compare direct harm and indirect harm. Direct harm appears as infected count, low recoverability, or distorted beliefs. Indirect harm appears as fragmentation, lower degree, reduced convergence, or excessive quarantine.",
    ],
  },
  {
    id: "consensus",
    title: "Consensus",
    body: [
      "Consensus rules update local beliefs through neighbor contact. Weighted trust relies on sender trust, majority pushes binary drift, Bayesian update treats neighbor belief as evidence, and confidence decay models weakening certainty.",
      "Mean belief, convergence, and polarized agent count show whether the group is forming consensus or splitting into incompatible subgroups.",
      "Weighted trust is the default because it ties social learning to observed reliability. It is useful when adversary detection matters because suspicious or infected agents naturally lose influence.",
      "Majority is intentionally coarse. It shows how quickly a population can snap toward binary agreement under local pressure. It is useful for polarization experiments.",
      "Bayesian update treats neighbor belief as evidence. It can converge quickly when the network is connected, but can also amplify early misinformation.",
      "Confidence decay lets certainty weaken under unstable conditions. It is useful when you want agents to become less committed after noisy or adversarial contact.",
      "Consensus metrics should be interpreted with topology. A high convergence score in a fragmented graph can mean each island internally agrees while the full population remains divided.",
    ],
  },
  {
    id: "recording",
    title: "Recording And Replay",
    body: [
      "Use record to capture telemetry frames over time. Replay pauses the live environment and cycles through recorded frames so failures and recoveries can be inspected repeatedly.",
      "Use deterministic seed values before recording when you need comparable runs across parameter changes.",
      "A recorded frame contains simulated time, the active research configuration, and research telemetry. It does not currently serialize every canvas position or every fragment lineage event to disk, so it should be treated as a telemetry replay rather than a full state restore.",
      "For comparison experiments, set a seed, choose a physics mode, configure the adversary, then record. Repeat with one parameter changed. Use the Graph workspace or backend API to compare expected trajectories before running long live trials.",
      "Fast-forward changes simulated time rather than hiding frames. Higher speed advances communication windows sooner and substeps the environment so long waits become shorter without simply dropping the experiment.",
      "When reporting results, include seed, mode, physics mode, adversary strategy, infection awareness, radius, interval, TTL, mutation, and speed. Those are the primary reproducibility controls.",
    ],
  },
  {
    id: "graph",
    title: "Graph Workspace",
    body: [
      "The Graph page computes headless outcomes from the same research settings used in the live panel. It is for comparing metric trajectories before spending time on a visual run.",
      "Use it to reason about trust, adversary trust, adversary belief, content volume, movement near adversaries, topology, and signal recoverability.",
      "The graph remains empty until you press run. This prevents page navigation from performing expensive work before the settings are reviewed.",
      "The x-axis can be time or another projected metric. The y-axis is one or more selected metrics. For example, set X to time and select collective trust to study trust over run progress. Set X to content volume and Y to recoverability to inspect how signal load correlates with signal recovery.",
      "Graph outputs are normalized from 0 to 1 so different metrics can be compared on one chart. Use the summary readout for final values and the legend buttons to reduce the graph to the specific relationship you care about.",
      "The same projection data is available from the backend API, which is useful for AI agents, batch tests, and offline report generation.",
      "The current graph uses deterministic headless execution of the same agent loop as the lab. It computes agent motion, information exchange, adversary behavior, infection state, consensus, and telemetry sample by sample. It is not a hand-shaped curve.",
      "Changing settings after a graph has been computed invalidates the dataset. The workspace asks whether to revert the change, apply and rerun, or apply and leave the graph empty until a later run.",
    ],
  },
  {
    id: "physics",
    title: "Physics Engines",
    body: [
      "The physics tab exposes three modes. Boids is the original lightweight flocking model. Field mode uses pairwise forces, damping, gravity, charge, and spring-like attraction. Rigid mode adds iterative collision resolution with restitution and friction.",
      "Boids is useful when you want interpretable flocking behavior and stable demos. Field mode is useful for richer spatial coupling without hard collisions. Rigid mode is useful when contact, deflection, and boundary interactions matter.",
      "Agent radius controls collision size. Mass changes acceleration response. Damping removes energy over time. Restitution controls bounce. Friction controls tangential energy loss during collision. Gravity adds vertical acceleration. Charge and spring shape local attraction or repulsion.",
      "Physics mode changes movement but not the meaning of research telemetry. Communication still depends on radius and contact windows. Adversaries still alter information and infection state. The physics engine changes which agents are near each other and how contact opportunities emerge.",
      "For careful comparisons, use the same seed and change only one physics parameter at a time. Physics settings can produce emergent differences that look like adversarial behavior, so compare topology metrics before drawing conclusions about trust or infection.",
      "Quantum mode is a wave-field abstraction. It adds phase-based interference, entanglement-radius velocity coupling, decoherence blending, and rare tunneling jumps. It is included for exploratory analog modeling; it should be described as quantum-inspired unless it is validated against a specific physical system.",
      "The physics tab contains all core physics controls, while the DEV tab keeps the original boids rule variables. Exported experiment JSON includes both, so papers can state exactly which engine and parameter values were used.",
      "Field mode uses pairwise inverse-square force terms for charge-like interaction and Hooke-style spring terms for local attraction or separation. Rigid mode adds impulse response with restitution and tangential friction.",
      "The platform does not claim molecular, plasma, or quantum accuracy by default. It exposes physically motivated equations as controllable interaction kernels. If a paper depends on a physical interpretation, validate the selected kernel against the target domain before making domain claims.",
    ],
  },
  {
    id: "backend",
    title: "Backend Runs",
    body: [
      "The backend-only route is /api/research/run. It accepts POST requests with a config object and optional steps value. It returns graph-ready datasets, metric series, summary values, and short research notes.",
      "This route exists so AI agents, scripts, and tests can run experiments without opening the browser. It is the correct entry point for automated analysis, batch comparisons, generated reports, and regression tests.",
      "A minimal body is an empty object. A controlled body can include any research config fields: mode, seed, environmentSpeed, communicationRadius, maliciousStrategy, infectionAwareness, consensusRule, and related numeric parameters.",
      "The response has dataset for row-wise plotting, series for metric-wise plotting, summary for final values, and researchNotes for human-readable interpretation. The endpoint uses deterministic headless execution of the agent loop, not a visual replay.",
      "Future backend work should add true headless live simulation snapshots, CSV export, and run manifests. The current API establishes the contract so those additions can slot in without changing the UI model.",
      "The API now runs deterministic headless execution of the same agent loop used by the lab. It does not use visual estimates or manually shaped curves. Each sample point comes from simulated agent actions, research transmission updates, adversary effects, infection updates, and telemetry extraction.",
      "For formal reporting, export JSON from the API tab. The export includes schema version, timestamp, research config, physics config, boids config, and reproducibility notes. Include this JSON as supplemental material when a run is used in a paper or report.",
    ],
  },
  {
    id: "run-lifecycle",
    title: "Run Lifecycle",
    body: [
      "The lab starts idle. Agents are initialized from the current seed, but the environment does not advance until run is pressed.",
      "Run starts or resumes the requestAnimationFrame loop. Pause stops time advancement without changing the current state. Reset reinitializes agents, research memory, telemetry, infection state, and runtime counters from the current settings.",
      "Reset does not change settings. This is important for formal work because the selected variables remain stable while the experimental state returns to initial conditions.",
      "If a setting changes while the lab is running, the loop pauses immediately. The confirmation dialog exists because a mid-run parameter change creates an ambiguous dataset.",
      "Revert setting change keeps the run state and settings as they were before the attempted edit. Apply setting and restart run accepts the new setting and reinitializes the experiment. Apply setting, do not restart yet accepts the new setting and leaves the system idle.",
      "For formal experiments, change settings only while idle, then run. If you intentionally change a setting mid-run, document the interruption and do not treat the resulting trace as a single uninterrupted experimental condition.",
    ],
  },
  {
    id: "affect-model",
    title: "Agent Affect Model",
    body: [
      "Each agent has bounded affect variables from 0 to 1: valence, arousal, fear, trust drive, curiosity, aggression, and cohesion.",
      "These values are not story labels. They are state variables that modify contact weighting, consensus influence, infection response, avoidance, and blockade behavior.",
      "Valence tracks positive or negative contact context. Arousal tracks activation under uncertainty or threat. Fear increases after suspicious, infected, or malicious contact. Trust drive changes how much a receiver accepts social evidence.",
      "Curiosity increases the willingness to process accepted information. Aggression models stronger response to visible threat. Cohesion models the pressure to stay with the non-malicious group when the network is under attack.",
      "Emotion plasticity controls how quickly affect changes. A low value produces slow-moving agents with stable response profiles. A high value produces rapidly adapting agents that can overreact to transient noise.",
      "Fear contagion controls how much threat evidence increases fear and arousal. Cohesion drive controls how strongly agents try to stay together under adversarial pressure. Avoidance controls motion away from known or highly suspicious adversaries.",
      "Blockade strength controls tangential containment behavior. When fear and cohesion are both high, non-malicious agents can form a moving containment pattern around a known adversary rather than only fleeing. This is implemented as a force term, not as scripted behavior.",
      "To disable affect as an experimental variable, turn the emotion model off. The agents still communicate and move, but consensus and defensive motion no longer use affect weighting.",
    ],
  },
  {
    id: "infection-defense",
    title: "Infection And Defense",
    body: [
      "The infect adversary strategy actively changes receiver state on contact. Infection alters belief, trust, confidence, affect, and future communication behavior.",
      "Known infection means the affected agent immediately knows it is compromised. Hidden infection means the agent does not know. Learn over time reveals infection after load crosses a threshold. Delayed reveal uses a configured time delay.",
      "Infected agents accumulate infection load. Load reduces trust and confidence and shifts belief toward the adversarial attractor used by the current strategy.",
      "Defensive agents use suspicion, infection awareness, fear, cohesion, and topology. They can reduce contact, quarantine suspicious senders, avoid adversaries spatially, or feed adversaries false fragments in deception mode.",
      "The false-feed behavior is collective deception. It is not a cinematic trap. It works by changing fragment value and lineage hash when the receiver is malicious, while continuing to preserve non-malicious communication when possible.",
      "Containment behavior depends on local math. Agents only respond to visible or inferred adversarial state. If the adversary is hidden, containment should not appear until suspicion, infection awareness, or evidence reveals risk.",
      "Useful infection metrics include infected count, known infected count, mean fear, mean cohesion, blockade agents, average suspicion, quarantine count, false feed count, and recoverability.",
    ],
  },
  {
    id: "measurement-protocol",
    title: "Measurement Protocol",
    body: [
      "A formal run should begin with a fixed seed, a frozen configuration, and a declared data source: live recording, graph headless run, or backend API run.",
      "Do not compare two runs if multiple variables changed unless the experiment is explicitly factorial. Change one parameter at a time for single-factor analysis.",
      "Always report duration, sample count, seed, agent count, physics mode, research mode, adversary strategy, infection awareness, entropy settings, affect settings, and graph axes.",
      "Use normalized graph metrics for visual comparison and raw telemetry for detailed reporting. A normalized value of 0.7 does not always mean 70 percent of agents; the metric definition determines the interpretation.",
      "Collective trust is the average trust among non-malicious agents. Adversary trust and belief are averages among malicious agents. Content volume is active fragments normalized against a high-load reference.",
      "Connectedness is the largest connected component divided by total agents. Recoverability estimates how cleanly origins can be reconstructed from observed variants. Entropy combines configured disorder sources.",
      "Mean fear, mean cohesion, and blockade are affect-derived metrics. They are useful for measuring defensive posture under infection or adversarial pressure.",
      "When publishing or sharing results, include exported JSON next to screenshots. Screenshots show what happened; JSON explains the conditions under which it happened.",
    ],
  },
  {
    id: "settings-reference",
    title: "Settings Reference",
    body: [
      "Seed controls deterministic initialization of agent positions, keys, initial belief, confidence, and affect state.",
      "Environment speed multiplies simulated time. The engine substeps at high speed so the experiment advances faster without simply dropping the underlying interaction loop.",
      "Communication radius sets which nearby agents are eligible for fragment exchange. Broadcast interval sets how often exchange windows open. Packets per agent sets how many memory fragments are attempted per contact.",
      "TTL limits fragment lifetime by hop count. Mutation controls how aggressively a fragment value changes during encode or decode. Entropy, packet drop, link failure, sensor noise, and key drift introduce controlled disorder.",
      "Malicious count selects how many agents become adversarial. The selected adversaries are deterministic for a seed, which means repeated runs with the same seed assign the same malicious set.",
      "Suspicion threshold determines when agents treat a sender as risky. Consensus weight controls how strongly receiver belief changes after contact.",
      "Physics radius, mass, damping, restitution, friction, gravity, charge, spring, and solver settings control motion. Boids separation, alignment, cohesion, speed, and perception remain available in the DEV tab for the original lightweight engine.",
      "Affect settings control how agents adapt under social and adversarial pressure. They should be reported whenever emotion is enabled because they can materially change contact structure and consensus outcomes.",
    ],
  },
  {
    id: "headless-workflow",
    title: "Headless Workflow",
    body: [
      "The backend route /api/research/run runs without the browser canvas. It is intended for automated tests, AI analysis, batch sweeps, and dataset generation.",
      "POST a body containing research, physics, boids, durationMs, and sampleCount. Missing fields use the same defaults as the app.",
      "The response includes dataset rows, metric series, summary values, and notes. Each row includes normalized graph metrics plus raw telemetry.",
      "Use the headless endpoint when you need repeatability and speed. Use the lab when you need visual inspection. Use recording when you need an observed sequence from an interactive run.",
      "A batch workflow should export a base JSON configuration, generate controlled variants, call the API for each variant, then store response datasets with the exact input JSON.",
      "If an AI agent uses the endpoint, it should cite the dataset source and parameters rather than claiming it watched the visual canvas.",
    ],
  },
  {
    id: "entropy",
    title: "Entropy Controls",
    body: [
      "Entropy controls introduce controlled disorder into the experiment. They let a researcher separate clean communication failure from failure caused by noise, dropped packets, unstable keys, and unreliable links.",
      "Entropy rate is the global pressure applied to mutation and state instability. Packet drop is the probability that a fragment disappears during an otherwise valid contact. Link failure is the probability that a communication link fails for the broadcast window.",
      "Key drift mutates agent keys during a run. This is intentionally dangerous for reproducibility because it means agent identity remains stable but encoding behavior can change over time. Use it when modeling degraded cryptographic state, hardware drift, or identity instability.",
      "Sensor noise is reserved in the formal configuration as an observation-noise parameter. It is exported and available for formal run definitions even when a given visual panel does not use it directly.",
      "Entropy should be introduced gradually. First run a seed with entropy disabled, then introduce one entropy source at a time. This makes it possible to attribute effects to a specific uncertainty source.",
    ],
  },
  {
    id: "formal-options",
    title: "Formal Experiment Options",
    body: [
      "The API tab in the right panel exports the complete formal experiment configuration as JSON. This includes research settings, physics settings, boids settings, schema version, export timestamp, and notes.",
      "Use the exported JSON as the canonical description of an experiment. Screenshots are useful for communication, but JSON is the reproducible artifact.",
      "The exported schema is versioned as murmur.formal-experiment.v1. If future versions add fields or change semantics, the schema string should change so old papers and datasets can still be interpreted correctly.",
      "A good methods section should include the exported JSON, graph duration, sample count, seed, physics mode, adversary strategy, infection awareness policy, entropy settings, and whether the data came from live recording or headless execution.",
      "The hover question marks next to settings provide local definitions and point back to the docs. They are designed to behave like reference links: hover to inspect, move away to close.",
    ],
  },
  {
    id: "github-prep",
    title: "Repository And Push Prep",
    body: [
      "Before pushing to GitHub, run lint and build. Lint catches style and React/Next issues; build catches TypeScript and route-generation issues.",
      "The README is the public entry point. It should explain what Murmur is, how to run it, what routes exist, what the API does, and what scientific limitations apply.",
      "The changelog records the current platform-level changes. It is not a substitute for commit history, but it gives reviewers a fast summary of what changed in this iteration.",
      "Do not commit local secrets. The repository includes .env.example for the optional Anthropic key, while .env files remain ignored.",
      "A clean prep pass should include git status review, lint, build, and a quick route smoke test if a browser or local server is available.",
      "When preparing a paper-facing release, export a JSON configuration for representative runs and store it with any datasets generated from the headless endpoint.",
    ],
  },
  {
    id: "developer-notes",
    title: "Developer Notes",
    body: [
      "The app uses Next.js App Router. Interactive routes and panels are client components because they depend on local state, event handlers, animation frames, and browser APIs.",
      "The live agent arrays are stored in refs instead of state. This keeps the animation loop from triggering React reconciliation at frame rate.",
      "Telemetry is sampled into state so React panels update at a controlled cadence rather than on every physics tick.",
      "The chat route validates incoming snapshots and research context before building an observer prompt. If the Anthropic key is absent, the endpoint returns a safe fallback instead of blocking the research platform.",
      "Headless runs are deterministic for fixed settings. They use seeded initialization, the same research stepper, and the selected physics or boids mode.",
      "When adding a new setting, update the type definition, defaults, UI control, formal export, docs, API validation if relevant, headless execution if relevant, and README if it changes public usage.",
    ],
  },
] as const;

export default function DocsPage(): ReactElement {
  const [activeId, setActiveId] = useState<(typeof DOCS)[number]["id"]>("overview");
  const active = DOCS.find((doc) => doc.id === activeId) ?? DOCS[0];

  return (
    <div className="flex h-[100dvh] min-h-0 bg-[var(--bg-page)] text-[var(--text-primary)]">
      <WorkbenchNav active="docs" />
      <aside className="flex w-[280px] shrink-0 flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
        <header className="border-b border-[var(--border-subtle)] px-4 py-4">
          <h1 className="font-mono text-[11px] uppercase tracking-[0.14em]">Docs</h1>
          <p className="mt-1 font-mono text-[10px] text-[var(--text-secondary)]">
            manual / wiki
          </p>
        </header>
        <nav className="min-h-0 flex-1 overflow-y-auto p-2">
          {DOCS.map((doc) => (
            <button
              key={doc.id}
              type="button"
              onClick={() => setActiveId(doc.id)}
              className="mb-1 flex h-9 w-full items-center rounded px-3 text-left font-mono text-[11px] transition-colors duration-200"
              style={{
                background: doc.id === activeId ? "rgba(124,248,255,0.08)" : "transparent",
                color: doc.id === activeId ? "var(--text-primary)" : "var(--text-secondary)",
              }}
            >
              {doc.title}
            </button>
          ))}
        </nav>
      </aside>
      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-10 py-10">
          <div className="mb-8 border-b border-[var(--border-subtle)] pb-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-secondary)]">
              Murmur research manual
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[0.02em]">{active.title}</h2>
          </div>
          <article className="space-y-5 text-[15px] leading-7 text-[var(--text-primary)]">
            {active.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </article>
          <div className="mt-10 grid grid-cols-2 gap-3 border-t border-[var(--border-subtle)] pt-6 font-mono text-[11px] text-[var(--text-secondary)]">
            <div>Current page: {active.id}</div>
            <div className="text-right">{DOCS.length} manual sections</div>
          </div>
        </div>
      </main>
    </div>
  );
}
