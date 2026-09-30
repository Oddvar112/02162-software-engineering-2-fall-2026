import { describe, expect, it } from "vitest";
import { buildGameState } from "@/lib/game/fixtures";
import { decideOutcome } from "./round";

const twoPlayers = () => {
  const state = buildGameState();
  state.players = state.players.slice(0, 2);
  state.robots = state.robots.slice(0, 2);
  return state;
};

describe("decideOutcome", () => {
  it("keeps going while nobody has won and more than one robot lives", () => {
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

  it("finishes for the last robot standing", () => {
    const state = twoPlayers();
    state.players[0].lives = 0;
    expect(decideOutcome(state)).toEqual({
      finished: true,
      winnerId: "player-2",
    });
  });

  it("finishes with no winner when every robot is gone", () => {
    const state = twoPlayers();
    state.players.forEach((player) => (player.lives = 0));
    expect(decideOutcome(state)).toEqual({ finished: true, winnerId: null });
  });

  it("prefers the checkpoint over survival when both happen in one round", () => {
    const state = twoPlayers();
    state.players[0].lives = 0;
    state.players[0].checkpointsReached = 1;
    expect(decideOutcome(state).winnerId).toBe("player-1");
  });
});
