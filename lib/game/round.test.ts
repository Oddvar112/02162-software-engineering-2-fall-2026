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
