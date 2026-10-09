import { describe, expect, it } from "vitest";
import { Direction } from "@/lib/direction";
import { buildDeck, HAND_SIZE } from "@/lib/game/deck";
import { staticBoard } from "@/lib/game/game-model";
import {
  NEXT_ROUND_SECONDS,
  TIMER_SECONDS,
  toGameState,
  type LoadedGame,
} from "@/lib/game/store";
import type { ActionCard } from "@/lib/game/types";

const UPDATED_AT = "2026-09-29T10:00:00.123456+00:00";
const deck = buildDeck();
const hands = {
  p1: deck.slice(0, HAND_SIZE),
  p2: deck.slice(HAND_SIZE, 2 * HAND_SIZE),
};

function loadedGame({
  game = {},
  programs = {},
}: {
  game?: Partial<LoadedGame["game"]>;
  programs?: Record<string, ActionCard[]>;
} = {}): LoadedGame {
  return {
    game: {
      id: "game-1",
      phase: "programming",
      round: 1,
      board: staticBoard,
      execution_log: [],
      execution_frames: [],
      timer_started_at: null,
      winner_id: null,
      updated_at: UPDATED_AT,
      ...game,
    },
    lobbyId: "lobby-1",
    players: (["p1", "p2"] as const).map((user_id, seat) => ({
      user_id,
      seat,
      robot_model: "bolt",
      x: seat,
      z: 9,
      direction: Direction.Up,
      damage: 0,
      checkpoints_reached: 0,
    })),
    names: new Map(),
    hands: new Map(Object.entries(hands)),
    programs: new Map(Object.entries(programs)),
  };
}

const later = (iso: string, seconds: number) =>
  new Date(new Date(iso).getTime() + seconds * 1000).toISOString();

describe("toGameState", () => {
  it("shows the viewer their own hand and program but no opponent's cards", () => {
    const programs = { p1: hands.p1.slice(0, 5), p2: hands.p2.slice(0, 5) };
    const state = toGameState(loadedGame({ programs }), "p1");

    expect(state.currentPlayerCards).toEqual(hands.p1);
    expect(state.currentPlayerProgram).toEqual(programs.p1);
    expect(state.players.map((player) => player.programLocked)).toEqual([
      true,
      true,
    ]);
    const serialised = JSON.stringify(state);
    for (const card of hands.p2) {
      expect(serialised).not.toContain(`"${card.id}"`);
    }
  });

  it("includes every player and robot from persisted game state", () => {
    const state = toGameState(loadedGame(), "p1");
    expect(state.robots.map((robot) => robot.playerId)).toEqual(["p1", "p2"]);
    expect(state.players.map((player) => player.id)).toEqual(["p1", "p2"]);
  });

  it.each([
    ["programming before anyone locks in", "programming", null, null],
    [
      "programming after the first lock in",
      "programming",
      "2026-09-29T09:59:50.000Z",
      later("2026-09-29T09:59:50.000Z", TIMER_SECONDS),
    ],
    [
      "the end of a round",
      "end-of-round",
      "2026-09-29T09:59:50.000Z",
      later(UPDATED_AT, NEXT_ROUND_SECONDS),
    ],
    ["a finished game", "finished", "2026-09-29T09:59:50.000Z", null],
  ] as const)(
    "sets the countdown for %s",
    (_label, phase, timerStartedAt, endsAt) => {
      const loaded = loadedGame({
        game: { phase, timer_started_at: timerStartedAt },
      });
      expect(toGameState(loaded, "p1").timerEndsAt).toBe(endsAt);
    },
  );
});
