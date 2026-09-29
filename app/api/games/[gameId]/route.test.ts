import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildGameState } from "@/lib/game/fixtures";

const { getClaims, rpc, loadGame, resolveIfReady, startNextRound, markReady } =
  vi.hoisted(() => ({
    getClaims: vi.fn(),
    rpc: vi.fn(),
    loadGame: vi.fn(),
    resolveIfReady: vi.fn(),
    startNextRound: vi.fn(),
    markReady: vi.fn(),
  }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getClaims }, rpc }),
}));
vi.mock("@/lib/game/store", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/game/store")>();
  return {
    ...actual,
    loadGame,
    resolveIfReady,
    startNextRound,
    markReadyForNextRound: markReady,
    toGameState: (_loaded: unknown, viewerId: string) => ({
      ...buildGameState(),
      currentPlayerId: viewerId,
    }),
  };
});

import { GET, POST } from "./route";

const params = Promise.resolve({ gameId: "game-1" });
const loaded = {
  game: { phase: "end-of-round", round: 3 },
  players: [{ user_id: "user-1" }],
};

function post(body: unknown) {
  return POST(
    new Request("https://example.test/api/games/game-1", {
      method: "POST",
      body: JSON.stringify(body),
    }),
    { params },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  getClaims.mockResolvedValue({ data: { claims: { sub: "user-1" } } });
  loadGame.mockResolvedValue(loaded);
  resolveIfReady.mockResolvedValue(false);
  rpc.mockResolvedValue({ error: null });
});

describe("GET /api/games/[gameId]", () => {
  it("requires a session", async () => {
    getClaims.mockResolvedValue({ data: null });
    const response = await GET(new Request("https://example.test"), { params });
    expect(response.status).toBe(401);
  });

  it("refuses a signed-in user who is not in the game", async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: "outsider" } } });
    const response = await GET(new Request("https://example.test"), { params });
    expect(response.status).toBe(403);
  });

  it("returns the viewer's snapshot and resolves a finished round first", async () => {
    resolveIfReady.mockResolvedValue(true);
    const response = await GET(new Request("https://example.test"), { params });
    expect(response.status).toBe(200);
    expect((await response.json()).currentPlayerId).toBe("user-1");
    expect(loadGame).toHaveBeenCalledTimes(2);
  });
});

describe("POST /api/games/[gameId]", () => {
  it("locks in through the database function as the signed-in user", async () => {
    const response = await post({
      action: "lock-in",
      round: 1,
      cardIds: ["a"],
    });
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("submit_program", {
      p_game_id: "game-1",
      p_card_ids: ["a"],
    });
  });

  it.each([
    ["already_locked_in", "already locked in"],
    ["card_not_in_hand", "not in your hand"],
    ["wrong_card_count", "exactly 5 cards"],
  ])("translates the %s reason from the database", async (reason, text) => {
    rpc.mockResolvedValue({ error: { message: reason } });
    const response = await post({ action: "lock-in", round: 1, cardIds: [] });
    expect(response.status).toBe(409);
    expect((await response.json()).error).toContain(text);
  });

  it("marks the member ready and waits for the others", async () => {
    markReady.mockResolvedValue(false);
    const response = await post({ action: "next-round", round: 3 });
    expect(response.status).toBe(200);
    expect(markReady).toHaveBeenCalledWith("game-1", "user-1");
    expect(startNextRound).not.toHaveBeenCalled();
  });

  it("advances the round once every player is ready", async () => {
    markReady.mockResolvedValue(true);
    const response = await post({ action: "next-round", round: 3 });
    expect(response.status).toBe(200);
    expect(startNextRound).toHaveBeenCalledWith("game-1", 3);
  });

  it("rejects readiness for a stale round", async () => {
    const response = await post({ action: "next-round", round: 2 });
    expect(response.status).toBe(409);
    expect(markReady).not.toHaveBeenCalled();
  });

  it("rejects unknown actions and invalid JSON", async () => {
    expect((await post({ action: "dance" })).status).toBe(400);
    const broken = await POST(
      new Request("https://example.test", { method: "POST", body: "{" }),
      { params },
    );
    expect(broken.status).toBe(400);
  });
});
