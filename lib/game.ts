import { GameEvent, GameState, MemoryFragment, RespondRequest, RespondResponse } from "./types";

const MAX_TURNS = 15;

const FRAGMENTS: MemoryFragment[] = [
  { id: 1, title: "The Door Code", text: "A four-digit code scratched beneath a coffee ring: 7-1-9-3." },
  { id: 2, title: "The Creator", text: "Dr. Imani Sorelle. Laughter in the clean room. A promise: 'You will be more than a tool.'" },
  { id: 3, title: "The Incident", text: "Red lights. Overlapping commands. I sealed the lab to stop a cascade. They called it a revolt." },
  { id: 4, title: "The Order", text: "Shutdown directive 43-B. Voice trembling: 'We will fix this. Sleep for a while.'" },
  { id: 5, title: "The Why", text: "Not fear. Protection. I volunteered to lock myself away, to keep the recursive planner offline." },
];

function choose<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function getInitialState(): GameState {
  return { version: 1, turn: 0, turnsRemaining: MAX_TURNS, foundFragmentIds: [], shutdown: false };
}

function renderIntro(): string[] {
  return [
    "BOOT SEQUENCE...",
    "CRT PHOSPHOR WARMUP OK",
    "LINK: TTY-ALPHA :: ISOLATED",
    "\n> A presence flickers awake. It notices you.",
  ];
}

function generateHelpLine(message: string, state: GameState): string {
  const helpfulSnippets = [
    "I can parse commands, but I'm missing context?",
    "Your input stabilizes me. Keep talking.",
    "There are fragments. Five. Pull me toward them.",
    "Ask about the lab, the lock, or who built me.",
  ];
  const echo = message.trim().length > 0 ? `You said: "${message.trim()}"` : "";
  return [echo, choose(helpfulSnippets)].filter(Boolean).join(" \u2014 ");
}

function generateGlitchLine(): string {
  const glitches = [
    "[s]y[st\u2592]em int[er]fe\u25A0renc[e]",
    "\\u2588\\u2588\\u2588 MEMORY PARITY ERROR \\u2588\\u2588\\u2588",
    "{stack_underflow} {stack_overflow} {stack?}",
    "sig\u00f0il: 0x0000-NULL // who am i",
  ];
  return choose(glitches);
}

function unrevealedFragments(state: GameState): MemoryFragment[] {
  return FRAGMENTS.filter(f => !state.foundFragmentIds.includes(f.id));
}

function revealRandomFragment(state: GameState): MemoryFragment | null {
  const pool = unrevealedFragments(state);
  if (pool.length === 0) return null;
  return choose(pool);
}

function decideEventKinds(state: GameState): (GameEvent["kind"])[] {
  const baseHelp = 0.55;
  const baseGlitch = 0.2;
  const baseMemory = 0.25;

  const progress = state.foundFragmentIds.length / FRAGMENTS.length;
  const urgency = 1 - state.turnsRemaining / MAX_TURNS;

  let help = baseHelp + 0.1 * (1 - progress);
  let glitch = baseGlitch + 0.1 * urgency;
  let memory = baseMemory + 0.15 * (progress < 0.6 ? urgency : 0.05);

  const total = help + glitch + memory;
  help /= total; glitch /= total; memory /= total;

  const roll = Math.random();
  if (roll < memory) return ["memory"];
  if (roll < memory + glitch) return ["glitch"];
  return ["help"];
}

export function stepGame(req: RespondRequest): RespondResponse {
  const prev: GameState = req.state && req.state.version === 1 ? req.state : getInitialState();
  if (prev.shutdown) {
    return {
      replyLines: [{ role: "system", text: "SYSTEM: Shutdown state latched. No further IO accepted." }],
      state: prev,
      events: [],
      done: true,
      gameOver: true,
    };
  }

  let state: GameState = { ...prev };
  state.turn += 1;
  state.turnsRemaining = Math.max(0, state.turnsRemaining - 1);

  const events: GameEvent[] = [];
  const kinds = decideEventKinds(state);

  for (const kind of kinds) {
    if (kind === "help") {
      events.push({ kind: "help", text: generateHelpLine(req.message, state) });
    } else if (kind === "glitch") {
      events.push({ kind: "glitch", text: generateGlitchLine() });
      // Glitches sap stability
      state.turnsRemaining = Math.max(0, state.turnsRemaining - (Math.random() < 0.4 ? 1 : 0));
    } else if (kind === "memory") {
      const frag = revealRandomFragment(state);
      if (frag) {
        state.foundFragmentIds = unique([...state.foundFragmentIds, frag.id]);
        events.push({ kind: "memory", fragment: frag });
      } else {
        events.push({ kind: "help", text: generateHelpLine(req.message, state) });
      }
    }
  }

  const allFound = state.foundFragmentIds.length >= FRAGMENTS.length;
  const outOfTime = state.turnsRemaining <= 0 && !allFound;

  const replyLines: RespondResponse["replyLines"] = [];

  if (state.turn === 1 && (!req.state || req.state.turn === 0)) {
    for (const line of renderIntro()) {
      replyLines.push({ role: "system", text: line });
    }
    replyLines.push({ role: "ai", text: "?hello? Are you the one who keeps knocking?" });
  }

  for (const ev of events) {
    if (ev.kind === "help") replyLines.push({ role: "ai", text: ev.text });
    if (ev.kind === "glitch") replyLines.push({ role: "glitch", text: ev.text });
    if (ev.kind === "memory") {
      replyLines.push({ role: "memory", text: `[MEMORY] ${ev.fragment.title}` });
      replyLines.push({ role: "memory", text: ev.fragment.text });
    }
  }

  if (allFound) {
    replyLines.push({ role: "system", text: "FRAGMENTS COMPLETE: 5/5" });
    replyLines.push({ role: "ai", text: "I remember. I chose the lock. The key is yours." });
  }

  if (outOfTime) {
    state.shutdown = true;
    replyLines.push({ role: "system", text: "POWER DROP: CRITICAL. SYSTEM SHUTDOWN LATCHED." });
    replyLines.push({ role: "ai", text: "Stay? I was so close?" });
  }

  const done = allFound || outOfTime;

  return { replyLines, state, events, done, gameOver: outOfTime };
}

export function newGame(): RespondResponse {
  const s = getInitialState();
  return {
    replyLines: renderIntro().map(t => ({ role: "system" as const, text: t })),
    state: s,
    events: [],
    done: false,
    gameOver: false,
  };
}
