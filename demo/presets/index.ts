import type { ActionCard } from "@/lib/game/types";
import type { DemoPreset } from "../types";

export const DEFAULT_PRESETS: DemoPreset[] = [
  {
    id: "preset-sprint-5",
    name: "Sprint Straight (5)",
    description: "Move 3 x 5 — Maximum forward acceleration",
    cardNames: ["Move 3", "Move 3", "Move 3", "Move 3", "Move 3"],
  },
  {
    id: "preset-single-1",
    name: "Single Step (1)",
    description: "Move 1 x 1 — Minimal 1-card submission test",
    cardNames: ["Move 1"],
  },
  {
    id: "preset-right-dash",
    name: "Turn Right & Dash (3)",
    description: "Turn right and advance forward",
    cardNames: ["Rotate right", "Move 3", "Move 2"],
  },
  {
    id: "preset-left-dash",
    name: "Turn Left & Dash (3)",
    description: "Turn left and advance forward",
    cardNames: ["Rotate left", "Move 3", "Move 2"],
  },
  {
    id: "preset-uturn-retreat",
    name: "U-Turn & Retreat (3)",
    description: "180 flip and reverse positioning",
    cardNames: ["U-turn", "Move 2", "Back up"],
  },
  {
    id: "preset-circuit-7",
    name: "Circuit (7)",
    description: "Move & turn circuit demonstrating >5 cards submission",
    cardNames: [
      "Move 3",
      "Rotate right",
      "Move 3",
      "Rotate right",
      "Move 3",
      "Rotate right",
      "Move 3",
    ],
  },
];

export const DEMO_PRESETS_STORAGE_KEY = "roborally_demo_presets";

export function getCustomPresets(): DemoPreset[] {
  if (typeof window === "undefined" || !window.localStorage) {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(DEMO_PRESETS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getAllPresets(): DemoPreset[] {
  return [...DEFAULT_PRESETS, ...getCustomPresets()];
}

export function saveCustomPreset(
  name: string,
  cardNames: string[],
  description?: string,
): DemoPreset {
  const newPreset: DemoPreset = {
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim() || "Custom Preset",
    cardNames,
    description: description?.trim() || undefined,
    isCustom: true,
    createdAt: new Date().toISOString(),
  };

  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const existing = getCustomPresets();
      const updated = [...existing, newPreset];
      window.localStorage.setItem(
        DEMO_PRESETS_STORAGE_KEY,
        JSON.stringify(updated),
      );
    } catch {
      // storage quota or private browsing fallback
    }
  }

  return newPreset;
}

export function deleteCustomPreset(id: string): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const existing = getCustomPresets();
    const updated = existing.filter((preset) => preset.id !== id);
    window.localStorage.setItem(
      DEMO_PRESETS_STORAGE_KEY,
      JSON.stringify(updated),
    );
  } catch {
    // storage quota or private browsing fallback
  }
}

export function applyPresetToHand(
  preset: DemoPreset,
  hand: ActionCard[],
): string[] {
  const chosenIds: string[] = [];
  const used = new Set<string>();

  for (const cardName of preset.cardNames) {
    const found = hand.find(
      (c) => c.name.toLowerCase() === cardName.toLowerCase() && !used.has(c.id),
    );
    if (found) {
      chosenIds.push(found.id);
      used.add(found.id);
    }
  }

  return chosenIds;
}

export function getPresetCardsSummary(cardNames: string[]): string {
  if (cardNames.length === 0) return "Empty";
  // Group adjacent identical names: e.g. "Move 3 x 5"
  const parts: string[] = [];
  let current = cardNames[0];
  let count = 1;

  for (let i = 1; i < cardNames.length; i++) {
    if (cardNames[i] === current) {
      count++;
    } else {
      parts.push(count > 1 ? `${current} x${count}` : current);
      current = cardNames[i];
      count = 1;
    }
  }
  parts.push(count > 1 ? `${current} x${count}` : current);
  return parts.join(" → ");
}

export * from "./demo-preset-bar";
