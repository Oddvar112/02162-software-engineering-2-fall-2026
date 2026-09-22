type TilePair = {
    One: Tile,
    Two: Tile
}

type Board = {
    width: number,
    height: number,
    walls: Array<TilePair>,
    tiles: Array<Tile>,
    startpossions: Array<Tile>
}