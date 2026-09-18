import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import GameContent from "@/components/game-content";

const { getClaims, from, select, eq, maybeSingle } = vi.hoisted(() => ({
  getClaims: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getClaims }, from }),
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

const gameId = "00000000-0000-4000-8000-000000000001";
const load = (id = gameId) =>
  GameContent({ params: Promise.resolve({ gameId: id }) });

beforeEach(() => {
  vi.clearAllMocks();
  getClaims.mockResolvedValue({ data: { claims: { sub: "player-1" } } });
  from.mockReturnValue({ select });
  select.mockReturnValue({ eq });
  eq.mockReturnValue({ maybeSingle });
  maybeSingle.mockResolvedValue({ data: { id: gameId }, error: null });
});
afterEach(cleanup);

describe("GameContent", () => {
  it("loads the requested game for a signed-in player", async () => {
    render(await load());
    expect(screen.getByRole("heading", { name: "Game" })).toBeDefined();
    expect(screen.getByText(`Game ID: ${gameId}`)).toBeDefined();
    expect(from).toHaveBeenCalledWith("games");
    expect(eq).toHaveBeenCalledWith("id", gameId);
  });

  it("requires a session before reading game data", async () => {
    getClaims.mockResolvedValue({ data: null });
    await expect(load()).rejects.toThrow("REDIRECT:/auth/login");
    expect(from).not.toHaveBeenCalled();
  });

  it("shows not found for a missing game", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(load()).rejects.toThrow("NOT_FOUND");
  });

  it("shows not found for an invalid game ID", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: { code: "22P02" } });
    await expect(load("invalid")).rejects.toThrow("NOT_FOUND");
  });

  it("does not misreport database failures as missing games", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: { code: "08006" } });
    await expect(load()).rejects.toThrow("Could not load the game.");
  });
});
