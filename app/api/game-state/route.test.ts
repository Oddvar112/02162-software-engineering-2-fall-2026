// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import { GET, POST } from "./route";
import {
  createMockGame,
  submitProgram,
  type MockGame,
} from "@/lib/game/programming";

beforeEach(() => {
  delete (globalThis as typeof globalThis & { roboRallySoloDemo?: unknown })
    .roboRallySoloDemo;
});

function post(body: unknown) {
  return POST(
    new Request("http://localhost/api/game-state", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );
}

describe("shared mock game API", () => {
  it("repairs legacy model identities in a retained game and its replay frames", async () => {
    const game = createMockGame();
    submitProgram(
      game,
      "player-1",
      1,
      game.hands["player-1"].slice(0, 5).map((card) => card.id),
    );
    const poses = game.state.robots.map(({ x, z, direction }) => ({
      x,
      z,
      direction,
    }));
    const programs = structuredClone(game.programs);
    const oldNames = ["Bolt", "Vector", "Rivet", "Pixel"];
    for (const robots of [
      game.state.robots,
      ...game.state.executionFrames.map((frame) => frame.robots),
    ]) {
      robots.forEach((robot, index) => {
        Reflect.deleteProperty(robot, "modelId");
        robot.name = oldNames[index];
      });
    }
    (
      globalThis as typeof globalThis & { roboRallySoloDemo?: MockGame }
    ).roboRallySoloDemo = game;

    const result = await GET(
      new Request("http://localhost/api/game-state"),
    ).json();
    expect(result.phase).toBe("end-of-round");
    expect(result.round).toBe(1);
    expect(result.currentPlayerProgram).toEqual(programs["player-1"]);
    result.robots.forEach(
      (robot: { x: number; z: number; direction: string }, index: number) => {
        expect(robot).toMatchObject(poses[index]);
      },
    );
    for (const robots of [
      result.robots,
      ...result.executionFrames.map(
        (frame: { robots: unknown[] }) => frame.robots,
      ),
    ]) {
      expect(robots.map((robot: { modelId: string }) => robot.modelId)).toEqual(
        ["bolt", "glitch", "gizmo", "pixel"],
      );
    }
    expect(game.programs).toEqual(programs);

    const next = await post({
      action: "next-round",
      playerId: "player-1",
      round: 1,
    });
    expect(next.status).toBe(200);
    expect((await next.json()).robots[1]).toMatchObject({
      modelId: "glitch",
      name: "Glitch",
    });
  });

  it("resolves one player's submission immediately and shares the result", async () => {
    const snapshot = await GET(
      new Request("http://localhost/api/game-state"),
    ).json();
    const response = await post({
      action: "lock-in",
      playerId: "player-1",
      round: snapshot.round,
      cardIds: snapshot.currentPlayerCards
        .slice(0, 5)
        .map((card: { id: string }) => card.id),
    });
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.phase).toBe("end-of-round");
    expect(result.executionLog).toHaveLength(5);
    expect(result.robots[0]).toMatchObject({ x: 1, z: 2 });
    expect(result.robots.slice(1)).toEqual(snapshot.robots.slice(1));
    expect(result.players.slice(1)).toEqual(snapshot.players.slice(1));
    const first = await GET(
      new Request("http://localhost/api/game-state"),
    ).json();
    const second = await GET(
      new Request("http://localhost/api/game-state?player=player-2"),
    ).json();
    expect(first.phase).toBe("end-of-round");
    expect(first.currentPlayerProgram).toHaveLength(5);
    expect(first.robots).toEqual(second.robots);
    expect(first.currentPlayerCards).not.toEqual(second.currentPlayerCards);
  });

  it("rejects malformed requests, unknown players and duplicate submissions with useful errors", async () => {
    const invalid = await POST(
      new Request("http://localhost/api/game-state", {
        method: "POST",
        body: "{",
      }),
    );
    expect(invalid.status).toBe(400);
    expect((await invalid.json()).error).toContain("JSON");
    expect(
      GET(new Request("http://localhost/api/game-state?player=missing")).status,
    ).toBe(404);
    const snapshot = await GET(
      new Request("http://localhost/api/game-state"),
    ).json();
    const body = {
      action: "lock-in",
      playerId: "player-1",
      round: 1,
      cardIds: snapshot.currentPlayerCards
        .slice(0, 5)
        .map((card: { id: string }) => card.id),
    };
    const responses = await Promise.all([post(body), post(body)]);
    expect(responses.map((response) => response.status)).toEqual([200, 409]);
    expect((await responses[1].json()).error).toContain("already locked");
  });
});
