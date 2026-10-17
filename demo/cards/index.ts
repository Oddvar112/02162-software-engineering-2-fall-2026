import type { ActionCard } from "@/lib/game/types";

export const DEMO_CARD_TEMPLATES: Omit<ActionCard, "id">[] = [
  { name: "Move 1", type: "move", value: 1, priority: 510 },
  { name: "Move 2", type: "move", value: 2, priority: 670 },
  { name: "Move 3", type: "move", value: 3, priority: 840 },
  { name: "Back up", type: "backup", value: -1, priority: 80 },
  { name: "Rotate left", type: "rotate", value: -1, priority: 330 },
  { name: "Rotate right", type: "rotate", value: 1, priority: 260 },
  { name: "U-turn", type: "rotate", value: 2, priority: 100 },
];

export function createDemoHand(
  userId: string,
  copiesPerType = 5,
): ActionCard[] {
  const cards: ActionCard[] = [];
  for (const template of DEMO_CARD_TEMPLATES) {
    for (let c = 1; c <= copiesPerType; c++) {
      cards.push({
        ...template,
        id: `demo-${userId}-${template.type}-${template.value}-${c}`,
        priority: template.priority + c,
      });
    }
  }
  return cards;
}

export function createDemoHands(
  playerIds: string[],
  copiesPerType = 5,
): Record<string, ActionCard[]> {
  return Object.fromEntries(
    playerIds.map((playerId) => [
      playerId,
      createDemoHand(playerId, copiesPerType),
    ]),
  );
}
