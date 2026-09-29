import type { Direction } from "@/lib/direction";

export interface FloorTile {
  kind: "floor";
}

export interface ConveyorTile {
  kind: "conveyor";
  direction: Direction;
  express: boolean;
}

export interface LaserTile {
  kind: "laser";
  direction: Direction;
  strength: number;
}

export interface PitTile {
  kind: "pit";
}

export interface GearTile {
  kind: "gear";
  clockwise: boolean; // True = clockwise, false = counterclockwise
}

export interface PusherTile {
  kind: "pusher";
  direction: Direction;
}

export interface CheckpointTile {
  kind: "checkpoint";
  number: number;
}

export interface RepairTile {
  kind: "repair";
}

export type Tile =
  | FloorTile
  | ConveyorTile
  | LaserTile
  | PitTile
  | GearTile
  | PusherTile
  | CheckpointTile
  | RepairTile;
