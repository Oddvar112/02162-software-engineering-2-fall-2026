"use client";

import {
  AlertTriangle,
  Bot,
  ChevronDown,
  Flag,
  Heart,
  LoaderCircle,
  LockKeyhole,
  Radio,
  RefreshCw,
  Shield,
  Wifi,
  WifiOff,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
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
import type { GameState } from "@/lib/game/types";
import { DIRECTION_LABELS, PHASE_LABELS } from "@/lib/game/types";
import { RoboBoard } from "./robo-board";
import { ProgramEditor } from "./program-editor";
import { useGamePlayback } from "./use-game-playback";

const SYNC_INTERVAL_MS = 5_000;

export function GameLoading() {
  return (
    <main className={styles.stateScreen}>
      <div className={styles.stateCard} role="status">
        <LoaderCircle className={styles.spinner} aria-hidden="true" />
        <p className={styles.stateEyebrow}>Boot sequence</p>
        <h1>Reading game state…</h1>
        <p>Connecting to the board controller.</p>
      </div>
    </main>
  );
}

function GameError({ onRetry }: { onRetry: () => void }) {
  return (
    <main className={styles.stateScreen}>
      <div className={styles.stateCard} role="alert">
        <AlertTriangle className={styles.errorIcon} aria-hidden="true" />
        <p className={styles.stateEyebrow}>Link failure</p>
        <h1>Game state unavailable</h1>
        <p>Check the connection and retry the board controller.</p>
        <Button className={styles.retryButton} onClick={onRetry}>
          <RefreshCw aria-hidden="true" />
          Try again
        </Button>
      </div>
    </main>
  );
}

export function GameStateView({
  playerId = "player-1",
}: {
  playerId?: string;
}) {
  const {
    gameState,
    receiveState: setGameState,
    activeFrame,
    isPlaying,
    replay,
  } = useGamePlayback();
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const submitting = useRef(false);
  const [playersCollapsed, setPlayersCollapsed] = useState(false);
  const requestController = useRef<AbortController | null>(null);
  const playerListId = useId();

  const loadGameState = useCallback(async () => {
    if (requestController.current || submitting.current) return;

    const controller = new AbortController();
    requestController.current = controller;

    setIsSyncing(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/game-state?player=${encodeURIComponent(playerId)}`,
        {
          cache: "no-store",
          signal: controller.signal,
        },
      );
      if (!response.ok)
        throw new Error(`Request failed with ${response.status}`);

      const state = (await response.json()) as GameState;
      if (!controller.signal.aborted) setGameState(state);
    } catch (requestError) {
      if (requestError instanceof Error && requestError.name === "AbortError") {
        return;
      }

      setError(
        requestError instanceof Error
          ? requestError.message
          : "The game state is unavailable",
      );
    } finally {
      if (requestController.current === controller) {
        requestController.current = null;
        setIsSyncing(false);
      }
    }
  }, [playerId, setGameState]);

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
      requestController.current?.abort();
      requestController.current = null;
    };
  }, [loadGameState]);

  async function submitAction(
    action: "lock-in" | "next-round",
    cardIds?: string[],
  ) {
    if (!gameState || submitting.current || isPlaying) return;
    submitting.current = true;
    setIsSubmitting(true);
    setSubmitError(null);
    // A pre-submit poll must never overwrite the accepted program with stale state.
    requestController.current?.abort();
    requestController.current = null;
    setIsSyncing(false);
    try {
      const response = await fetch("/api/game-state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          playerId,
          round: gameState.round,
          cardIds,
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error ??
            "Your program could not be submitted. Please try again.",
        );
      setGameState(result as GameState);
      setError(null);
    } catch (submissionError) {
      setSubmitError(
        submissionError instanceof Error
          ? submissionError.message
          : "Your program could not be submitted. Please try again.",
      );
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
      // Also reconcile after an uncertain network response: the server may have accepted it.
      void loadGameState();
    }
  }

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
          </span>
        </div>

        <div className={styles.accountArea}>
          <span className={error ? styles.syncError : styles.syncStatus}>
            {error ? (
              <WifiOff aria-hidden="true" />
            ) : (
              <Wifi aria-hidden="true" />
            )}
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
              <DropdownMenuLabel>Demo player</DropdownMenuLabel>
              {gameState.players.map((player) => (
                <DropdownMenuItem key={player.id} asChild>
                  <a href={`/game?player=${player.id}`}>
                    {player.name}
                    {player.id === playerId ? " (you)" : ""}
                  </a>
                </DropdownMenuItem>
              ))}
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
          <div className={styles.boardScene}>
            <RoboBoard gameState={gameState} />
            <section
              className={`${styles.boardPlayers} ${playersCollapsed ? styles.playersCollapsed : ""}`}
              aria-label="Players"
            >
              <button
                type="button"
                className={styles.playersToggle}
                aria-expanded={!playersCollapsed}
                aria-controls={playerListId}
                onClick={() => setPlayersCollapsed((collapsed) => !collapsed)}
              >
                <div>
                  <p className={styles.eyebrow}>Network</p>
                  <h2>CONNECTED UNITS</h2>
                </div>
                <span className={styles.playersToggleEnd}>
                  <span className={styles.playerCount}>
                    {gameState.players.length}
                  </span>
                  <ChevronDown
                    className={styles.playersChevron}
                    aria-hidden="true"
                  />
                </span>
              </button>

              <div
                className={styles.playerList}
                id={playerListId}
                hidden={playersCollapsed}
              >
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
                            {robot ? ` · X${robot.x + 1} Y${robot.z + 1}` : ""}
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
          </div>
          <section className={styles.boardCards} aria-label="Your action cards">
            <ProgramEditor
              key={`${gameState.gameId}-${gameState.round}-${playerId}`}
              gameState={gameState}
              isSubmitting={isSubmitting}
              activeCardId={activeFrame?.cardId}
              executionMessage={activeFrame?.message}
              onSubmit={(cardIds) => submitAction("lock-in", cardIds)}
            />
            {submitError && (
              <p className={styles.programError} role="alert">
                {submitError}
              </p>
            )}
            {gameState.phase === "end-of-round" && (
              <div className={styles.turnResult}>
                <p role="status">
                  Round {gameState.round} resolved. The board shows the
                  resulting positions.
                </p>
                <details>
                  <summary>
                    Executed actions ({gameState.executionLog.length})
                  </summary>
                  <ol>
                    {gameState.executionLog.map((entry, index) => (
                      <li key={index}>
                        Register {entry.register} ·{" "}
                        {
                          gameState.players.find(
                            (player) => player.id === entry.playerId,
                          )?.name
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
                    onClick={replay}
                    disabled={isSubmitting}
                  >
                    <RefreshCw aria-hidden="true" /> Replay movement
                  </button>
                )}
                <button
                  type="button"
                  className={styles.lockInButton}
                  disabled={
                    isSubmitting ||
                    !gameState.players.some((player) => player.lives > 0)
                  }
                  onClick={() => void submitAction("next-round")}
                >
                  Start next round
                </button>
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}
