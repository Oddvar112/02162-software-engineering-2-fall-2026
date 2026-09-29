import { staticBoard } from "@/lib/game/game-model";
import { validateBoard } from "@/lib/board";
import { describe, expect, it } from "vitest";
import { getMockGameState } from "@/lib/game/mock-game-state";
import roster from "@/lib/robots.json";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

describe("mock game state", () => {
  it("creates demo seats from the supplied board's start positions", () => {
    const board = structuredClone(staticBoard);
    board.startpositions = [{ x: 2, y: 3 }];
    const state = getMockGameState(board);
    expect(state.board).toEqual(board);
    expect(state.players).toHaveLength(1);
    expect(state.robots).toHaveLength(1);
    expect(state.robots[0]).toMatchObject({
      x: 2,
      z: 3,
      playerId: state.players[0].id,
    });
  });

  it("rejects a demo board without any start positions", () => {
    expect(() =>
      getMockGameState({ ...staticBoard, startpositions: [] }),
    ).toThrow(/at least one start position/);
  });

  it("assigns shipped models with matching roster names and colors", () => {
    for (const robot of getMockGameState().robots) {
      const model = roster.find((entry) => entry.id === robot.modelId);
      expect(model).toBeDefined();
      expect(robot.name).toBe(model?.name);
      expect(robot.color).toBe(model?.color);
      expect(
        existsSync(resolve(`public/models/robots/${robot.modelId}.glb`)),
      ).toBe(true);
    }
  });

  it("contains everything needed to render the beginning of a game", () => {
    const state = getMockGameState();
    const boardElementTypes = new Set(
      state.board.tiles.flat().map((tile) => tile.kind),
    );

    expect(() => validateBoard(state.board)).not.toThrow();
    expect(state.board.tiles).toHaveLength(state.board.height);
    expect(
      state.board.tiles.every((row) => row.length === state.board.width),
    ).toBe(true);
    expect(state.board).toEqual(staticBoard);
    expect(state.robots).toHaveLength(staticBoard.startpositions.length);
    expect(state.board.startpositions).toEqual(
      state.robots.map(({ x, z }) => ({ x, y: z })),
    );
    expect(state.round).toBe(1);
    expect(state.robots).toHaveLength(state.players.length);
    expect([...boardElementTypes].sort()).toEqual(
      ["checkpoint", "conveyor", "floor"].sort(),
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

    expect(state.currentPlayerCards.length).toBeGreaterThan(0);
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
    firstState.board.tiles[0][0].kind = "pit";
    firstState.board.walls[0].One.x = 99;
    firstState.board.startpositions[0].x = 99;
    expect(secondState.board.tiles[0][0].kind).toBe("floor");
    expect(secondState.board.walls[0].One.x).toBe(staticBoard.walls[0].One.x);
    expect(secondState.board.startpositions[0].x).toBe(
      staticBoard.startpositions[0].x,
    );
    expect(firstState.currentPlayerCards).not.toBe(
      secondState.currentPlayerCards,
    );
  });
});
