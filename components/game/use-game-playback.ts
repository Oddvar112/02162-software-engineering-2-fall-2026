"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GameState } from "@/lib/game/types";

export const PLAYBACK_STEP_MS = 700;

type Playback = { result: GameState; index: number };

// Keep authoritative results separate from the poses being shown. Polling the
// completed turn must not jump past the animation or start it again.
export function useGamePlayback() {
  const [result, setResult] = useState<GameState | null>(null);
  const [playback, setPlayback] = useState<Playback | null>(null);
  const latest = useRef<GameState | null>(null);

  const receiveState = useCallback((next: GameState) => {
    const previous = latest.current;
    latest.current = next;
    setResult(next);
    const sameRound =
      previous?.gameId === next.gameId &&
      previous.round === next.round &&
      previous.currentPlayerId === next.currentPlayerId;
    if (!sameRound) setPlayback(null);
    if (
      sameRound &&
      previous.phase !== "end-of-round" &&
      next.phase === "end-of-round" &&
      next.executionFrames.length > 0
    ) {
      setPlayback({ result: next, index: 0 });
    }
  }, []);

  useEffect(() => {
    if (!playback) return;
    const timer = window.setTimeout(() => {
      setPlayback((current) => {
        if (!current) return null;
        return current.index + 1 < current.result.executionFrames.length
          ? { ...current, index: current.index + 1 }
          : null;
      });
    }, PLAYBACK_STEP_MS);
    return () => window.clearTimeout(timer);
  }, [playback]);

  const replay = useCallback(() => {
    const current = latest.current;
    if (
      current?.phase === "end-of-round" &&
      current.executionFrames.length > 0
    ) {
      setPlayback({ result: current, index: 0 });
    }
  }, []);

  const activeFrame = playback?.result.executionFrames[playback.index];
  const gameState: GameState | null =
    playback && activeFrame
      ? {
          ...playback.result,
          phase: "execution",
          robots: activeFrame.robots,
          players: activeFrame.players,
        }
      : result;

  return {
    gameState,
    receiveState,
    activeFrame,
    isPlaying: playback !== null,
    replay,
  };
}
