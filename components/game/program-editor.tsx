"use client";

import { useId, useState } from "react";
import { LockKeyhole } from "lucide-react";
import styles from "@/app/game/game.module.css";
import type { GameState } from "@/lib/game/types";

export function ProgramEditor({
  gameState,
  isSubmitting,
  onSubmit,
  activeCardId,
  executionMessage,
}: {
  activeCardId?: string | null;
  executionMessage?: string;
  gameState: GameState;
  isSubmitting: boolean;
  onSubmit: (cardIds: string[]) => Promise<void>;
}) {
  const descriptionId = useId();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const player = gameState.players.find(
    (candidate) => candidate.id === gameState.currentPlayerId,
  )!;
  const locked = player.programLocked;
  const editable =
    !locked &&
    !isSubmitting &&
    player.lives > 0 &&
    (gameState.phase === "programming" || gameState.phase === "waiting");
  const cards = locked
    ? gameState.currentPlayerProgram
    : selectedIds.flatMap((id) =>
        gameState.currentPlayerCards.filter((card) => card.id === id),
      );

  return (
    <section className={styles.programEditor} aria-label="Program your turn">
      <div className={styles.programHeading}>
        <h2>
          YOUR PROGRAM · {cards.length}/{gameState.registerCount}
        </h2>
        <span role="status">
          {executionMessage
            ? executionMessage
            : player.lives === 0
              ? "Robot eliminated"
              : gameState.phase === "end-of-round"
                ? locked
                  ? "Program executed · locked"
                  : "Round complete. Start the next round."
                : locked
                  ? "Program locked"
                  : "Click cards in execution order. Click again to remove."}
        </span>
      </div>
      <div className={styles.programRow}>
        <div className={styles.actionCards}>
          {gameState.currentPlayerCards.map((card) => {
            const order =
              cards.findIndex((chosen) => chosen.id === card.id) + 1;
            const selected = order > 0;
            return (
              <button
                className={styles.actionCard}
                type="button"
                key={card.id}
                aria-label={`${card.name}, priority ${card.priority}`}
                aria-pressed={selected}
                aria-current={card.id === activeCardId ? "step" : undefined}
                aria-describedby={`${descriptionId}-${card.id}`}
                disabled={
                  !editable ||
                  (!selected && cards.length >= gameState.registerCount)
                }
                onClick={() =>
                  setSelectedIds((ids) =>
                    ids.includes(card.id)
                      ? ids.filter((id) => id !== card.id)
                      : ids.length < gameState.registerCount
                        ? [...ids, card.id]
                        : ids,
                  )
                }
              >
                <span id={`${descriptionId}-${card.id}`} className="sr-only">
                  {selected
                    ? `Execution order ${order}${editable ? ". Click to remove from your program." : "."}`
                    : editable
                      ? "Click to add to the end of your program."
                      : "Not in your program."}
                </span>
                <b className={styles.cardOrder} aria-hidden="true">
                  {selected ? String(order).padStart(2, "0") : "+"}
                </b>
                <div>
                  <strong>{card.name}</strong>
                  <span>P.{card.priority}</span>
                </div>
              </button>
            );
          })}
        </div>
        <button
          className={styles.lockInButton}
          type="button"
          disabled={!editable || cards.length !== gameState.registerCount}
          onClick={() => void onSubmit(selectedIds)}
        >
          <LockKeyhole aria-hidden="true" />
          {isSubmitting
            ? "Submitting…"
            : gameState.phase === "execution"
              ? "Running…"
              : locked
                ? "Locked In"
                : "Lock In"}
        </button>
      </div>
    </section>
  );
}
