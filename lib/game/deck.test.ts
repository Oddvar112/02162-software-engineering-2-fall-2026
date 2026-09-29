import { describe, expect, it } from "vitest";
import { buildDeck, dealHands, HAND_SIZE, shuffle } from "./deck";

describe("buildDeck", () => {
  it("gives every card a unique priority so registers never tie", () => {
    const deck = buildDeck();
    const priorities = deck.map((card) => card.priority);
    expect(new Set(priorities).size).toBe(deck.length);
    expect(new Set(deck.map((card) => card.id)).size).toBe(deck.length);
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
