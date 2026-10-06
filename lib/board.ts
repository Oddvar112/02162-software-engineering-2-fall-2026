import type { Tile } from "@/lib/tile";

export type Position = { x: number; y: number };
export type RebootToken = {
  id: string;
  position: Position;
};
export type PosPair = {
  One: Position;
  Two: Position;
};

export type Board = {
  id: string;
  width: number;
  height: number;
  // Each pair identifies the neighboring cells separated by a wall.
  walls: PosPair[];
  // Row-major grid: tiles[y][x]. Board y maps to z in the 3D scene.
  tiles: Tile[][];
  startpositions: Position[];
  rebootToken: RebootToken;
};

export function validateBoard(board: Board): void {
  // --- Checkpoints numbered 1..n, no gaps, no duplicates ---
  const checkpointNumbers = new Set<number>();

  for (const row of board.tiles) {
    for (const tile of row) {
      if (tile.kind === "checkpoint") {
        if (checkpointNumbers.has(tile.number)) {
          throw new Error(`Duplicate checkpoint number: ${tile.number}`);
        }
        checkpointNumbers.add(tile.number);
      }
    }
  }

  const n = checkpointNumbers.size;
  for (let i = 1; i <= n; i++) {
    if (!checkpointNumbers.has(i)) {
      throw new Error(`Missing checkpoint number: ${i}`);
    }
  }

  // --- Unique start positions ---
  const seenStarts = new Set<string>();

  for (const pos of board.startpositions) {
    const key = `${pos.x},${pos.y}`;
    if (seenStarts.has(key)) {
      throw new Error(`Duplicate start position: (${pos.x}, ${pos.y})`);
    }
    seenStarts.add(key);
  }

  // --- Valid reboot token ---
  if (!board.rebootToken.id) {
    throw new Error("A reboot token needs an ID.");
  }
}
