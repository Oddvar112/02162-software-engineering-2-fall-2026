import { describe, expect, it, vi } from "vitest";
import { buildGameState } from "@/lib/game/fixtures";
import { RoundService } from "./round-service";
import { decideOutcome } from "./round";
import type { LoadedGame } from "./store";
import { createDemoHands, isDemoBoard } from "@/demo";

const twoPlayers = () => {
  const state = buildGameState();
  state.players = state.players.slice(0, 2);
  state.robots = state.robots.slice(0, 2);
  return state;
};

describe("decideOutcome", () => {
  it("keeps going while nobody has won", () => {
    expect(decideOutcome(twoPlayers())).toEqual({
      finished: false,
      winnerId: null,
    });
  });

  it("finishes when a player reaches the last checkpoint", () => {
    const state = twoPlayers();
    state.players[1].checkpointsReached = 1;
    expect(decideOutcome(state)).toEqual({
      finished: true,
      winnerId: "player-2",
    });
  });
});

describe("RoundService", () => {
  it("uses injected time, resolution, and persistence dependencies", async () => {
    const state = twoPlayers();
    const timerStartedAt = "2026-10-09T12:00:00.000Z";
    const loaded: LoadedGame = {
      game: {
        id: state.gameId,
        phase: "programming",
        round: state.round,
        board: state.board,
        execution_log: [],
        execution_frames: [],
        timer_started_at: timerStartedAt,
        winner_id: null,
        updated_at: timerStartedAt,
      },
      lobbyId: state.lobbyId,
      players: state.players.map((player, seat) => ({
        user_id: player.id,
        seat,
        robot_model: "bolt",
        x: 0,
        z: 0,
        direction: state.robots[seat].direction,
        damage: 0,
        lives: 3,
        checkpoints_reached: 0,
      })),
      names: new Map(),
      hands: new Map(
        state.players.map((player) => [player.id, state.currentPlayerCards]),
      ),
      programs: new Map(),
    };
    const applyRoundResult = vi.fn().mockResolvedValue(true);
    const resolve = vi.fn((input) => ({
      ...input,
      phase: "end-of-round" as const,
    }));
    const service = new RoundService({
      clock: { now: () => Date.parse(timerStartedAt) + 30_000 },
      repository: {
        applyRoundResult,
        beginNextRound: vi.fn(),
      },
      toGameState: () => state,
      resolveRound: resolve,
      dealHands: () => ({}),
      shuffle: (cards) => cards,
      timerSeconds: 30,
      nextRoundSeconds: 15,
      registerCount: 5,
    });

    await expect(service.resolveIfReady(loaded)).resolves.toBe(true);
    expect(resolve).toHaveBeenCalledOnce();
    expect(applyRoundResult).toHaveBeenCalledWith(
      expect.objectContaining({
        gameId: state.gameId,
        round: state.round,
        programs: state.players.map((player) =>
          expect.objectContaining({
            userId: player.id,
            cards: state.currentPlayerCards.slice(0, 5),
          }),
        ),
      }),
    );
  });

  it("deals demo hands with all possible cards when advancing a demo game", async () => {
    const state = twoPlayers();
    const updatedAt = "2026-10-09T12:00:00.000Z";
    const demoBoard = {
      ...state.board,
      id: "demo-test",
      isDemo: true as const,
      name: "Demo Test",
      description: "Test",
    };
    const loaded: LoadedGame = {
      game: {
        id: state.gameId,
        phase: "end-of-round",
        round: 1,
        board: demoBoard,
        execution_log: [],
        execution_frames: [],
        timer_started_at: null,
        winner_id: null,
        updated_at: updatedAt,
      },
      lobbyId: state.lobbyId,
      players: state.players.map((player, seat) => ({
        user_id: player.id,
        seat,
        robot_model: "bolt",
        x: 0,
        z: 0,
        direction: state.robots[seat].direction,
        damage: 0,
        lives: 3,
        checkpoints_reached: 0,
      })),
      names: new Map(),
      hands: new Map(),
      programs: new Map(),
    };
    const beginNextRound = vi.fn().mockResolvedValue(true);
    const standardDealHands = vi.fn(() => ({}));
    const dealHandsWrapper = vi.fn(
      (playerIds: string[], game?: LoadedGame["game"]) =>
        isDemoBoard(game?.board)
          ? createDemoHands(playerIds)
          : standardDealHands(),
    );
    const service = new RoundService({
      clock: { now: () => Date.parse(updatedAt) + 16_000 },
      repository: {
        applyRoundResult: vi.fn(),
        beginNextRound,
      },
      toGameState: () => state,
      resolveRound: vi.fn(),
      dealHands: dealHandsWrapper,
      shuffle: (cards) => cards,
      timerSeconds: 30,
      nextRoundSeconds: 15,
      registerCount: 5,
    });

    await expect(service.advanceIfReady(loaded)).resolves.toBe(true);
    expect(dealHandsWrapper).toHaveBeenCalledWith(
      ["player-1", "player-2"],
      loaded.game,
    );
    expect(standardDealHands).not.toHaveBeenCalled();
    expect(beginNextRound).toHaveBeenCalledWith(
      expect.objectContaining({
        gameId: state.gameId,
        round: 1,
        hands: expect.objectContaining({
          "player-1": expect.arrayContaining([
            expect.objectContaining({ name: "Move 1" }),
            expect.objectContaining({ name: "Move 2" }),
            expect.objectContaining({ name: "Move 3" }),
            expect.objectContaining({ name: "Rotate left" }),
            expect.objectContaining({ name: "Rotate right" }),
            expect.objectContaining({ name: "Back up" }),
            expect.objectContaining({ name: "U-turn" }),
          ]),
        }),
      }),
    );
  });
});
