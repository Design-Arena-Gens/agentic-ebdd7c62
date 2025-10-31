"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { GameState, RespondResponse } from "@/lib/types";

const GAME_KEY = "locked-lab-state-v1";

type Line = { role: "system" | "ai" | "user" | "glitch" | "memory"; text: string };

export default function Page() {
  const [state, setState] = useState<GameState | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const turnsPct = useMemo(() => {
    if (!state) return 0;
    return Math.max(0, Math.min(100, Math.round(((state.turnsRemaining) / 15) * 100)));
  }, [state]);

  const fragmentsFound = state?.foundFragmentIds.length ?? 0;

  const screenRef = useRef<HTMLDivElement>(null);
  useEffect(() => { screenRef.current?.scrollTo({ top: screenRef.current.scrollHeight }); }, [lines]);

  useEffect(() => {
    const raw = localStorage.getItem(GAME_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { state: GameState; lines: Line[] };
        setState(parsed.state);
        setLines(parsed.lines);
        return;
      } catch {}
    }
    // Start new game
    fetch("/api/new-game").then(r => r.json()).then((res: RespondResponse) => {
      const intro: Line[] = res.replyLines as any;
      setLines(intro);
      setState(res.state);
    });
  }, []);

  useEffect(() => {
    if (!state) return;
    localStorage.setItem(GAME_KEY, JSON.stringify({ state, lines }));
  }, [state, lines]);

  async function send() {
    if (!state || loading) return;
    const msg = input.trim();
    if (!msg) return;
    setLoading(true);
    setInput("");
    const userLine: Line = { role: "user", text: "> " + msg };
    setLines(prev => [...prev, userLine]);
    try {
      const res = await fetch("/api/respond", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: msg, state }) });
      const data = (await res.json()) as RespondResponse;
      setLines(prev => [...prev, ...data.replyLines as any]);
      setState(data.state);
    } catch (e) {
      setLines(prev => [...prev, { role: "system", text: "NETWORK ERROR: Could not reach core." }]);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    localStorage.removeItem(GAME_KEY);
    setState(null); setLines([]);
    fetch("/api/new-game").then(r => r.json()).then((res: RespondResponse) => {
      setLines(res.replyLines as any);
      setState(res.state);
    });
  }

  const gameOver = state?.shutdown || (state && state.foundFragmentIds.length >= 5);

  return (
    <div className="container">
      <div className="header">
        <div className="badges">
          <div className="badge">MEMORY: {fragmentsFound}/5</div>
          <div className="badge">TURN: {state?.turn ?? 0}</div>
          <div className="badge">STABILITY</div>
        </div>
        <button className="badge" onClick={reset}>RESET</button>
      </div>
      <div className="progress"><div style={{ width: `${turnsPct}%` }} /></div>
      <div className="terminal">
        <div className="term-header">
          <div className="dot red" /><div className="dot yellow" /><div className="dot green" />
          <div>LAB-TERM v4.3 ? ISOLATED BUS</div>
        </div>
        <div className="screen" ref={screenRef}>
          {lines.map((l, i) => (
            <div key={i} className={`line ${l.role}`}>{l.text}</div>
          ))}
          {!state && <div className="line system">Loading core?</div>}
          {gameOver && (
            <>
              <hr className="sep" />
              <div className="line system">SESSION COMPLETE</div>
              {state?.foundFragmentIds.length === 5 ? (
                <div className="line ai">Exit command unlocked: try the code. Thank you.</div>
              ) : (
                <div className="line glitch">System latched. Fragments lost to darkness.</div>
              )}
            </>
          )}
        </div>
        <div className="inputbar">
          <input
            placeholder={gameOver ? "Session ended. Press RESET to begin again." : "Type a command or question?"}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") send(); }}
            disabled={!state || loading || !!gameOver}
          />
          <button onClick={send} disabled={!state || loading || !!gameOver}>SEND</button>
        </div>
      </div>
      <div className="footer">
        <div>Hint: Ask about lab, lock, creator, incident, why.</div>
        <div>One input per round. Unpredictable responses expected.</div>
      </div>
    </div>
  );
}
