"use client";

import {
  AlertTriangle,
  Bot,
  ChevronDown,
  Flag,
  Heart,
  LoaderCircle,
  LockKeyhole,
  MoveUp,
  Radio,
  RefreshCw,
  RotateCw,
  Shield,
  Undo2,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "@/app/game/game.module.css";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ActionCard, GameState } from "@/lib/game/types";
import { DIRECTION_LABELS, PHASE_LABELS } from "@/lib/game/types";
import { RoboBoard } from "./robo-board";

const SYNC_INTERVAL_MS = 5_000;

function CardIcon({ type }: Pick<ActionCard, "type">) {
  if (type === "rotate") return <RotateCw aria-hidden="true" />;
  if (type === "backup") return <Undo2 aria-hidden="true" />;
  return <MoveUp aria-hidden="true" />;
}

function GameLoading() {
  return (
    <main className={styles.stateScreen}>
      <div className={styles.stateCard} role="status">
        <LoaderCircle className={styles.spinner} aria-hidden="true" />
        <p className={styles.stateEyebrow}>Connecting to game</p>
        <h1>Loading the board…</h1>
        <p>Fetching the latest round, robots, and player status.</p>
      </div>
    </main>
  );
}

function GameError({ onRetry }: { onRetry: () => void }) {
  return (
    <main className={styles.stateScreen}>
      <div className={styles.stateCard} role="alert">
        <AlertTriangle className={styles.errorIcon} aria-hidden="true" />
        <p className={styles.stateEyebrow}>Connection error</p>
        <h1>Could not load the game</h1>
        <p>Check your connection and try fetching the game state again.</p>
        <Button className={styles.retryButton} onClick={onRetry}>
          <RefreshCw aria-hidden="true" />
          Try again
        </Button>
      </div>
    </main>
  );
}

export function GameStateView() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const requestInFlight = useRef(false);

  const loadGameState = useCallback(async () => {
    if (requestInFlight.current) return;

    requestInFlight.current = true;
    setIsSyncing(true);
    setError(null);

    try {
      const response = await fetch("/api/game-state", { cache: "no-store" });
      if (!response.ok)
        throw new Error(`Request failed with ${response.status}`);

      const state = (await response.json()) as GameState;
      setGameState(state);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "The game state is unavailable",
      );
    } finally {
      requestInFlight.current = false;
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    void loadGameState();
    const interval = window.setInterval(loadGameState, SYNC_INTERVAL_MS);

    const syncWhenVisible = () => {
      if (document.visibilityState === "visible") void loadGameState();
    };

    window.addEventListener("online", loadGameState);
    document.addEventListener("visibilitychange", syncWhenVisible);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("online", loadGameState);
      document.removeEventListener("visibilitychange", syncWhenVisible);
    };
  }, [loadGameState]);

  const robotById = useMemo(
    () => new Map(gameState?.robots.map((robot) => [robot.id, robot]) ?? []),
    [gameState],
  );

  if (!gameState && !error) return <GameLoading />;
  if (!gameState) return <GameError onRetry={loadGameState} />;

  const currentPlayer = gameState.players.find(
    (player) => player.id === gameState.currentPlayerId,
  );
  const currentRobot = currentPlayer
    ? robotById.get(currentPlayer.robotId)
    : undefined;
  const syncedAt = new Date(gameState.updatedAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <div className={styles.gameIdentity}>
          <span className={styles.brandMark} aria-hidden="true">
            <Bot />
          </span>
          <div>
            <p className={styles.eyebrow}>{gameState.gameId}</p>
            <h1>Factory Floor</h1>
          </div>
        </div>

        <div className={styles.roundStatus}>
          <span className={styles.roundNumber}>Round {gameState.round}</span>
          <span className={styles.phaseBadge}>
            <Radio aria-hidden="true" />
            {PHASE_LABELS[gameState.phase]}
          </span>
        </div>

        <div className={styles.accountArea}>
          <span className={error ? styles.syncError : styles.syncStatus}>
            {error ? (
              <WifiOff aria-hidden="true" />
            ) : (
              <Wifi aria-hidden="true" />
            )}
            <span>{error ? "Offline" : isSyncing ? "Syncing" : "Live"}</span>
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
              <DropdownMenuItem
                className={styles.menuItem}
                onSelect={loadGameState}
              >
                <RefreshCw className={isSyncing ? styles.spinner : undefined} />
                Refresh game state
                <span>{syncedAt}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className={styles.workspace}>
        <section className={styles.boardPanel} aria-label="Game board">
          <RoboBoard gameState={gameState} />
          <section className={styles.boardPlayers} aria-label="Players">
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.eyebrow}>At the table</p>
                <h2>Players</h2>
              </div>
              <span className={styles.playerCount}>
                {gameState.players.length}
              </span>
            </div>

            <div className={styles.playerList}>
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
                          {robot
                            ? DIRECTION_LABELS[robot.direction]
                            : "Unknown"}
                          {robot ? ` · ${robot.x + 1},${robot.z + 1}` : ""}
                        </span>
                      </div>
                      {isCurrent ? (
                        <span className={styles.youBadge}>You</span>
                      ) : (
                        <span
                          className={
                            player.connected
                              ? styles.onlineDot
                              : styles.offlineDot
                          }
                          title={
                            player.connected ? "Connected" : "Disconnected"
                          }
                          aria-label={
                            player.connected ? "Connected" : "Disconnected"
                          }
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
                        {player.programmedCardCount}/5
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className={styles.boardCards} aria-label="Your action cards">
            <div className={styles.cardsHeading}>
              <LockKeyhole aria-hidden="true" />
              <span>Private hand</span>
            </div>

            {gameState.phase === "programming" ? (
              <div className={styles.actionCards}>
                {gameState.availableCards.map((card) => (
                  <article className={styles.actionCard} key={card.id}>
                    <div className={styles.cardIcon}>
                      <CardIcon type={card.type} />
                    </div>
                    <div>
                      <strong>{card.name}</strong>
                      <span>Priority {card.priority}</span>
                    </div>
                    <b>
                      {card.type === "move"
                        ? `×${card.value}`
                        : card.value < 0
                          ? "−"
                          : "+"}
                    </b>
                  </article>
                ))}
              </div>
            ) : (
              <div className={styles.cardsUnavailable}>
                Cards return during programming.
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}
