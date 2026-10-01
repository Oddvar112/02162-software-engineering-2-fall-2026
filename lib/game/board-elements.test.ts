import type { Board, Position } from "@/lib/board";
import { Direction } from "@/lib/direction";
import type { Tile } from "@/lib/tile";
import { describe, expect, it } from "vitest";
import { resolveRound, type Programs } from "./engine";
import { buildGameState } from "./fixtures";

const belt = (direction: Direction, express = false): Tile => ({
  kind: "conveyor",
  direction,
  express,
});
const gear = (clockwise: boolean): Tile => ({ kind: "gear", clockwise });

function play(
  tiles: Record<string, Tile>,
  starts: Position[],
  {
    walls = [],
    registers = 1,
    programs = {},
  }: { walls?: Board["walls"]; registers?: number; programs?: Programs } = {},
) {
  const state = buildGameState({
    id: "test",
    width: 6,
    height: 6,
    tiles: Array.from({ length: 6 }, (_, y) =>
      Array.from(
        { length: 6 },
        (_, x): Tile => tiles[`${x},${y}`] ?? { kind: "floor" },
      ),
    ),
    walls,
    startpositions: starts,
  });
  state.registerCount = registers;
  return resolveRound(state, programs);
}

const spots = (state: ReturnType<typeof play>) =>
  state.robots.map(({ x, z }) => [x, z]);

describe("conveyor belts", () => {
  it("carries a robot one tile without turning it and records a frame", () => {
    const state = play({ "1,1": belt(Direction.Right) }, [{ x: 1, y: 1 }]);
    expect(state.robots[0]).toMatchObject({
      x: 2,
      z: 1,
      direction: Direction.Up,
    });
    expect(state.executionFrames.map((frame) => frame.message)).toContain(
      "Register 1: Conveyors move",
    );
  });

  it("uses the belt a robot starts on, not the one it lands on", () => {
    const tiles = {
      "1,1": belt(Direction.Right),
      "2,1": belt(Direction.Right),
    };
    expect(spots(play(tiles, [{ x: 1, y: 1 }]))).toEqual([[2, 1]]);
  });

  it("activates again after every register", () => {
    const tiles = {
      "1,1": belt(Direction.Right),
      "2,1": belt(Direction.Right),
    };
    const state = play(tiles, [{ x: 1, y: 1 }], { registers: 2 });
    expect(spots(state)).toEqual([[3, 1]]);
  });

  it.each([
    [Direction.Down, Direction.Right],
    [Direction.Up, Direction.Left],
  ])("turns the robot with the bend onto a belt facing %s", (next, facing) => {
    const tiles = { "1,1": belt(Direction.Right), "2,1": belt(next) };
    expect(play(tiles, [{ x: 1, y: 1 }]).robots[0]).toMatchObject({
      x: 2,
      z: 1,
      direction: facing,
    });
  });

  it("does not carry a robot into a tile another robot occupies", () => {
    const state = play({ "1,1": belt(Direction.Right) }, [
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ]);
    expect(spots(state)).toEqual([
      [1, 1],
      [2, 1],
    ]);
  });

  it("moves neither robot when two belts lead to the same tile", () => {
    const tiles = { "1,1": belt(Direction.Right), "3,1": belt(Direction.Left) };
    const starts = [
      { x: 1, y: 1 },
      { x: 3, y: 1 },
    ];
    expect(spots(play(tiles, starts))).toEqual([
      [1, 1],
      [3, 1],
    ]);
  });

  it("does not let robots on facing belts swap places", () => {
    const tiles = { "1,1": belt(Direction.Right), "2,1": belt(Direction.Left) };
    const starts = [
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ];
    expect(spots(play(tiles, starts))).toEqual([
      [1, 1],
      [2, 1],
    ]);
  });

  it("moves a line of robots on the same belt together", () => {
    const tiles = {
      "1,1": belt(Direction.Right),
      "2,1": belt(Direction.Right),
    };
    const starts = [
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ];
    expect(spots(play(tiles, starts))).toEqual([
      [2, 1],
      [3, 1],
    ]);
  });

  it("is blocked by a wall the same way a program card is", () => {
    const walls = [{ One: { x: 1, y: 1 }, Two: { x: 2, y: 1 } }];
    const state = play({ "1,1": belt(Direction.Right) }, [{ x: 1, y: 1 }], {
      walls,
    });
    expect(spots(state)).toEqual([[1, 1]]);
  });

  it("carries a robot on an express belt two tiles", () => {
    const tiles = {
      "1,1": belt(Direction.Right, true),
      "2,1": belt(Direction.Right, true),
    };
    expect(spots(play(tiles, [{ x: 1, y: 1 }]))).toEqual([[3, 1]]);
  });

  it("costs a life when a belt carries a robot into a pit", () => {
    const tiles: Record<string, Tile> = {
      "1,1": belt(Direction.Right),
      "2,1": { kind: "pit" },
    };
    expect(play(tiles, [{ x: 1, y: 1 }]).players[0].lives).toBe(2);
  });

  it("moves after the cards of the register and before checkpoints count", () => {
    const tiles: Record<string, Tile> = {
      "1,1": belt(Direction.Right),
      "2,1": { kind: "checkpoint", number: 1 },
    };
    const move = {
      id: "m",
      name: "Move 1",
      type: "move" as const,
      value: 1,
      priority: 500,
    };
    const state = play(tiles, [{ x: 1, y: 2 }], {
      programs: { "player-1": [move] },
    });
    expect(spots(state)).toEqual([[2, 1]]);
    expect(state.players[0].checkpointsReached).toBe(1);
  });
});

describe("gears", () => {
  it("turns a robot a quarter turn in the gear's direction", () => {
    const state = play({ "1,1": gear(true), "3,1": gear(false) }, [
      { x: 1, y: 1 },
      { x: 3, y: 1 },
    ]);
    expect(state.robots.map((robot) => robot.direction)).toEqual([
      Direction.Right,
      Direction.Left,
    ]);
    expect(spots(state)).toEqual([
      [1, 1],
      [3, 1],
    ]);
    expect(state.executionFrames.map((frame) => frame.message)).toContain(
      "Register 1: Gears turn",
    );
  });

  it("turns after the conveyors have moved", () => {
    const tiles = { "1,1": belt(Direction.Right), "2,1": gear(true) };
    expect(play(tiles, [{ x: 1, y: 1 }]).robots[0]).toMatchObject({
      x: 2,
      z: 1,
      direction: Direction.Right,
    });
  });
});
