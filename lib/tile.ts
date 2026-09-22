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


type Tile = FloorTile | ConveyorTile | LaserTile;