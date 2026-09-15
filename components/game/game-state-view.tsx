"use client";

import {
  AlertTriangle,
  Bot,
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
import type { ActionCard, GamePhase, GameState } from "@/lib/game/types";
import { DIRECTION_LABELS, PHASE_LABELS } from "@/lib/game/types";
import { RoboBoard } from "./robo-board";

const SYNC_INTERVAL_MS = 5_000;
const PHASES: GamePhase[] = [
  "programming",
  "waiting",
  "execution",
  "board-activation",
  "end-of-round",
];

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
      setError(null);
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
  const syncedAt = new Date(gameState.updatedAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <div className={styles.gameIdentity}>
          <span className={styles.brandMark} aria-hidden="true">
            <Bot />
          </span>
          <div>
            <p className={styles.eyebrow}>Live match · {gameState.gameId}</p>
            <h1>Factory Floor</h1>
          </div>
        </div>

        <div className={styles.roundStatus}>
          <div className={styles.roundBlock}>
            <span>Round</span>
            <strong>{gameState.round}</strong>
          </div>
          <div className={styles.phaseBadge}>
            <Radio aria-hidden="true" />
            {PHASE_LABELS[gameState.phase]}
          </div>
        </div>

        <div className={styles.syncArea}>
          <div className={error ? styles.syncError : styles.syncStatus}>
            {error ? (
              <WifiOff aria-hidden="true" />
            ) : (
              <Wifi aria-hidden="true" />
            )}
            <span>
              {error
                ? "Sync paused"
                : isSyncing
                  ? "Syncing…"
                  : `Synced ${syncedAt}`}
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={styles.refreshButton}
            onClick={loadGameState}
            disabled={isSyncing}
            aria-label="Refresh game state"
          >
            <RefreshCw className={isSyncing ? styles.spinner : undefined} />
          </Button>
        </div>
      </header>

      <div className={styles.workspace}>
        <section className={styles.boardPanel} aria-label="Game board">
          <RoboBoard gameState={gameState} />
          <div className={styles.boardHelp}>
            Drag to rotate · Scroll to zoom
          </div>
          <div className={styles.legend} aria-label="Board legend">
            <span>
              <i className={styles.wallKey} />
              Wall
            </span>
            <span>
              <i className={styles.checkpointKey} />
              Checkpoint
            </span>
            <span>
              <i className={styles.pitKey} />
              Pit
            </span>
            <span>
              <i className={styles.conveyorKey} />
              Conveyor
            </span>
            <span>
              <i className={styles.gearKey} />
              Gear
            </span>
          </div>
        </section>

        <aside className={styles.sidebar} aria-label="Game information">
          <section className={styles.panelSection}>
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.eyebrow}>At the table</p>
                <h2>Players</h2>
              </div>
              <span>{gameState.players.length}</span>
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
                        <Shield aria-hidden="true" />
                        {player.damage} damage
                      </span>
                      <span>
                        <Heart aria-hidden="true" />
                        {player.lives} lives
                      </span>
                      <span>
                        <Flag aria-hidden="true" />
                        {player.checkpointsReached} checkpoints
                      </span>
                    </div>

                    <div className={styles.cardPrivacy}>
                      <LockKeyhole aria-hidden="true" />
                      {isCurrent
                        ? `${player.programmedCardCount} of 5 registers programmed`
                        : `${player.programmedCardCount} cards programmed · hidden`}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className={styles.panelSection}>
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.eyebrow}>Round sequence</p>
                <h2>Current phase</h2>
              </div>
            </div>
            <ol className={styles.phaseList}>
              {PHASES.map((phase, index) => (
                <li
                  key={phase}
                  className={
                    phase === gameState.phase ? styles.activePhase : undefined
                  }
                >
                  <span>{index + 1}</span>
                  {PHASE_LABELS[phase]}
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>

      <section className={styles.cardTray} aria-label="Your action cards">
        <div className={styles.trayHeading}>
          <div>
            <p className={styles.eyebrow}>
              Private hand · {currentPlayer?.name ?? "Current player"}
            </p>
            <h2>Your action cards</h2>
          </div>
          <span>Only visible to you</span>
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
            Cards are hidden outside the programming phase.
          </div>
        )}
      </section>
    </main>
  );
}
