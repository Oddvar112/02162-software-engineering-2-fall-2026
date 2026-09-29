import { describe, expect, it } from "vitest";
import { buildDeck, dealHands, HAND_SIZE, shuffle } from "./deck";

describe("buildDeck", () => {
  it("gives every card a unique priority so registers never tie", () => {
    const deck = buildDeck();
    const priorities = deck.map((card) => card.priority);
    expect(new Set(priorities).size).toBe(deck.length);
    expect(new Set(deck.map((card) => card.id)).size).toBe(deck.length);
  });

  it("follows the standard priority bands", () => {
    const deck = buildDeck();
    const band = (name: string) => {
      const p = deck.filter((c) => c.name === name).map((c) => c.priority);
      return [Math.min(...p), Math.max(...p)];
    };
    expect(band("U-turn")).toEqual([10, 60]);
    expect(band("Back up")).toEqual([430, 480]);
    expect(band("Move 1")).toEqual([490, 660]);
    expect(band("Move 2")).toEqual([670, 780]);
    expect(band("Move 3")).toEqual([790, 840]);
  });

  it("has enough cards for eight players", () => {
    expect(buildDeck().length).toBeGreaterThanOrEqual(8 * HAND_SIZE);
  });
});

describe("shuffle", () => {
  it("keeps every card and does not mutate the input", () => {
    const deck = buildDeck();
    const copy = [...deck];
    const shuffled = shuffle(deck, () => 0.5);
    expect(deck).toEqual(copy);
    expect([...shuffled].sort((a, b) => a.priority - b.priority)).toEqual(
      [...deck].sort((a, b) => a.priority - b.priority),
    );
  });
});

describe("dealHands", () => {
  it("deals a full hand to every player with no card shared", () => {
    const hands = dealHands(["a", "b", "c"], () => 0.5);
    const all = Object.values(hands).flat();
    expect(
      Object.values(hands).every((hand) => hand.length === HAND_SIZE),
    ).toBe(true);
    expect(new Set(all.map((card) => card.id)).size).toBe(all.length);
  });
});
