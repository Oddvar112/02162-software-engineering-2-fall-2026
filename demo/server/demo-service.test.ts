import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DemoServiceError,
  getGameDemoStatus,
  setGameDemoBoard,
  verifyLobbyHost,
} from "./demo-service";
import { gearWorksBoard } from "../maps";

type DbState = {
  lobby: {
    id: string;
    created_by: string;
    status: string;
    game?: string;
    lobby_players?: { user_id: string; robot_model: string | null }[];
  } | null;
  game: {
    id: string;
    phase?: string;
    round?: number;
    board: unknown;
    timer_started_at?: string | null;
  } | null;
  player: { user_id: string; lives: number } | null;
  hand: { cards: unknown[] } | null;
  program: { user_id: string } | null;
  error: { message: string; code?: string } | null;
  updates: {
    table: string;
    values: unknown;
    eqKey?: string;
    eqVal?: unknown;
  }[];
  upserts: {
    table: string;
    values: unknown;
  }[];
};

const db = vi.hoisted((): DbState => ({
  lobby: null,
  game: null,
  player: null,
  hand: null,
  program: null,
  error: null,
  updates: [],
  upserts: [],
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from(table: string) {
      let currentEqKey: string | undefined;
      let currentEqVal: unknown;
      const builder = {
        select: () => builder,
        eq: (key: string, val: unknown) => {
          currentEqKey = key;
          currentEqVal = val;
          return builder;
        },
        maybeSingle: async () => {
          if (db.error) return { data: null, error: db.error };
          let data: unknown = null;
          if (table === "lobbies") data = db.lobby;
          else if (table === "games") data = db.game;
          else if (table === "game_players") data = db.player;
          else if (table === "hands") data = db.hand;
          else if (table === "programs") data = db.program;
          return { data, error: null };
        },
        update: (values: unknown) => {
          db.updates.push({
            table,
            values,
            eqKey: currentEqKey,
            eqVal: currentEqVal,
          });
          const updateBuilder = {
            eq: () => updateBuilder,
            then: (resolve: (res: { error: unknown }) => void) =>
              resolve({ error: db.error }),
          };
          return updateBuilder;
        },
        upsert: (values: unknown) => {
          db.upserts.push({ table, values });
          return {
            then: (resolve: (res: { error: unknown }) => void) =>
              resolve({ error: db.error }),
          };
        },
        then: (resolve: (res: { error: null }) => void) =>
          resolve({ error: null }),
      };
      return builder;
    },
    rpc: async (fn: string, args: Record<string, unknown>) => {
      if (db.error) return { data: null, error: db.error };
      if (fn === "set_game_demo_board") {
        if (!db.lobby) {
          return { data: null, error: { message: "lobby_not_found" } };
        }
        if (db.lobby.created_by !== args.p_user_id) {
          return { data: null, error: { message: "not_creator" } };
        }
        if (db.lobby.status !== "open") {
          return { data: null, error: { message: "already_started" } };
        }
        const board = args.p_enabled ? args.p_board : null;
        db.updates.push({
          table: "games",
          values: { board, mode: args.p_enabled ? "demo" : "classic" },
          eqKey: "id",
          eqVal: args.p_game_id,
        });
        if (db.game) {
          db.game.board = board;
        }
        return { data: null, error: null };
      }
      return { data: null, error: null };
    },
  }),
}));

beforeEach(() => {
  db.lobby = { id: "lobby-123", created_by: "host-user", status: "open" };
  db.game = {
    id: "game-123",
    phase: "programming",
    round: 1,
    board: null,
    timer_started_at: null,
  };
  db.player = { user_id: "host-user", lives: 3 };
  db.hand = null;
  db.program = null;
  db.error = null;
  db.updates = [];
  db.upserts = [];
});

describe("demo-service", () => {
  describe("verifyLobbyHost", () => {
    it("returns host status for the creator", async () => {
      const res = await verifyLobbyHost("game-123", "host-user");
      expect(res.isHost).toBe(true);
      expect(res.isOpen).toBe(true);
    });

    it("returns isHost=false for other users", async () => {
      const res = await verifyLobbyHost("game-123", "other-user");
      expect(res.isHost).toBe(false);
    });

    it("throws 404 if lobby not found", async () => {
      db.lobby = null;
      await expect(verifyLobbyHost("game-123", "host-user")).rejects.toThrow(
        DemoServiceError,
      );
    });
  });

  describe("getGameDemoStatus", () => {
    it("reports non-demo game when board is null", async () => {
      db.game = { id: "game-123", board: null };
      const status = await getGameDemoStatus("game-123");
      expect(status.isDemo).toBe(false);
      expect(status.board).toBeNull();
      expect(status.mapId).toBeNull();
    });

    it("reports demo game when board is a demo board", async () => {
      db.game = { id: "game-123", board: gearWorksBoard };
      const status = await getGameDemoStatus("game-123");
      expect(status.isDemo).toBe(true);
      expect(status.mapId).toBe("demo-gear-works");
      expect(status.board?.name).toBe("Gearworks & Pits");
    });
  });

  describe("setGameDemoBoard", () => {
    it("enables demo mode with the default map", async () => {
      const res = await setGameDemoBoard("game-123", "host-user", true);
      expect(res.isDemo).toBe(true);
      expect(res.mapId).toBe("demo-gear-works");
      expect(db.updates).toHaveLength(1);
      expect(db.updates[0].values).toMatchObject({
        board: gearWorksBoard,
      });
    });

    it("enables demo mode with a specific chosen map", async () => {
      const res = await setGameDemoBoard(
        "game-123",
        "host-user",
        true,
        "demo-gear-works",
      );
      expect(res.isDemo).toBe(true);
      expect(res.mapId).toBe("demo-gear-works");
      expect(db.updates[0].values).toMatchObject({
        board: gearWorksBoard,
      });
    });

    it("disables demo mode by resetting board to null", async () => {
      const res = await setGameDemoBoard("game-123", "host-user", false);
      expect(res.isDemo).toBe(false);
      expect(res.board).toBeNull();
      expect(db.updates[0].values).toMatchObject({
        board: null,
      });
    });

    it("rejects non-hosts with 403", async () => {
      await expect(
        setGameDemoBoard("game-123", "intruder-user", true),
      ).rejects.toMatchObject({ status: 403 });
    });

    it("rejects changes when lobby is already started with 409", async () => {
      db.lobby!.status = "started";
      await expect(
        setGameDemoBoard("game-123", "host-user", true),
      ).rejects.toMatchObject({ status: 409 });
    });

    it("rejects unknown map IDs with 400", async () => {
      await expect(
        setGameDemoBoard("game-123", "host-user", true, "invalid-map-id"),
      ).rejects.toMatchObject({ status: 400 });
    });
  });
});
