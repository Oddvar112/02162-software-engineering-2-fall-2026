import { describe, expect, it } from "vitest";
import { isAuthEntryRoute, isPublicRoute, safeReturnPath } from "@/lib/routes";

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
    expect(isPublicRoute("/game/abc")).toBe(false);
    expect(isPublicRoute("/protected")).toBe(false);
  });

  it("stops at a segment boundary, so a prefix does not leak access", () => {
    expect(isPublicRoute("/games")).toBe(false);
    expect(isPublicRoute("/authorize")).toBe(false);
    expect(isPublicRoute("/game-admin")).toBe(false);
  });
});

describe("isAuthEntryRoute", () => {
  it("covers the pages a signed-in user should not see", () => {
    expect(isAuthEntryRoute("/auth/login")).toBe(true);
    expect(isAuthEntryRoute("/auth/sign-up")).toBe(true);
  });

  it("leaves the confirmation and recovery routes alone", () => {
    expect(isAuthEntryRoute("/auth/confirm")).toBe(false);
    expect(isAuthEntryRoute("/auth/update-password")).toBe(false);
    expect(isAuthEntryRoute("/auth/forgot-password")).toBe(false);
    expect(isAuthEntryRoute("/auth/sign-up-success")).toBe(false);
    expect(isAuthEntryRoute("/auth/error")).toBe(false);
  });
});

describe("safeReturnPath", () => {
  it("keeps an internal path with its query", () => {
    expect(safeReturnPath("/lobbies")).toBe("/lobbies");
    expect(safeReturnPath("/lobbies/abc?tab=players")).toBe(
      "/lobbies/abc?tab=players",
    );
  });

  it("falls back to the landing page when there is nothing to return to", () => {
    expect(safeReturnPath(null)).toBe("/");
    expect(safeReturnPath(undefined)).toBe("/");
    expect(safeReturnPath("")).toBe("/");
  });

  it("refuses anything that could leave the site", () => {
    expect(safeReturnPath("https://evil.example.com")).toBe("/");
    expect(safeReturnPath("//evil.example.com")).toBe("/");
    expect(safeReturnPath(String.raw`/\evil.example.com`)).toBe("/");
    expect(safeReturnPath("javascript:alert(1)")).toBe("/");
    expect(safeReturnPath("lobbies")).toBe("/");
  });

  it("refuses characters the URL parser strips, which would make it external", () => {
    const withControlChar = (code: number) =>
      `/${String.fromCharCode(code)}/evil.example.com`;
    expect(safeReturnPath(withControlChar(9))).toBe("/");
    expect(safeReturnPath(withControlChar(10))).toBe("/");
    expect(safeReturnPath(withControlChar(13))).toBe("/");
  });

  it("keeps a path the parser leaves alone", () => {
    expect(safeReturnPath("/lobbies/abc#players")).toBe("/lobbies/abc#players");
  });
});
