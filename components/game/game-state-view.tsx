"use client";

import { AlertTriangle, LoaderCircle, RefreshCw } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import styles from "@/components/game/game-state.module.css";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { GameBoard } from "./board/game-board";
import { GameHeader } from "./game-header";
import { PlayerList } from "./player-list";
import { ProgramEditor } from "./program-editor";
import { RoundResult } from "./round-result";
import { PLAYBACK_STEP_MS, useGamePlayback } from "./use-game-playback";
import { useGameStateSync } from "./use-game-state-sync";

function useCountdown(endsAt: string | null): number | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!endsAt) return;
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(tick);
  }, [endsAt]);
  if (!endsAt) return null;
  return Math.max(0, Math.ceil((new Date(endsAt).getTime() - now) / 1000));
}

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

export function GameStateView({ gameId }: { gameId: string }) {
  const {
    gameState,
    receiveState: setGameState,
    activeFrame,
    isPlaying,
    replay,
  } = useGamePlayback();
  const [playersCollapsed, setPlayersCollapsed] = useState(false);
  const playerListId = useId();
  const { error, isSyncing, isSubmitting, submitError, reload, submitProgram } =
    useGameStateSync(gameId, setGameState);

  const secondsLeft = useCountdown(gameState?.timerEndsAt ?? null);
  const router = useRouter();
  const finishedLobby =
    gameState?.phase === "finished" && !isPlaying ? gameState.lobbyId : null;
  useEffect(() => {
    if (!finishedLobby) return;
    const timer = window.setTimeout(
      () => router.replace(`/lobbies/${finishedLobby}`),
      PLAYBACK_STEP_MS * 3,
    );
    return () => window.clearTimeout(timer);
  }, [finishedLobby, router]);

  const robotById = useMemo(
    () => new Map(gameState?.robots.map((robot) => [robot.id, robot]) ?? []),
    [gameState],
  );

  if (!gameState && !error) return <GameLoading />;
  if (!gameState) return <GameError onRetry={reload} />;

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
      <GameHeader
        gameState={gameState}
        currentPlayer={currentPlayer}
        currentRobot={currentRobot}
        secondsLeft={secondsLeft}
        error={error}
        isSyncing={isSyncing}
        syncedAt={syncedAt}
        onRefresh={reload}
      />

      <div className={styles.workspace}>
        <section className={styles.boardPanel} aria-label="Game board">
          <div className={styles.boardScene}>
            <GameBoard gameState={gameState} />
            <PlayerList
              gameState={gameState}
              robotById={robotById}
              collapsed={playersCollapsed}
              listId={playerListId}
              onToggle={() => setPlayersCollapsed((collapsed) => !collapsed)}
            />
          </div>
          <section className={styles.boardCards} aria-label="Your action cards">
            <ProgramEditor
              key={`${gameState.gameId}-${gameState.round}`}
              gameState={gameState}
              isSubmitting={isSubmitting}
              activeCardId={activeFrame?.cardId}
              executionMessage={activeFrame?.message}
              onSubmit={(cardIds) => {
                if (!isPlaying) {
                  return submitProgram({ round: gameState.round, cardIds });
                }
                return Promise.resolve();
              }}
            />
            {submitError && (
              <p className={styles.programError} role="alert">
                {submitError}
              </p>
            )}
            <RoundResult
              gameState={gameState}
              disabled={isSubmitting}
              onReplay={replay}
            />
          </section>
        </section>
      </div>
    </main>
  );
}
