import { Direction } from "@/lib/direction";

export const DIRECTION_ROTATION: Record<Direction, number> = {
  [Direction.Up]: 0,
  [Direction.Right]: -Math.PI / 2,
  [Direction.Down]: Math.PI,
  [Direction.Left]: Math.PI / 2,
};

export function tilePosition(value: number, size: number) {
  return value - (size - 1) / 2;
}
