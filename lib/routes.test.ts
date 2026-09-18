import { describe, expect, it } from "vitest";
import { isPublicRoute } from "@/lib/routes";

describe("isPublicRoute", () => {
  it("allows the landing page", () => {
    expect(isPublicRoute("/")).toBe(true);
  });

  it("allows the auth routes", () => {
    expect(isPublicRoute("/auth")).toBe(true);
    expect(isPublicRoute("/auth/login")).toBe(true);
    expect(isPublicRoute("/auth/sign-up")).toBe(true);
    expect(isPublicRoute("/auth/confirm")).toBe(true);
    expect(isPublicRoute("/auth/update-password")).toBe(true);
  });

  it("allows the board prototype", () => {
    expect(isPublicRoute("/game")).toBe(true);
  });

  it("protects the lobby and game pages", () => {
    expect(isPublicRoute("/lobbies")).toBe(false);
    expect(isPublicRoute("/lobbies/abc")).toBe(false);
    expect(isPublicRoute("/games/abc")).toBe(false);
    expect(isPublicRoute("/protected")).toBe(false);
  });

  it("stops at a segment boundary, so a prefix does not leak access", () => {
    expect(isPublicRoute("/games")).toBe(false);
    expect(isPublicRoute("/authorize")).toBe(false);
  });
});
