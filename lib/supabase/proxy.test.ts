import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateSession } from "@/lib/supabase/proxy";

const { getClaims } = vi.hoisted(() => ({ getClaims: vi.fn() }));
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
        `https://example.test/auth/login?next=${encodeURIComponent(`${path}?old=1`)}`,
      );
      expect(response.cookies.get("session")?.value).toBe("refreshed");
    },
  );

  it.each([true, false])(
    "sends /protected to the landing page (signed in: %s)",
    async (signedIn) => {
      getClaims.mockResolvedValue(
        signedIn ? { data: { claims: { sub: "user-1" } } } : { data: null },
      );
      const response = await updateSession(
        new NextRequest("https://example.test/protected"),
      );
      expect(response.headers.get("location")).toBe("https://example.test/");
    },
  );

  it.each(["/auth/login", "/auth/sign-up"])(
    "sends a signed-in visitor away from %s",
    async (path) => {
      getClaims.mockResolvedValue({ data: { claims: { sub: "user-1" } } });
      const response = await updateSession(
        new NextRequest(`https://example.test${path}`),
      );
      expect(response.headers.get("location")).toBe("https://example.test/");
      expect(response.cookies.get("session")?.value).toBe("refreshed");
    },
  );

  it.each(["/auth/update-password", "/auth/confirm", "/auth/forgot-password"])(
    "leaves %s reachable for a signed-in visitor",
    async (path) => {
      getClaims.mockResolvedValue({ data: { claims: { sub: "user-1" } } });
      const response = await updateSession(
        new NextRequest(`https://example.test${path}`),
      );
      expect(response.headers.get("location")).toBeNull();
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
