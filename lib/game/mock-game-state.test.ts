import { describe, expect, it } from "vitest";
import { getMockGameState } from "@/lib/game/mock-game-state";

describe("mock game state", () => {
  it("contains everything needed to render the beginning of a game", () => {
    const state = getMockGameState();
    const boardElementTypes = new Set(
      state.board.elements.map((element) => element.type),
    );

    expect(state.round).toBe(1);
    expect(state.robots).toHaveLength(state.players.length);
    expect([...boardElementTypes].sort()).toEqual(
      ["checkpoint", "conveyor", "gear", "pit", "wall"].sort(),
    );
    expect(
      state.players.every((player) =>
        state.robots.some((robot) => robot.id === player.robotId),
      ),
    ).toBe(true);
  });

  it("does not expose opponents' action cards", () => {
    const state = getMockGameState();
    const opponents = state.players.filter(
      (player) => player.id !== state.currentPlayerId,
    );

    expect(state.availableCards.length).toBeGreaterThan(0);
    opponents.forEach((opponent) => {
      expect(opponent).not.toHaveProperty("cards");
      expect(opponent).not.toHaveProperty("actionCards");
      expect(opponent).not.toHaveProperty("registers");
    });
  });

  it("returns a fresh snapshot on every request", () => {
    const firstState = getMockGameState();
    const secondState = getMockGameState();

    expect(firstState).not.toBe(secondState);
    expect(firstState.robots).not.toBe(secondState.robots);
    expect(firstState.board.elements).not.toBe(secondState.board.elements);
  });
});
