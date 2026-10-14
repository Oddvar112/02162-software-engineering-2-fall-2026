import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DemoServiceError,
  getGameDemoStatus,
  setGameDemoBoard,
  startDemoLobby,
  submitDemoProgram,
  verifyLobbyHost,
} from "./demo-service";
import { gearWorksBoard } from "../maps";
import { createDemoHand } from "../cards";

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
          return builder;
        },
        upsert: (values: unknown) => {
          db.upserts.push({ table, values });
          return builder;
        },
        then: (resolve: (res: { error: null }) => void) =>
          resolve({ error: null }),
      };
      return builder;
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
  db.hand = { cards: createDemoHand("host-user", 2) };
  db.program = null;
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

  describe("submitDemoProgram", () => {
    it("submits a program with just 1 card", async () => {
      const hand = db.hand!.cards as { id: string }[];
      await submitDemoProgram("game-123", "host-user", [hand[0].id]);

      const gameUpdate = db.updates.find((u) => u.table === "games");
      expect(gameUpdate).toBeDefined();
      expect(
        (
          gameUpdate?.values as {
            board: { demoPrograms: Record<string, unknown[]> };
          }
        ).board.demoPrograms["host-user"],
      ).toEqual([hand[0]]);
    });

    it("submits a program with 7 cards (unlimited cards)", async () => {
      const hand = db.hand!.cards as { id: string }[];
      const chosenIds = hand.slice(0, 7).map((c) => c.id);
      await submitDemoProgram("game-123", "host-user", chosenIds);

      const gameUpdate = db.updates.find((u) => u.table === "games");
      expect(gameUpdate).toBeDefined();
      const insertedCards = (
        gameUpdate?.values as {
          board: { demoPrograms: Record<string, unknown[]> };
        }
      ).board.demoPrograms["host-user"];
      expect(insertedCards).toHaveLength(7);
    });

    it("rejects an empty program with 400", async () => {
      await expect(
        submitDemoProgram("game-123", "host-user", []),
      ).rejects.toMatchObject({ status: 400 });
    });

    it("rejects when player is already locked in with 409", async () => {
      db.game!.board = {
        demoPrograms: { "host-user": [] },
      };
      const hand = db.hand!.cards as { id: string }[];
      await expect(
        submitDemoProgram("game-123", "host-user", [hand[0].id]),
      ).rejects.toMatchObject({ status: 409 });
    });

    it("rejects when card is not in player hand with 409", async () => {
      await expect(
        submitDemoProgram("game-123", "host-user", ["not-in-hand-id"]),
      ).rejects.toMatchObject({ status: 409 });
    });
  });

  describe("startDemoLobby", () => {
    beforeEach(() => {
      db.lobby = {
        id: "lobby-123",
        created_by: "host-user",
        status: "open",
        game: "game-123",
        lobby_players: [{ user_id: "host-user", robot_model: "bolt" }],
      };
      db.game = {
        id: "game-123",
        board: gearWorksBoard,
      };
    });

    it("allows starting a demo game with 1 player when robot is chosen", async () => {
      const result = await startDemoLobby("game-123", "host-user");
      expect(result).toEqual({ ok: true, gameId: "game-123" });

      // Lobby should be updated to started
      const lobbyUpdate = db.updates.find((u) => u.table === "lobbies");
      expect(lobbyUpdate).toBeDefined();
      expect(lobbyUpdate?.values).toEqual({ status: "started" });
    });

    it("rejects when the caller is not the lobby host", async () => {
      await expect(
        startDemoLobby("game-123", "other-user"),
      ).rejects.toMatchObject({
        message: "Only the host can start the game.",
        status: 403,
      });
    });

    it("rejects when robot is not chosen yet", async () => {
      db.lobby!.lobby_players = [{ user_id: "host-user", robot_model: null }];
      await expect(
        startDemoLobby("game-123", "host-user"),
      ).rejects.toMatchObject({
        message: "Every player must choose a robot first.",
        status: 400,
      });
    });

    it("rejects when the lobby is not open", async () => {
      db.lobby!.status = "started";
      await expect(
        startDemoLobby("game-123", "host-user"),
      ).rejects.toMatchObject({
        message: "This game has already started.",
        status: 409,
      });
    });
  });
});
