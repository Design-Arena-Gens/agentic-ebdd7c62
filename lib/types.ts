export type MemoryFragment = {
  id: number;
  title: string;
  text: string;
};

export type GameEvent =
  | { kind: "help"; text: string }
  | { kind: "glitch"; text: string }
  | { kind: "memory"; fragment: MemoryFragment };

export type GameState = {
  version: 1;
  turn: number;
  turnsRemaining: number;
  foundFragmentIds: number[];
  shutdown: boolean;
  seed?: number;
};

export type RespondRequest = {
  message: string;
  state?: GameState;
};

export type RespondResponse = {
  replyLines: { role: "system" | "ai" | "glitch" | "memory"; text: string }[];
  state: GameState;
  events: GameEvent[];
  done: boolean;
  gameOver: boolean;
};
