import { validateBoard } from "@/lib/board";
import { staticBoard } from "@/lib/game/game-model";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_DEMO_MAP_ID,
  DEMO_MAPS,
  gearWorksBoard,
  getAllDemoMapsMeta,
  getDemoBoard,
  getDemoMapMeta,
  isDemoBoard,
} from "./index";

describe("Demo Maps Catalog", () => {
  it("contains the active demo map", () => {
    expect(DEMO_MAPS).toHaveLength(1);
    expect(DEMO_MAPS.map((m) => m.id)).toEqual(["demo-gear-works"]);
  });

  it("defines default demo map id pointing to gearworks", () => {
    expect(DEFAULT_DEMO_MAP_ID).toBe("demo-gear-works");
    expect(getDemoBoard(DEFAULT_DEMO_MAP_ID)).toBe(gearWorksBoard);
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
    it("gearWorksBoard has conveyors, gears, pits, and only implemented mechanics", () => {
      const kinds = gearWorksBoard.tiles.flat().map((t) => t.kind);
      expect(kinds).toContain("conveyor");
      expect(kinds).toContain("gear");
      expect(kinds).toContain("pit");
      expect(kinds).toContain("checkpoint");
      expect(kinds).not.toContain("laser");
      expect(kinds).not.toContain("pusher");
      expect(kinds).not.toContain("repair");
    });

    it("features a showcase line immediately to the left of the player with every implemented field", () => {
      // Player 1 starts at x=1, y=9; column 0 (x=0) is immediately to the left
      const col0Kinds = Array.from(
        { length: 10 },
        (_, y) => gearWorksBoard.tiles[y][0].kind,
      );
      expect(col0Kinds).toContain("floor");
      expect(col0Kinds).toContain("conveyor");
      expect(col0Kinds).toContain("gear");
      expect(col0Kinds).toContain("pit");
      expect(col0Kinds).toContain("checkpoint");
      expect(col0Kinds).not.toContain("laser");
      expect(col0Kinds).not.toContain("pusher");
      expect(col0Kinds).not.toContain("repair");
    });
  });

  describe("Helper functions", () => {
    it("getDemoBoard returns map by id", () => {
      expect(getDemoBoard("demo-gear-works")).toBe(gearWorksBoard);
      expect(getDemoBoard("non-existent-id")).toBeUndefined();
    });

    it("isDemoBoard identifies demo boards vs standard boards", () => {
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
      const meta = getDemoMapMeta(gearWorksBoard);
      expect(meta.id).toBe("demo-gear-works");
      expect(meta.name).toBe("Gearworks & Pits");
      expect(meta.checkpointCount).toBe(4);
      expect(meta.features).toContain("Conveyors");
      expect(meta.features).toContain("Gears");
      expect(meta.features).toContain("Pits");
      expect(meta.features).toContain("Walls");
    });

    it("getAllDemoMapsMeta returns metadata for registered demo maps", () => {
      const allMeta = getAllDemoMapsMeta();
      expect(allMeta).toHaveLength(1);
      expect(allMeta[0].id).toBe("demo-gear-works");
      expect(allMeta[0].name).toBe("Gearworks & Pits");
    });
  });
});
