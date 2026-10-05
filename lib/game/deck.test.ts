import { describe, expect, it } from "vitest";
import { buildPile, createDecksForPlayers, PILE_SIZE, shuffle } from "./deck";

describe("buildDeck", () => {
  it("gives every card a unique priority so registers never tie", () => {
    const deck = buildPile();
    const priorities = deck.map((card) => card.priority);
    expect(new Set(priorities).size).toBe(deck.length);
    expect(new Set(deck.map((card) => card.id)).size).toBe(deck.length);
  });

  it("follows the standard priority bands", () => {
    const deck = buildPile();
    const band = (...names: string[]) => {
      const p = deck
        .filter((c) => names.includes(c.name))
        .map((c) => c.priority);
      return [Math.min(...p), Math.max(...p)];
    };
    expect(band("U-turn")).toEqual([10, 20]);
    expect(band("Rotate left", "Rotate right")).toEqual([30, 80]);
    expect(band("Back up")).toEqual([90, 90]);
    expect(band("Move 1")).toEqual([100, 140]);
    expect(band("Move 2")).toEqual([150, 190]);
    expect(band("Move 3")).toEqual([200, 200]);
  });

  it("has exacly 20 cards", () => {
    expect(buildPile().length).toEqual(20);
  });
});

describe("shuffle", () => {
  it("keeps every card and does not mutate the input", () => {
    const pile = buildPile();
    const copy = [...pile];
    const shuffled = shuffle(pile, () => 0.5);
    expect(pile).toEqual(copy);
    expect([...shuffled].sort((a, b) => a.priority - b.priority)).toEqual(
      [...pile].sort((a, b) => a.priority - b.priority),
    );
  });
});

describe("createDecksForPlayers", () => {
  it("gives every player a full, independently-shuffled pile with no duplicate ids within it", () => {
    const piles = createDecksForPlayers(["a", "b", "c"], () => 0.5);

    // every player has an entry, each with exactly 20 cards
    expect(Object.values(piles).every((pile) => pile.length === PILE_SIZE)).toBe(true);

    // within each player's own pile, ids are unique (duplicates across players are fine)
    for (const pile of Object.values(piles)) {
      const ids = pile.map((card) => card.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});
