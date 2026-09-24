export const testBoard: Board = {
  id: "test-board",
  width: 4,
  height: 4,
  tiles: [
    [ {kind:"floor"}, {kind:"floor"}, {kind:"floor"}, {kind:"checkpoint", number: 1} ],
    [ {kind:"floor"}, {kind:"conveyor", direction:2, express:false}, {kind:"conveyor", direction:2, express:false}, {kind:"floor"} ],
    [ {kind:"floor"}, {kind:"floor"}, {kind:"floor"}, {kind:"floor"} ],
    [ {kind:"floor"}, {kind:"floor"}, {kind:"floor"}, {kind:"floor"} ],
  ],
  walls: [
    {One : { x: 1, y: 2 }, Two : { x: 2, y: 2 }}
  ],
  startpositions: [
    { x: 0, y: 3 },
    { x: 1, y: 3 },
  ],
};