import { describe, expect, it } from "vitest";
import { createDemoHand, createDemoHands, DEMO_CARD_TEMPLATES } from "./index";

describe("Demo Cards", () => {
  it("includes all 7 standard card types", () => {
    expect(DEMO_CARD_TEMPLATES).toHaveLength(7);
    const names = DEMO_CARD_TEMPLATES.map((c) => c.name);
    expect(names).toContain("Move 1");
    expect(names).toContain("Move 2");
    expect(names).toContain("Move 3");
    expect(names).toContain("Back up");
    expect(names).toContain("Rotate left");
    expect(names).toContain("Rotate right");
    expect(names).toContain("U-turn");
  });

  it("generates a full hand containing multiple copies of each card type", () => {
    const hand = createDemoHand("player-1", 5);
    expect(hand).toHaveLength(35);

    // Unique IDs for every card
    const ids = new Set(hand.map((c) => c.id));
    expect(ids.size).toBe(35);

    // Each type has 5 copies
    for (const template of DEMO_CARD_TEMPLATES) {
      const copies = hand.filter((c) => c.name === template.name);
      expect(copies).toHaveLength(5);
    }
  });

  it("generates hands for multiple players", () => {
    const hands = createDemoHands(["p1", "p2"]);
    expect(Object.keys(hands)).toEqual(["p1", "p2"]);
    expect(hands["p1"]).toHaveLength(35);
    expect(hands["p2"]).toHaveLength(35);

    // Player 1 and Player 2 have distinct IDs
    const p1Ids = new Set(hands["p1"].map((c) => c.id));
    const p2Ids = new Set(hands["p2"].map((c) => c.id));
    for (const id of p1Ids) {
      expect(p2Ids.has(id)).toBe(false);
    }
  });
});
