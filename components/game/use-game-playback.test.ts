import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createMockGame,
  getPlayerSnapshot,
  startNextRound,
  submitProgram,
} from "@/lib/game/programming";
import { PLAYBACK_STEP_MS, useGamePlayback } from "./use-game-playback";

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function turn() {
  const game = createMockGame();
  const before = getPlayerSnapshot(game, "player-1");
  submitProgram(
    game,
    "player-1",
    1,
    before.currentPlayerCards.slice(0, 5).map((card) => card.id),
  );
  return { game, before, after: getPlayerSnapshot(game, "player-1") };
}

describe("visible program playback", () => {
  it("shows each authoritative movement frame before revealing the final state", () => {
    const { before, after } = turn();
    const { result } = renderHook(useGamePlayback);
    act(() => result.current.receiveState(before));
    act(() => result.current.receiveState(after));
    expect(result.current.isPlaying).toBe(true);
    expect(result.current.gameState?.phase).toBe("execution");
    expect(result.current.gameState?.robots[0].z).toBe(8);
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
    expect(result.current.gameState?.robots[0].z).toBe(7);
    act(() => result.current.receiveState(structuredClone(after)));
    expect(result.current.gameState?.robots[0].z).toBe(7);
    for (let i = 0; i < after.executionFrames.length; i++)
      act(() => vi.advanceTimersByTime(PLAYBACK_STEP_MS));
    act(() => result.current.receiveState(structuredClone(after)));
    expect(result.current.isPlaying).toBe(false);
  });

  it("opens a completed turn at its final position and can replay without a new submission", () => {
    const { after } = turn();
    const { result } = renderHook(useGamePlayback);
    act(() => result.current.receiveState(after));
    expect(result.current.isPlaying).toBe(false);
    act(() => result.current.replay());
    expect(result.current.gameState?.robots[0].z).toBe(8);
    expect(result.current.gameState?.players[0].programLocked).toBe(true);
    expect(after.robots[0].z).toBe(2);
  });

  it("cancels old playback when another tab starts a new round", () => {
    const { game, before, after } = turn();
    const { result } = renderHook(useGamePlayback);
    act(() => result.current.receiveState(before));
    act(() => result.current.receiveState(after));
    startNextRound(game, "player-1", 1);
    act(() => result.current.receiveState(getPlayerSnapshot(game, "player-1")));
    act(() => vi.advanceTimersByTime(PLAYBACK_STEP_MS * 2));
    expect(result.current.gameState?.round).toBe(2);
    expect(result.current.gameState?.phase).toBe("programming");
    expect(result.current.isPlaying).toBe(false);
  });
});
