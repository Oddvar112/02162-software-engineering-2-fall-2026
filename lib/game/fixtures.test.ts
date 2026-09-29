import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { staticBoard } from "@/lib/game/game-model";
import { buildGameState } from "@/lib/game/fixtures";
import roster from "@/lib/robots.json";

describe("buildGameState", () => {
  it("seats one player per start position on the supplied board", () => {
    const board = structuredClone(staticBoard);
    board.startpositions = [{ x: 2, y: 3 }];
    const state = buildGameState(board);
    expect(state.board).toEqual(board);
    expect(state.players).toHaveLength(1);
    expect(state.robots[0]).toMatchObject({
      x: 2,
      z: 3,
      playerId: state.players[0].id,
    });
  });

  it("rejects a board without any start positions", () => {
    expect(() =>
      buildGameState({ ...staticBoard, startpositions: [] }),
    ).toThrow(/at least one start position/);
  });

  it("assigns shipped robot models with matching roster names, colors and files", () => {
    for (const robot of buildGameState().robots) {
      const model = roster.find((entry) => entry.id === robot.modelId);
      expect(model).toBeDefined();
      expect(robot.name).toBe(model?.name);
      expect(robot.color).toBe(model?.color);
      expect(
        existsSync(resolve(`public/models/robots/${robot.modelId}.glb`)),
      ).toBe(true);
    }
  });
});
