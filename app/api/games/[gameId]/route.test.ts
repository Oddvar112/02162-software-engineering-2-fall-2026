import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildGameState } from "@/lib/game/fixtures";

const {
  getClaims,
  rpc,
  lobbyMember,
  loadGame,
  resolveIfReady,
  advanceIfReady,
  initialiseGame,
} = vi.hoisted(() => ({
  getClaims: vi.fn(),
  rpc: vi.fn(),
  lobbyMember: vi.fn(),
  loadGame: vi.fn(),
  resolveIfReady: vi.fn(),
  advanceIfReady: vi.fn(),
  initialiseGame: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getClaims },
    rpc,
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({ maybeSingle: async () => ({ data: lobbyMember() }) }),
        }),
      }),
    }),
  }),
}));
vi.mock("@/lib/game/store", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/game/store")>();
  return {
    ...actual,
    loadGame,
    resolveIfReady,
    advanceIfReady,
    initialiseGame,
    toGameState: (_loaded: unknown, viewerId: string) => ({
      ...buildGameState(),
      currentPlayerId: viewerId,
    }),
  };
});

import { GET, POST } from "./route";

const params = Promise.resolve({ gameId: "game-1" });
const loaded = { game: { round: 1 }, players: [{ user_id: "user-1" }] };

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
  lobbyMember.mockReturnValue({ id: "lobby-1" });
  loadGame.mockResolvedValue(loaded);
  resolveIfReady.mockResolvedValue(false);
  advanceIfReady.mockResolvedValue(false);
  initialiseGame.mockResolvedValue(undefined);
  rpc.mockResolvedValue({ error: null });
});

describe("GET /api/games/[gameId]", () => {
  it("requires a session", async () => {
    getClaims.mockResolvedValue({ data: null });
    const response = await GET(new Request("https://example.test"), { params });
    expect(response.status).toBe(401);
  });

  it("refuses an outsider before touching the game", async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: "outsider" } } });
    lobbyMember.mockReturnValue(null);
    const response = await GET(new Request("https://example.test"), { params });
    expect(response.status).toBe(403);
    expect(initialiseGame).not.toHaveBeenCalled();
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

  it("sets the game up before the first read", async () => {
    await GET(new Request("https://example.test"), { params });
    expect(initialiseGame).toHaveBeenCalledWith("game-1");
  });

  it("advances the round when its timer has run out", async () => {
    advanceIfReady.mockResolvedValue(true);
    await GET(new Request("https://example.test"), { params });
    expect(loadGame).toHaveBeenCalledTimes(2);
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
