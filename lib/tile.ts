interface FloorTile {
  kind: "floor";
}

interface ConveyorTile {
  kind: "conveyor";
  direction: Direction;
  express: boolean;
}

interface LaserTile {
  kind: "laser";
  direction: Direction;
  strength: number;
}

interface PitTile {
    kind: "pit"
}

interface GearTile {
    kind: "gear",
    clockwise: boolean //Ture = Clockwise, False = Counter clockwise 
}

interface PusherTile {
    kind: "pusher",
    direction: Direction
}

interface CheckpointTile {
    kind: "checkpoint",
    number: number
}

interface RepairTile {
    kind: "repair"
}

type Tile = FloorTile | ConveyorTile | LaserTile | PitTile | GearTile | PusherTile | CheckpointTile | RepairTile ;