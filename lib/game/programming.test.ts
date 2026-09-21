import { describe, expect, it } from "vitest";
import {
  createMockGame,
  getPlayerSnapshot,
  startNextRound,
  submitProgram,
} from "./programming";

function ids(game: ReturnType<typeof createMockGame>, playerId: string) {
  return game.hands[playerId].slice(0, 5).map((card) => card.id);
}

describe("programming a turn", () => {
  it("executes immediately while other players are unlocked or disconnected", () => {
    const game = createMockGame();
    game.state.players[3].connected = false;
    const otherRobots = structuredClone(game.state.robots.slice(1));
    const otherPlayers = structuredClone(game.state.players.slice(1));
    const ordered = ids(game, "player-1").reverse();
    submitProgram(game, "player-1", 1, ordered);
    const snapshot = getPlayerSnapshot(game, "player-1");
    expect(snapshot.currentPlayerProgram.map((card) => card.id)).toEqual(
      ordered,
    );
    expect(snapshot.players[0]).toMatchObject({
      programLocked: true,
      programmedCardCount: 5,
    });
    expect(snapshot.phase).toBe("end-of-round");
    expect(snapshot.executionLog).toHaveLength(5);
    expect(
      snapshot.executionLog.every((entry) => entry.playerId === "player-1"),
    ).toBe(true);
    expect(snapshot.robots[0]).toMatchObject({
      x: 1,
      z: 2,
      direction: "north",
    });
    expect(snapshot.robots.slice(1)).toEqual(otherRobots);
    expect(snapshot.players.slice(1)).toEqual(otherPlayers);
    expect(getPlayerSnapshot(game, "player-2").currentPlayerProgram).toEqual(
      [],
    );
    snapshot.currentPlayerProgram[0].value = 100;
    expect(game.programs["player-1"][0].value).not.toBe(100);
  });

  it.each([
    ["too few", ["player-1-card-1"]],
    ["too many", Array.from({ length: 6 }, (_, i) => `player-1-card-${i + 1}`)],
    ["duplicate", Array(5).fill("player-1-card-1")],
    ["foreign", Array.from({ length: 5 }, (_, i) => `player-2-card-${i + 1}`)],
    ["invalid type", [1, 2, 3, 4, 5]],
    ["missing", undefined],
  ])("rejects %s cards without changing state", (_, cards) => {
    const game = createMockGame();
    const before = structuredClone(game);
    expect(() => submitProgram(game, "player-1", 1, cards)).toThrow();
    expect(game).toEqual(before);
  });

  it("rejects stale rounds, non-members, and changes after lock-in", () => {
    const game = createMockGame();
    expect(() =>
      submitProgram(game, "player-1", 0, ids(game, "player-1")),
    ).toThrow(/round has changed/);
    expect(() => submitProgram(game, "outsider", 1, [])).toThrow(
      /not in the game/,
    );
    submitProgram(game, "player-1", 1, ids(game, "player-1"));
    expect(() =>
      submitProgram(game, "player-1", 1, ids(game, "player-1").reverse()),
    ).toThrow(/already locked/);
  });

  it("executes the selected cards in register order exactly once", () => {
    const game = createMockGame();
    game.state.board.elements = [];
    submitProgram(game, "player-1", game.state.round, ids(game, "player-1"));
    expect(game.state.phase).toBe("end-of-round");
    expect(game.state.executionLog).toHaveLength(5);
    expect(game.state.executionLog.map((entry) => entry.register)).toEqual([
      1, 2, 3, 4, 5,
    ]);
    expect(game.state.executionLog.map((entry) => entry.card.id)).toEqual(
      ids(game, "player-1"),
    );
    expect(game.state.robots[0]).toMatchObject({
      x: 1,
      z: 2,
      direction: "north",
    });
    const after = structuredClone(game);
    expect(() =>
      submitProgram(game, "player-4", 1, ids(game, "player-4")),
    ).toThrow();
    expect(game).toEqual(after);
    expect(getPlayerSnapshot(game, "player-2").robots).toEqual(
      getPlayerSnapshot(game, "player-1").robots,
    );
  });

  it("uses the selected order for movement, rotation, and backing up", () => {
    const game = createMockGame();
    game.state.players = game.state.players.slice(0, 1);
    game.state.robots = game.state.robots.slice(0, 1);
    game.state.board.elements = [];
    submitProgram(
      game,
      "player-1",
      1,
      [5, 3, 6, 4, 2].map((i) => `player-1-card-${i}`),
    );
    expect(game.state.robots[0]).toMatchObject({
      x: 1,
      z: 6,
      direction: "north",
    });
  });

  it("respects walls from either side", () => {
    const game = createMockGame();
    game.state.board.elements = [
      { id: "wall-a", type: "wall", x: 1, z: 8, side: "north" },
      { id: "wall-b", type: "wall", x: 3, z: 7, side: "south" },
    ];
    submitProgram(game, "player-1", game.state.round, ids(game, "player-1"));
    expect(game.state.robots[0].z).toBe(8);
    startNextRound(game, "player-2", 1);
    submitProgram(game, "player-2", 2, ids(game, "player-2"));
    expect(game.state.robots[1].z).toBe(8);
    expect(
      game.state.executionLog.every((entry) => entry.playerId === "player-2"),
    ).toBe(true);
  });

  it("pushes occupied tiles and stops a pushing chain at a wall", () => {
    const game = createMockGame();
    game.state.registerCount = 1;
    game.state.players = game.state.players.slice(0, 2);
    game.state.robots = game.state.robots.slice(0, 2);
    Object.assign(game.state.robots[1], { x: 1, z: 7 });
    game.state.board.elements = [
      { id: "wall", type: "wall", x: 1, z: 5, side: "north" },
    ];
    submitProgram(game, "player-1", 1, ["player-1-card-1"]);
    expect(game.state.robots.map(({ x, z }) => ({ x, z }))).toEqual([
      { x: 1, z: 6 },
      { x: 1, z: 5 },
    ]);
  });

  it("loses only one life in a pit and skips later actions until reboot", () => {
    const game = createMockGame();
    game.state.board.elements = [{ id: "pit", type: "pit", x: 1, z: 7 }];
    submitProgram(game, "player-1", game.state.round, ids(game, "player-1"));
    expect(game.state.players[0].lives).toBe(2);
    expect(
      game.state.executionLog.filter((entry) => entry.playerId === "player-1"),
    ).toHaveLength(1);
    expect(game.state.robots[0]).toMatchObject({
      x: 1,
      z: 8,
      direction: "north",
    });
  });

  it("starts a clean next round and rejects a duplicate advance", () => {
    const game = createMockGame();
    expect(() => startNextRound(game, "player-1", 1)).toThrow();
    submitProgram(game, "player-1", game.state.round, ids(game, "player-1"));
    const robots = structuredClone(game.state.robots);
    startNextRound(game, "player-1", 1);
    expect(game.state.round).toBe(2);
    expect(game.state.phase).toBe("programming");
    expect(game.programs).toEqual({});
    expect(game.state.executionLog).toEqual([]);
    expect(
      game.state.players.every(
        (player) => !player.programLocked && player.programmedCardCount === 0,
      ),
    ).toBe(true);
    expect(game.state.robots).toEqual(robots);
    expect(() => startNextRound(game, "player-2", 1)).toThrow();
  });
});

describe("execution animation frames", () => {
  it("records every tile and rotation even when the robot returns to its starting pose", () => {
    const game = createMockGame();
    game.state.registerCount = 4;
    const original = structuredClone(game.state.robots[0]);
    submitProgram(
      game,
      "player-1",
      1,
      [3, 6, 4, 5].map((index) => `player-1-card-${index}`),
    );
    expect(game.state.robots[0]).toEqual(original);
    expect(
      game.state.executionFrames.map((frame) => [
        frame.robots[0].z,
        frame.robots[0].direction,
      ]),
    ).toEqual([
      [8, "north"],
      [7, "north"],
      [8, "north"],
      [8, "west"],
      [8, "north"],
      [8, "north"],
    ]);
    expect(game.state.executionFrames[1].cardId).toBe("player-1-card-3");
    game.state.robots[0].z = 0;
    expect(game.state.executionFrames[0].robots[0].z).toBe(8);
  });

  it("records individual steps and gives a visible explanation when movement is blocked", () => {
    const game = createMockGame();
    game.state.registerCount = 1;
    game.state.board.elements = [
      { id: "wall", type: "wall", x: 1, z: 6, side: "north" },
    ];
    submitProgram(game, "player-1", 1, ["player-1-card-1"]);
    expect(
      game.state.executionFrames.map((frame) => frame.robots[0].z),
    ).toEqual([8, 7, 6, 6, 6]);
    expect(game.state.executionFrames[3].message).toContain("Path blocked");
    const firstFrame = game.state.executionFrames[0];
    startNextRound(game, "player-1", 1);
    expect(game.state.executionFrames).toEqual([]);
    expect(firstFrame.robots[0].z).toBe(8);
  });
});
