"use client";

import {
  Bot,
  ChevronDown,
  Flag,
  Heart,
  Radio,
  RefreshCw,
  Shield,
  Wifi,
  WifiOff,
} from "lucide-react";
import styles from "@/components/game/game-state.module.css";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { GameState, PlayerState, RobotState } from "@/lib/game/types";
import { DIRECTION_LABELS, PHASE_LABELS } from "@/lib/game/types";

export function GameHeader({
  gameState,
  currentPlayer,
  currentRobot,
  secondsLeft,
  error,
  isSyncing,
  syncedAt,
  onRefresh,
}: {
  gameState: GameState;
  currentPlayer: PlayerState | undefined;
  currentRobot: RobotState | undefined;
  secondsLeft: number | null;
  error: string | null;
  isSyncing: boolean;
  syncedAt: string;
  onRefresh: () => void;
}) {
  return (
    <header className={styles.topbar}>
      <div className={styles.gameIdentity}>
        <span className={styles.brandMark} aria-hidden="true">
          <Bot />
        </span>
        <div>
          <p className={styles.eyebrow}>SYS::{gameState.gameId}</p>
          <h1>
            FACTORY FLOOR / {gameState.board.width}×{gameState.board.height}
          </h1>
        </div>
      </div>

      <div className={styles.roundStatus}>
        <span className={styles.roundNumber}>
          ROUND {String(gameState.round).padStart(2, "0")}
        </span>
        <span className={styles.phaseBadge}>
          <Radio aria-hidden="true" />
          MODE / {PHASE_LABELS[gameState.phase]}
          {secondsLeft !== null && ` · ${secondsLeft}s`}
        </span>
      </div>

      <div className={styles.accountArea}>
        <span className={error ? styles.syncError : styles.syncStatus}>
          {error ? <WifiOff aria-hidden="true" /> : <Wifi aria-hidden="true" />}
          <span>{error ? "LINK DOWN" : isSyncing ? "SYNC" : "LINK OK"}</span>
        </span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={styles.playerMenuTrigger} type="button">
              <span
                className={styles.accountSwatch}
                style={{ backgroundColor: currentRobot?.color }}
                aria-hidden="true"
              />
              <span>{currentPlayer?.name ?? "Player"}</span>
              <ChevronDown
                className={styles.profileChevron}
                aria-hidden="true"
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className={styles.playerMenu}>
            <DropdownMenuLabel className={styles.playerMenuLabel}>
              <strong>{currentPlayer?.name ?? "Player"}</strong>
              <span>
                {currentRobot?.name} ·{" "}
                {currentRobot
                  ? DIRECTION_LABELS[currentRobot.direction]
                  : "Robot"}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className={styles.menuSeparator} />
            <div className={styles.menuStats}>
              <span>
                <Shield aria-hidden="true" />
                {currentPlayer?.damage ?? 0} damage
              </span>
              <span>
                <Heart aria-hidden="true" />
                {currentPlayer?.lives ?? 0} lives
              </span>
              <span>
                <Flag aria-hidden="true" />
                {currentPlayer?.checkpointsReached ?? 0} checkpoints
              </span>
            </div>
            <DropdownMenuSeparator className={styles.menuSeparator} />
            <DropdownMenuItem className={styles.menuItem} onSelect={onRefresh}>
              <RefreshCw className={isSyncing ? styles.spinner : undefined} />
              Refresh game state
              <span>{syncedAt}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
