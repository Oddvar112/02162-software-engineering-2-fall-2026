import type { ActionCard } from "@/lib/game/types";

export const HAND_SIZE = 9;
export const PILE_SIZE = 20;

type PileTemplate = Omit<ActionCard, "id" | "priority"> & { count: number };

const TEMPLATES: PileTemplate[] = [ //Extra 2x Move 2, 1x U-turn
  { name: "U-turn", type: "rotate", value: 2, count: 2 },
  { name: "Rotate left", type: "rotate", value: -1, count: 3 },
  { name: "Rotate right", type: "rotate", value: 1, count: 3 },
  { name: "Back up", type: "backup", value: -1, count: 1 },
  { name: "Move 1", type: "move", value: 1, count: 5 },
  { name: "Move 2", type: "move", value: 2, count: 5 },
  { name: "Move 3", type: "move", value: 3, count: 1 },
];
// -- OLD IMPLEMENT
export function buildDeck(): ActionCard[] {
  const deck: ActionCard[] = [];
  let priority = 10;
  for (const { count, ...card } of TEMPLATES) {
    for (let index = 0; index < count; index++) {
      deck.push({ ...card, id: `${card.type}-${priority}`, priority });
      priority += 10;
    }
  }
  return deck;
}

export function buildPile(): ActionCard[] {
  const deck: ActionCard[] = [];
  let priority = 10;
  for (const { count, ...card } of TEMPLATES) {
    for (let index = 0; index < count; index++) {
      deck.push({ ...card, id: `${card.type}-${priority}`, priority });
      priority += 10;
    }
  }
  return deck;
}

export function shuffle<T>(items: T[], random = Math.random): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const swap = Math.floor(random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

export function createDecksForPlayers(
  playerIds: string[],
  random = Math.random,
): Record<string, ActionCard[]> {
  return Object.fromEntries(
    playerIds.map((playerId) => [
      playerId,
      shuffle(buildPile(), random)
    ]),
  );
}

export function drawHand(
  drawPile: ActionCard[],
  discardPile: ActionCard[],
  random = Math.random,
): {hand: ActionCard[];
  drawPile: ActionCard[]; 
  discardPile: ActionCard[]} {
  
    let draw = [...drawPile];
  let discard = [...discardPile];
  const hand: ActionCard[] = [];

  while (hand.length < HAND_SIZE) {
    if (draw.length == 0) {
              if (discard.length === 0) {
        throw new Error("No cards left to draw: draw pile and discard pile are both empty.");
      }
      draw = shuffle(discard, random)
      discard = [];
    }
    const [next, ...rest] = draw;
    hand.push(next);
    draw = rest;
    }
    return {hand, drawPile: draw, discardPile: discard}
  }

// -- OLD IMPLEMENT
export function dealHands(
  playerIds: string[],
  random = Math.random,
): Record<string, ActionCard[]> {
  const deck = shuffle(buildDeck(), random);
  if (deck.length < playerIds.length * HAND_SIZE) {
    throw new Error("The deck is too small for this many players.");
  }
  return Object.fromEntries(
    playerIds.map((playerId, index) => [
      playerId,
      deck.slice(index * HAND_SIZE, (index + 1) * HAND_SIZE),
    ]),
  );
}
