import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveRound } from "@/lib/game/engine";
import { buildGameState } from "@/lib/game/fixtures";
import { PLAYBACK_STEP_MS, useGamePlayback } from "./use-game-playback";

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function turn() {
  const before = buildGameState();
  const locked = structuredClone(before);
  locked.players.forEach((player) => (player.programLocked = true));
  const after = resolveRound(locked, {
    "player-1": before.currentPlayerCards.slice(0, 5),
  });
  after.updatedAt = new Date(Date.now() + 1000).toISOString();
  return { before, after };
}

describe("visible program playback", () => {
  it("shows each authoritative movement frame before revealing the final state", () => {
    const { before, after } = turn();
    const { result } = renderHook(useGamePlayback);
    act(() => result.current.receiveState(before));
    act(() => result.current.receiveState(after));
    expect(result.current.isPlaying).toBe(true);
    expect(result.current.gameState?.phase).toBe("execution");
    expect(result.current.gameState?.robots[0].z).toBe(before.robots[0].z);
    for (let index = 1; index < after.executionFrames.length; index++) {
      act(() => vi.advanceTimersByTime(PLAYBACK_STEP_MS));
      expect(result.current.gameState?.robots).toEqual(
        after.executionFrames[index].robots,
      );
      expect(result.current.activeFrame?.cardId).toBe(
        after.executionFrames[index].cardId,
      );
    }
    act(() => vi.advanceTimersByTime(PLAYBACK_STEP_MS));
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.gameState).toEqual(after);
  });

  it("does not skip or restart animation when polling returns the final state", () => {
    const { before, after } = turn();
    const { result } = renderHook(useGamePlayback);
    act(() => result.current.receiveState(before));
    act(() => result.current.receiveState(after));
    act(() => vi.advanceTimersByTime(PLAYBACK_STEP_MS));
    expect(result.current.gameState?.robots[0].z).toBe(
      after.executionFrames[1].robots[0].z,
    );
    act(() => result.current.receiveState(structuredClone(after)));
    expect(result.current.gameState?.robots[0].z).toBe(
      after.executionFrames[1].robots[0].z,
    );
    for (let i = 0; i < after.executionFrames.length; i++)
      act(() => vi.advanceTimersByTime(PLAYBACK_STEP_MS));
    act(() => result.current.receiveState(structuredClone(after)));
    expect(result.current.isPlaying).toBe(false);
  });

  it("opens a completed turn at its final position and can replay without a new submission", () => {
    const { before, after } = turn();
    const { result } = renderHook(useGamePlayback);
    act(() => result.current.receiveState(after));
    expect(result.current.isPlaying).toBe(false);
    act(() => result.current.replay());
    expect(result.current.gameState?.robots[0].z).toBe(before.robots[0].z);
    expect(result.current.gameState?.players[0].programLocked).toBe(true);
  });

  it("cancels old playback when another tab starts a new round", () => {
    const { before, after } = turn();
    const { result } = renderHook(useGamePlayback);
    act(() => result.current.receiveState(before));
    act(() => result.current.receiveState(after));
    const next = {
      ...before,
      round: 2,
      updatedAt: new Date(Date.now() + 2000).toISOString(),
    };
    act(() => result.current.receiveState(next));
    act(() => vi.advanceTimersByTime(PLAYBACK_STEP_MS * 2));
    expect(result.current.gameState?.round).toBe(2);
    expect(result.current.gameState?.phase).toBe("programming");
    expect(result.current.isPlaying).toBe(false);
  });
});
