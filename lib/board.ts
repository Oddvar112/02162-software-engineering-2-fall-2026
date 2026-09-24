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