"use client";

import { RefreshCw } from "lucide-react";
import styles from "@/components/game/game-state.module.css";
import type { GameState } from "@/lib/game/types";

function winnerName(gameState: GameState): string | null {
  const total = gameState.board.tiles
    .flat()
    .filter((tile) => tile.kind === "checkpoint").length;
  const winner = gameState.players.find(
    (player) => total > 0 && player.checkpointsReached >= total,
  );
  if (winner) return winner.name;
  const survivors = gameState.players.filter((player) => player.lives > 0);
  return survivors.length === 1 ? survivors[0].name : null;
}

export function RoundResult({
  gameState,
  disabled,
  onReplay,
}: {
  gameState: GameState;
  disabled: boolean;
  onReplay: () => void;
}) {
  if (gameState.phase !== "end-of-round" && gameState.phase !== "finished") {
    return null;
  }

  return (
    <div className={styles.turnResult}>
      <p role="status">
        {gameState.phase === "finished"
          ? `${winnerName(gameState) ?? "Nobody"} wins the race.`
          : `Round ${gameState.round} resolved. The board shows the resulting positions.`}
      </p>
      <details>
        <summary>Executed actions ({gameState.executionLog.length})</summary>
        <ol>
          {gameState.executionLog.map((entry, index) => (
            <li key={index}>
              Register {entry.register} ·{" "}
              {
                gameState.players.find((player) => player.id === entry.playerId)
                  ?.name
              }
              : {entry.card.name} (P.{entry.card.priority})
            </li>
          ))}
        </ol>
      </details>
      {gameState.executionFrames.length > 0 && (
        <button
          type="button"
          className={styles.replayButton}
          onClick={onReplay}
          disabled={disabled}
        >
          <RefreshCw aria-hidden="true" /> Replay movement
        </button>
      )}
    </div>
  );
}
