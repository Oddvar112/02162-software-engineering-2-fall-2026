import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_PRESETS,
  applyPresetToHand,
  deleteCustomPreset,
  getAllPresets,
  getCustomPresets,
  getPresetCardsSummary,
  saveCustomPreset,
  DEMO_PRESETS_STORAGE_KEY,
} from "./index";
import { createDemoHand } from "../cards";
import type { ActionCard } from "@/lib/game/types";

describe("demo presets", () => {
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    mockStorage = {};
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: (key: string) => mockStorage[key] ?? null,
        setItem: (key: string, val: string) => {
          mockStorage[key] = val;
        },
        removeItem: (key: string) => {
          delete mockStorage[key];
        },
        clear: () => {
          mockStorage = {};
        },
      },
      writable: true,
    });
  });

  it("contains default presets with valid card configurations", () => {
    expect(DEFAULT_PRESETS.length).toBeGreaterThan(0);
    for (const preset of DEFAULT_PRESETS) {
      expect(preset.id).toBeTruthy();
      expect(preset.name).toBeTruthy();
      expect(preset.cardNames.length).toBeGreaterThan(0);
    }
  });

  it("applies a preset to a demo hand selecting the exact sequence of cards", () => {
    const hand = createDemoHand("player-1", 5);
    const sprintPreset = DEFAULT_PRESETS.find(
      (p) => p.id === "preset-sprint-5",
    )!;
    expect(sprintPreset).toBeDefined();

    const selectedIds = applyPresetToHand(sprintPreset, hand);
    expect(selectedIds).toHaveLength(5);

    // Each selected card should be unique and have name 'Move 3'
    const uniqueIds = new Set(selectedIds);
    expect(uniqueIds.size).toBe(5);

    const selectedCards = selectedIds.map((id) =>
      hand.find((c) => c.id === id)!,
    );
    expect(selectedCards.every((c) => c.name === "Move 3")).toBe(true);
  });

  it("handles partial matches when hand does not have enough copies of a card", () => {
    const customHand: ActionCard[] = [
      { id: "c1", name: "Move 3", type: "move", value: 3, priority: 800 },
      {
        id: "c2",
        name: "Rotate right",
        type: "rotate",
        value: 1,
        priority: 200,
      },
    ];
    const sprintPreset = DEFAULT_PRESETS.find(
      (p) => p.id === "preset-sprint-5",
    )!; // expects 5x Move 3
    const selectedIds = applyPresetToHand(sprintPreset, customHand);
    // Only 1 Move 3 is in hand, so only 1 card is selected
    expect(selectedIds).toEqual(["c1"]);
  });

  it("saves, lists, and deletes custom presets via localStorage", () => {
    expect(getCustomPresets()).toEqual([]);

    const created = saveCustomPreset("My Turbo Combo", [
      "Move 3",
      "Move 3",
      "Rotate right",
    ]);
    expect(created.name).toBe("My Turbo Combo");
    expect(created.isCustom).toBe(true);
    expect(created.cardNames).toEqual(["Move 3", "Move 3", "Rotate right"]);

    const custom = getCustomPresets();
    expect(custom).toHaveLength(1);
    expect(custom[0].id).toBe(created.id);

    const all = getAllPresets();
    expect(all.length).toBe(DEFAULT_PRESETS.length + 1);

    deleteCustomPreset(created.id);
    expect(getCustomPresets()).toHaveLength(0);
    expect(getAllPresets()).toHaveLength(DEFAULT_PRESETS.length);
  });

  it("formats preset card sequences into human-readable summary strings", () => {
    expect(getPresetCardsSummary([])).toBe("Empty");
    expect(getPresetCardsSummary(["Move 1"])).toBe("Move 1");
    expect(
      getPresetCardsSummary(["Move 3", "Move 3", "Move 3", "Move 3", "Move 3"]),
    ).toBe("Move 3 x5");
    expect(getPresetCardsSummary(["Rotate right", "Move 3", "Move 2"])).toBe(
      "Rotate right → Move 3 → Move 2",
    );
  });
});
