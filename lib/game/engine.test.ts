import type { Board } from "@/lib/board";
import { Direction } from "@/lib/direction";
import { describe, expect, it } from "vitest";
import { resolveRound, type Programs } from "./engine";
import { turn } from "./grid";
import type { ActionCard, GameState } from "./types";

const flatBoard = (): Board => ({
  id: "flat",
  width: 10,
  height: 10,
  tiles: Array.from({ length: 10 }, () =>
    Array.from({ length: 10 }, () => ({ kind: "floor" })),
  ),
  walls: [],
  startpositions: [1, 3, 6, 8].map((x) => ({ x, y: 8 })),
});

function makeState(playerCount = 1, board = flatBoard()): GameState {
  const seats = board.startpositions.slice(0, playerCount);
  return {
    gameId: "test",
    lobbyId: "lobby",
    winnerId: null,
    round: 1,
    phase: "programming",
    currentPlayerId: "p1",
    board,
    registerCount: 5,
    robots: seats.map((position, index) => ({
      id: `p${index + 1}`,
      playerId: `p${index + 1}`,
      modelId: "bolt",
      name: `Robot ${index + 1}`,
      color: "#fff",
      x: position.x,
      z: position.y,
      direction: Direction.Up,
    })),
    players: seats.map((_, index) => ({
      id: `p${index + 1}`,
      name: `Player ${index + 1}`,
      robotId: `p${index + 1}`,
      damage: 0,
      checkpointsReached: 0,
      programmedCardCount: 5,
      programLocked: true,
      connected: true,
    })),
    currentPlayerCards: [],
    currentPlayerProgram: [],
    executionLog: [],
    executionFrames: [],
    timerEndsAt: null,
    updatedAt: "",
  };
}

let nextPriority = 1000;
const card = (
  name: string,
  type: ActionCard["type"],
  value: number,
  priority = nextPriority--,
): ActionCard => ({ id: `${name}-${priority}`, name, type, value, priority });

const move = (value: number, priority?: number) =>
  card(`Move ${value}`, "move", value, priority);
const rotate = (value: number, priority?: number) =>
  card(value < 0 ? "Rotate left" : "Rotate right", "rotate", value, priority);
const backup = (priority?: number) => card("Back up", "backup", -1, priority);

function fill(cards: ActionCard[], count = 5): ActionCard[] {
  return [
    ...cards,
    ...Array.from({ length: count - cards.length }, () => rotate(1)),
  ].slice(0, count);
}

describe("turn", () => {
  it("rotates through the four directions and wraps around", () => {
    expect(turn(Direction.Up, 1)).toBe(Direction.Right);
    expect(turn(Direction.Up, -1)).toBe(Direction.Left);
    expect(turn(Direction.Up, 2)).toBe(Direction.Down);
    expect(turn(Direction.Left, 1)).toBe(Direction.Up);
  });
});

describe("resolveRound", () => {
  it.each([
    [Direction.Up, { x: 1, y: 7 }],
    [Direction.Right, { x: 2, y: 8 }],
    [Direction.Down, { x: 1, y: 9 }],
    [Direction.Left, { x: 0, y: 8 }],
  ])(
    "blocks direction %s with either wall endpoint order",
    (direction, destination) => {
      for (const reversed of [false, true]) {
        const state = makeState();
        state.registerCount = 1;
        state.robots[0].direction = direction;
        const origin = { x: 1, y: 8 };
        state.board.walls = [
          reversed
            ? { One: destination, Two: origin }
            : { One: origin, Two: destination },
        ];
        Object.assign(state, resolveRound(state, { p1: [move(1)] }));
        expect(state.robots[0]).toMatchObject({ x: 1, z: 8, direction });
      }
    },
  );

  it("executes the five registers in order and logs each card once", () => {
    const state = makeState();
    const program = [move(1), rotate(1), move(2), rotate(-1), move(1)];
    Object.assign(state, resolveRound(state, { p1: program }));
    expect(state.phase).toBe("end-of-round");
    expect(state.executionLog.map((entry) => entry.register)).toEqual([
      1, 2, 3, 4, 5,
    ]);
    expect(state.executionLog.map((entry) => entry.card.id)).toEqual(
      program.map((entry) => entry.id),
    );
    expect(state.robots[0]).toMatchObject({
      x: 3,
      z: 6,
      direction: Direction.Up,
    });
  });

  it("backs up in the opposite direction without turning", () => {
    const state = makeState();
    state.registerCount = 2;
    Object.assign(state, resolveRound(state, { p1: [backup(), move(1)] }));
    expect(state.robots[0]).toMatchObject({
      x: 1,
      z: 8,
      direction: Direction.Up,
    });
  });

  it("pushes an occupied tile and stops the whole chain at a wall", () => {
    const state = makeState(2);
    state.registerCount = 1;
    Object.assign(state.robots[1], { x: 1, z: 7 });
    state.board.walls = [{ One: { x: 1, y: 5 }, Two: { x: 1, y: 4 } }];
    Object.assign(
      state,
      resolveRound(state, { p1: [move(3)], p2: [rotate(1, 1)] }),
    );
    expect(state.robots.map(({ x, z }) => ({ x, z }))).toEqual([
      { x: 1, z: 6 },
      { x: 1, z: 5 },
    ]);
  });

  it("resolves higher priority first, so the slower robot pushes the faster one back", () => {
    const state = makeState(2);
    state.registerCount = 1;
    Object.assign(state.robots[0], { x: 4, z: 8, direction: Direction.Right });
    Object.assign(state.robots[1], { x: 6, z: 8, direction: Direction.Left });
    Object.assign(
      state,
      resolveRound(state, { p1: [move(1, 100)], p2: [move(1, 900)] }),
    );
    expect(state.executionLog.map((entry) => entry.playerId)).toEqual([
      "p2",
      "p1",
    ]);
    expect(state.robots[0]).toMatchObject({ x: 5, z: 8 });
    expect(state.robots[1]).toMatchObject({ x: 6, z: 8 });
  });

  it("counts checkpoints only in order at the end of a register", () => {
    for (const reversed of [false, true]) {
      const state = makeState();
      state.registerCount = 1;
      Object.assign(state.robots[0], { x: 1, z: 3 });
      state.board.tiles[2][1] = {
        kind: "checkpoint",
        number: reversed ? 2 : 1,
      };
      state.board.tiles[1][1] = {
        kind: "checkpoint",
        number: reversed ? 1 : 2,
      };
      Object.assign(state, resolveRound(state, { p1: [move(1)] }));
      expect(state.players[0].checkpointsReached).toBe(reversed ? 0 : 1);
    }
  });

  it("does not count a checkpoint the robot only drives across", () => {
    const state = makeState();
    state.registerCount = 1;
    Object.assign(state.robots[0], { x: 1, z: 3 });
    state.board.tiles[2][1] = { kind: "checkpoint", number: 1 };
    const result = resolveRound(state, { p1: [move(2)] });
    expect(result.robots[0]).toMatchObject({ x: 1, z: 1 });
    expect(result.players[0].checkpointsReached).toBe(0);
  });

  it("shows checkpoint progress only once a register has ended on it", () => {
    const state = makeState();
    state.registerCount = 2;
    Object.assign(state.robots[0], { x: 1, z: 3 });
    state.board.tiles[2][1] = { kind: "checkpoint", number: 1 };
    const { executionFrames } = resolveRound(state, {
      p1: [move(2), backup()],
    });
    expect(
      executionFrames.map((frame) => frame.players[0].checkpointsReached),
    ).toEqual([0, 0, 0, 0, 1, 1]);
    expect(executionFrames[4].message).toBe(
      "Register 2: Player 1 reached checkpoint 1",
    );
  });

  it("gives the checkpoint to the robot standing on it when the register ends", () => {
    const state = makeState(2);
    state.registerCount = 1;
    Object.assign(state.robots[0], { x: 1, z: 3 });
    Object.assign(state.robots[1], { x: 0, z: 2, direction: Direction.Right });
    state.board.tiles[2][1] = { kind: "checkpoint", number: 1 };
    const result = resolveRound(state, {
      p1: [move(1, 900)],
      p2: [move(1, 100)],
    });
    expect(result.robots[0]).toMatchObject({ x: 2, z: 2 });
    expect(result.robots[1]).toMatchObject({ x: 1, z: 2 });
    expect(result.players.map((player) => player.checkpointsReached)).toEqual([
      0, 1,
    ]);
  });

  it("in a pit, skips the rest of the program and reboots near the start", () => {
    const state = makeState();
    state.board.tiles[7][1] = { kind: "pit" };
    Object.assign(
      state,
      resolveRound(state, { p1: fill([move(1), move(1), move(1)]) }),
    );
    expect(state.executionLog).toHaveLength(1);
    expect(state.robots[0]).toMatchObject({
      x: 1,
      z: 8,
      direction: Direction.Up,
    });
  });

  it("driving off the board reboots where the robot started", () => {
    const state = makeState();
    state.registerCount = 1;
    Object.assign(state.robots[0], { x: 1, z: 0 });
    Object.assign(state, resolveRound(state, { p1: [move(1)] }));
    expect(state.robots[0]).toMatchObject({
      x: 1,
      z: 0,
      direction: Direction.Up,
    });
  });

  it("a robot pushed off the board skips the rest of its program", () => {
    const state = makeState(2);
    state.registerCount = 2;
    Object.assign(state.robots[0], { x: 1, z: 1 });
    Object.assign(state.robots[1], { x: 1, z: 0 });
    Object.assign(
      state,
      resolveRound(state, {
        p1: [move(1, 900), rotate(1, 800)],
        p2: [rotate(1, 100), move(1, 50)],
      }),
    );
    expect(state.executionLog.map((entry) => entry.playerId)).toEqual([
      "p1",
      "p1",
    ]);
    expect(state.robots[0]).toMatchObject({ x: 1, z: 0 });
    const pushed = state.robots[1];
    expect(Math.abs(pushed.x - 1) + Math.abs(pushed.z - 0)).toBe(1);
  });

  it("turns a robot around with a U-turn without moving it", () => {
    const state = makeState();
    state.registerCount = 1;
    Object.assign(
      state,
      resolveRound(state, { p1: [card("U-turn", "rotate", 2)] }),
    );
    expect(state.robots[0]).toMatchObject({
      x: 1,
      z: 8,
      direction: Direction.Down,
    });
  });

  it("returns a new state and leaves its input untouched", () => {
    const state = makeState(2);
    const before = structuredClone(state);
    const after = resolveRound(state, {
      p1: fill([move(2)]),
      p2: fill([backup()]),
    });
    expect(state).toEqual(before);
    expect(after.robots[0].z).not.toBe(before.robots[0].z);
    expect(after.executionLog).not.toHaveLength(0);
  });

  it("skips players without a program", () => {
    const state = makeState(2);
    state.registerCount = 1;
    const programs: Programs = { p1: [move(1)] };
    Object.assign(state, resolveRound(state, programs));
    expect(state.executionLog.map((entry) => entry.playerId)).toEqual(["p1"]);
    expect(state.robots[1]).toMatchObject({ x: 3, z: 8 });
  });

  it("records a frame for every step and rotation", () => {
    const state = makeState();
    state.registerCount = 2;
    Object.assign(state, resolveRound(state, { p1: [move(2), rotate(1)] }));
    const messages = state.executionFrames.map((frame) => frame.message);
    expect(messages[0]).toBe("Executing programs…");
    expect(messages.filter((message) => message.includes("Step"))).toHaveLength(
      2,
    );
    expect(
      messages.filter((message) => message.includes("Rotate")),
    ).toHaveLength(1);
    expect(messages.at(-1)).toBe("Round complete");
  });
});
