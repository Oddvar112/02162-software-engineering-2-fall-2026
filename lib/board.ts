type Position = {x: number, y: number}
type PosPair = {
    One: Position,
    Two: Position
}

type Board = {
    id: string
    width: number,
    height: number,
    walls: PosPair[],
    tiles: Tile[][],
    startpositions: Position[]
}

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
}