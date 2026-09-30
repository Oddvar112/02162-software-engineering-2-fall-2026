"use client";

import { ChevronDown, Flag, Heart, LockKeyhole, Shield } from "lucide-react";
import styles from "@/components/game/game-state.module.css";
import type { GameState, RobotState } from "@/lib/game/types";
import { DIRECTION_LABELS } from "@/lib/game/types";

export function PlayerList({
  gameState,
  robotById,
  collapsed,
  listId,
  onToggle,
}: {
  gameState: GameState;
  robotById: Map<string, RobotState>;
  collapsed: boolean;
  listId: string;
  onToggle: () => void;
}) {
  return (
    <section
      className={`${styles.boardPlayers} ${collapsed ? styles.playersCollapsed : ""}`}
      aria-label="Players"
    >
      <button
        type="button"
        className={styles.playersToggle}
        aria-expanded={!collapsed}
        aria-controls={listId}
        onClick={onToggle}
      >
        <div>
          <p className={styles.eyebrow}>Network</p>
          <h2>CONNECTED UNITS</h2>
        </div>
        <span className={styles.playersToggleEnd}>
          <span className={styles.playerCount}>{gameState.players.length}</span>
          <ChevronDown className={styles.playersChevron} aria-hidden="true" />
        </span>
      </button>

      <div className={styles.playerList} id={listId} hidden={collapsed}>
        {gameState.players.map((player) => {
          const robot = robotById.get(player.robotId);
          const isCurrent = player.id === gameState.currentPlayerId;

          return (
            <article
              key={player.id}
              className={`${styles.playerCard} ${isCurrent ? styles.currentPlayer : ""}`}
            >
              <div className={styles.playerHeader}>
                <span
                  className={styles.robotSwatch}
                  style={{ backgroundColor: robot?.color }}
                  aria-hidden="true"
                />
                <div className={styles.playerName}>
                  <strong>{player.name}</strong>
                  <span>
                    {robot?.name} ·{" "}
                    {robot ? DIRECTION_LABELS[robot.direction] : "Unknown"}
                    {robot ? ` · X${robot.x + 1} Y${robot.z + 1}` : ""}
                  </span>
                </div>
                {isCurrent ? (
                  <span className={styles.youBadge}>You</span>
                ) : (
                  <span
                    className={
                      player.connected ? styles.onlineDot : styles.offlineDot
                    }
                    title={player.connected ? "Connected" : "Disconnected"}
                    aria-label={player.connected ? "Connected" : "Disconnected"}
                  />
                )}
              </div>

              <div className={styles.playerStats}>
                <span>
                  <Shield aria-label="Damage" />
                  {player.damage}
                </span>
                <span>
                  <Heart aria-label="Lives" />
                  {player.lives}
                </span>
                <span>
                  <Flag aria-label="Checkpoints" />
                  {player.checkpointsReached}
                </span>
                <span className={styles.hiddenCards}>
                  <LockKeyhole aria-hidden="true" />
                  {player.programLocked
                    ? "Ready"
                    : `${player.programmedCardCount}/${gameState.registerCount}`}
                </span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
