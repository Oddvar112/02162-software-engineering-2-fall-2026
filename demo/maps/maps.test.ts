import { validateBoard } from "@/lib/board";
import { staticBoard } from "@/lib/game/game-model";
import { describe, expect, it } from "vitest";
import {
  conveyorSprintBoard,
  DEFAULT_DEMO_MAP_ID,
  DEMO_MAPS,
  gearWorksBoard,
  getAllDemoMapsMeta,
  getDemoBoard,
  getDemoMapMeta,
  isDemoBoard,
  laserGauntletBoard,
} from "./index";

describe("Demo Maps Catalog", () => {
  it("contains all defined demo maps", () => {
    expect(DEMO_MAPS).toHaveLength(3);
    expect(DEMO_MAPS.map((m) => m.id)).toEqual([
      "demo-conveyor-sprint",
      "demo-laser-gauntlet",
      "demo-gear-works",
    ]);
  });

  it("defines default demo map id", () => {
    expect(DEFAULT_DEMO_MAP_ID).toBe("demo-conveyor-sprint");
    expect(getDemoBoard(DEFAULT_DEMO_MAP_ID)).toBeDefined();
  });

  describe("Board validation for each demo map", () => {
    for (const board of DEMO_MAPS) {
      describe(`Map: ${board.name} (${board.id})`, () => {
        it("passes validateBoard() without throwing", () => {
          expect(() => validateBoard(board)).not.toThrow();
        });

        it("has correct dimensions and grid matching width/height", () => {
          expect(board.width).toBeGreaterThan(0);
          expect(board.height).toBeGreaterThan(0);
          expect(board.tiles).toHaveLength(board.height);
          for (const row of board.tiles) {
            expect(row).toHaveLength(board.width);
          }
        });

        it("has at least 8 unique start positions for maximum lobby capacity", () => {
          expect(board.startpositions.length).toBeGreaterThanOrEqual(8);

          const uniqueStarts = new Set(
            board.startpositions.map((pos) => `${pos.x},${pos.y}`),
          );
          expect(uniqueStarts.size).toBe(board.startpositions.length);

          for (const pos of board.startpositions) {
            expect(pos.x).toBeGreaterThanOrEqual(0);
            expect(pos.x).toBeLessThan(board.width);
            expect(pos.y).toBeGreaterThanOrEqual(0);
            expect(pos.y).toBeLessThan(board.height);
          }
        });

        it("has sequentially numbered checkpoints starting at 1", () => {
          const checkpointTiles = board.tiles
            .flat()
            .filter((tile) => tile.kind === "checkpoint");
          expect(checkpointTiles.length).toBeGreaterThanOrEqual(1);

          const numbers = checkpointTiles
            .map((t) => (t.kind === "checkpoint" ? t.number : 0))
            .sort((a, b) => a - b);

          for (let i = 0; i < numbers.length; i++) {
            expect(numbers[i]).toBe(i + 1);
          }
        });

        it("is marked with isDemo: true", () => {
          expect(board.isDemo).toBe(true);
        });
      });
    }
  });

  describe("Specific Map Features", () => {
    it("conveyorSprintBoard has conveyor belts and express conveyors", () => {
      const kinds = conveyorSprintBoard.tiles.flat().map((t) => t.kind);
      expect(kinds).toContain("conveyor");
      const expressBelts = conveyorSprintBoard.tiles
        .flat()
        .filter((t) => t.kind === "conveyor" && t.express);
      expect(expressBelts.length).toBeGreaterThan(0);
    });

    it("laserGauntletBoard has laser tiles and pushers", () => {
      const kinds = laserGauntletBoard.tiles.flat().map((t) => t.kind);
      expect(kinds).toContain("laser");
      expect(kinds).toContain("pusher");
      expect(laserGauntletBoard.walls.length).toBeGreaterThan(0);
    });

    it("gearWorksBoard has gears and pits", () => {
      const kinds = gearWorksBoard.tiles.flat().map((t) => t.kind);
      expect(kinds).toContain("gear");
      expect(kinds).toContain("pit");
    });
  });

  describe("Helper functions", () => {
    it("getDemoBoard returns map by id", () => {
      expect(getDemoBoard("demo-conveyor-sprint")).toBe(conveyorSprintBoard);
      expect(getDemoBoard("demo-laser-gauntlet")).toBe(laserGauntletBoard);
      expect(getDemoBoard("demo-gear-works")).toBe(gearWorksBoard);
      expect(getDemoBoard("non-existent-id")).toBeUndefined();
    });

    it("isDemoBoard identifies demo boards vs standard boards", () => {
      expect(isDemoBoard(conveyorSprintBoard)).toBe(true);
      expect(isDemoBoard(laserGauntletBoard)).toBe(true);
      expect(isDemoBoard(gearWorksBoard)).toBe(true);
      expect(
        isDemoBoard({
          id: "demo-custom",
          width: 5,
          height: 5,
          tiles: [],
          walls: [],
          startpositions: [],
        }),
      ).toBe(true);
      expect(isDemoBoard(staticBoard)).toBe(false);
      expect(isDemoBoard(null)).toBe(false);
      expect(isDemoBoard(undefined)).toBe(false);
    });

    it("getDemoMapMeta returns metadata with features and checkpoints", () => {
      const meta = getDemoMapMeta(conveyorSprintBoard);
      expect(meta.id).toBe("demo-conveyor-sprint");
      expect(meta.name).toBe("Conveyor Sprint");
      expect(meta.checkpointCount).toBe(3);
      expect(meta.features).toContain("Conveyors");
    });

    it("getAllDemoMapsMeta returns metadata for all maps", () => {
      const allMeta = getAllDemoMapsMeta();
      expect(allMeta).toHaveLength(3);
      expect(allMeta[0].id).toBe("demo-conveyor-sprint");
      expect(allMeta[1].id).toBe("demo-laser-gauntlet");
      expect(allMeta[2].id).toBe("demo-gear-works");
    });
  });
});
