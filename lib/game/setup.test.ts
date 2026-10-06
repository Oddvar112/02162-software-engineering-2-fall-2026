import { beforeEach, describe, expect, it, vi } from "vitest";
import { Direction } from "@/lib/direction";
import { HAND_SIZE } from "@/lib/game/deck";
import { staticBoard } from "@/lib/game/game-model";
import type { ActionCard } from "@/lib/game/types";

type Write = {
  table: string;
  op: "upsert" | "update";
  values: unknown;
  options?: unknown;
  filters: unknown[][];
};

const db = vi.hoisted(() => ({
  game: null as { board: unknown } | null,
  lobby: null as unknown,
  failingTable: null as string | null,
  writes: [] as Write[],
}));

// Records every write the setup makes, in order, with the filters on it.
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from(table: string) {
      const write: Write = { table, op: "update", values: null, filters: [] };
      const builder = {
        select: () => builder,
        eq: (...args: unknown[]) => {
          write.filters.push(["eq", ...args]);
          return builder;
        },
        is: (...args: unknown[]) => {
          write.filters.push(["is", ...args]);
          return builder;
        },
        maybeSingle: async () => ({
          data: table === "games" ? db.game : db.lobby,
          error: null,
        }),
        upsert: (values: unknown, options: unknown) => {
          Object.assign(write, { op: "upsert", values, options });
          db.writes.push(write);
          return builder;
        },
        update: (values: unknown) => {
          Object.assign(write, { op: "update", values });
          db.writes.push(write);
          return builder;
        },
        then: (resolve: (result: { error: Error | null }) => void) =>
          resolve({
            error:
              db.failingTable === table ? new Error(`${table} failed`) : null,
          }),
      };
      return builder;
    },
  }),
}));

import { initialiseGame } from "./setup";

function lobby(status: string, members: [string, string, string][]) {
  return {
    id: "lobby-1",
    status,
    lobby_players: members.map(([user_id, joined_at, robot_model]) => ({
      user_id,
      joined_at,
      robot_model,
    })),
  };
}

beforeEach(() => {
  db.game = { board: null };
  db.lobby = lobby("started", [
    ["guest", "2026-09-29T10:00:05.000000+00:00", "pixel"],
    ["host", "2026-09-29T10:00:01.000000+00:00", "glitch"],
  ]);
  db.failingTable = null;
  db.writes = [];
});

describe("initialiseGame", () => {
  it("seats players in join order with their chosen robots, deals their hands and copies the board last", async () => {
    await initialiseGame("game-1");

    expect(db.writes.map(({ op, table }) => `${op} ${table}`)).toEqual([
      "upsert game_players",
      "upsert hands",
      "update games",
    ]);
    const [players, hands, board] = db.writes;

    const playerRows = players.values as {
      game_id: string;
      user_id: string;
      seat: number;
      robot_model: string;
      x: number;
      z: number;
      direction: number;
      draw_pile: ActionCard[];
      discard_pile: ActionCard[];
    }[];

    expect(
      playerRows.map(({ user_id, seat, robot_model, x, z, direction }) => ({
        user_id,
        seat,
        robot_model,
        x,
        z,
        direction,
      })),
    ).toEqual(
      [
        ["host", "glitch"],
        ["guest", "pixel"],
      ].map(([user_id, robot_model], seat) => ({
        user_id,
        seat,
        robot_model,
        x: staticBoard.startpositions[seat].x,
        z: staticBoard.startpositions[seat].y,
        direction: Direction.Up,
      })),
    );
    expect(playerRows.every((row) => row.game_id === "game-1")).toBe(true);
    expect(players.options).toEqual({
      onConflict: "game_id,user_id",
      ignoreDuplicates: true,
    });

    // round 1: nothing has been discarded yet
    expect(playerRows.every((row) => row.discard_pile.length === 0)).toBe(
      true,
    );
    // each player started with a 20-card deck; 9 went to their hand
    expect(
      playerRows.every((row) => row.draw_pile.length === 20 - HAND_SIZE),
    ).toBe(true);

    const dealt = hands.values as {
      user_id: string;
      round: number;
      cards: ActionCard[];
    }[];
    expect(dealt.map(({ user_id, round }) => [user_id, round])).toEqual([
      ["host", 1],
      ["guest", 1],
    ]);
    expect(dealt.every(({ cards }) => cards.length === HAND_SIZE)).toBe(true);
    expect(hands.options).toEqual({
      onConflict: "game_id,user_id",
      ignoreDuplicates: true,
    });

    // within one player's hand, no duplicate cards
    for (const { cards } of dealt) {
      const ids = cards.map((card) => card.id);
      expect(new Set(ids).size).toBe(ids.length);
    }

    // each player's hand + their own remaining draw pile = their full starting 20-card deck,
    // with no overlap and no card lost
    for (const { user_id, cards: hand } of dealt) {
      const row = playerRows.find((r) => r.user_id === user_id)!;
      const handIds = hand.map((c) => c.id);
      const drawIds = row.draw_pile.map((c) => c.id);
      expect(handIds.length + drawIds.length).toBe(20);
      expect(new Set([...handIds, ...drawIds]).size).toBe(20);
    }

    // host and guest piles are independently shuffled, not slices of one shared deck:
    // it's fine (and expected) for their hands to contain cards with the same ids
    expect(dealt[0].cards.length).toBe(HAND_SIZE);
    expect(dealt[1].cards.length).toBe(HAND_SIZE);

    expect(board.values).toMatchObject({ board: staticBoard });
    expect(board.filters).toEqual([
      ["eq", "id", "game-1"],
      ["is", "board", null],
    ]);
  });

  it("does nothing once the game has a board", async () => {
    db.game = { board: staticBoard };
    await initialiseGame("game-1");
    expect(db.writes).toEqual([]);
  });

  it("refuses a game that does not exist", async () => {
    db.game = null;
    await expect(initialiseGame("game-1")).rejects.toMatchObject({
      status: 404,
    });
  });

  it("refuses a lobby that has not been started", async () => {
    db.lobby = lobby("open", [["host", "2026-09-29T10:00:01+00:00", "bolt"]]);
    await expect(initialiseGame("game-1")).rejects.toMatchObject({
      status: 409,
    });
    expect(db.writes).toEqual([]);
  });

  it("refuses more players than the board has start positions", async () => {
    db.lobby = lobby(
      "started",
      Array.from(
        { length: staticBoard.startpositions.length + 1 },
        (_, index): [string, string, string] => [
          `player-${index}`,
          `2026-09-29T10:00:0${index}+00:00`,
          "bolt",
        ],
      ),
    );
    await expect(initialiseGame("game-1")).rejects.toMatchObject({
      status: 409,
    });
    expect(db.writes).toEqual([]);
  });

  it("leaves the board empty when a write fails, so the next read sets the game up again", async () => {
    db.failingTable = "hands";
    await expect(initialiseGame("game-1")).rejects.toThrow("hands failed");
    expect(db.writes.some(({ table }) => table === "games")).toBe(false);
  });

  it("fails before writing anything if the player-row write itself fails", async () => {
    db.failingTable = "game_players";
    await expect(initialiseGame("game-1")).rejects.toThrow(
      "game_players failed",
    );
    expect(
      db.writes.some(({ table }) => table === "hands" || table === "games"),
    ).toBe(false);
  });
});