import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateSession } from "@/lib/supabase/proxy";

const { getClaims } = vi.hoisted(() => ({ getClaims: vi.fn() }));
vi.mock("@/lib/utils", () => ({ hasEnvVars: true }));
vi.mock("@supabase/ssr", () => ({
  createServerClient: (
    _url: string,
    _key: string,
    options: {
      cookies: {
        setAll: (
          cookies: { name: string; value: string; options: { path: string } }[],
        ) => void;
      };
    },
  ) => ({
    auth: {
      getClaims: async () => {
        options.cookies.setAll([
          { name: "session", value: "refreshed", options: { path: "/" } },
        ]);
        return getClaims();
      },
    },
  }),
}));

beforeEach(() => {
  getClaims.mockReset();
  getClaims.mockResolvedValue({ data: null });
});

describe("session proxy", () => {
  it.each(["/lobbies", "/lobbies/abc", "/games/abc", "/game/private"])(
    "requires a session on a direct request to %s",
    async (path) => {
      const response = await updateSession(
        new NextRequest(`https://example.test${path}?old=1`),
      );
      expect(response.headers.get("location")).toBe(
        "https://example.test/auth/login",
      );
      expect(response.cookies.get("session")?.value).toBe("refreshed");
    },
  );

  it.each(["/", "/game", "/auth/login", "/auth/confirm"])(
    "keeps %s public while refreshing cookies",
    async (path) => {
      const response = await updateSession(
        new NextRequest(`https://example.test${path}`),
      );
      expect(response.headers.get("location")).toBeNull();
      expect(response.cookies.get("session")?.value).toBe("refreshed");
    },
  );

  it("allows an authenticated request to a game", async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: "player-1" } } });
    const response = await updateSession(
      new NextRequest("https://example.test/games/abc"),
    );
    expect(response.headers.get("location")).toBeNull();
    expect(response.cookies.get("session")?.value).toBe("refreshed");
  });
});
