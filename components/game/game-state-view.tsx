"use client";

import { AlertTriangle, LoaderCircle, RefreshCw } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import styles from "@/components/game/game-state.module.css";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { GameState } from "@/lib/game/types";
import { GameBoard } from "./board/game-board";
import { GameHeader } from "./game-header";
import { PlayerList } from "./player-list";
import { ProgramEditor } from "./program-editor";
import { RoundResult } from "./round-result";
import { PLAYBACK_STEP_MS, useGamePlayback } from "./use-game-playback";

const SYNC_INTERVAL_MS = 5_000;

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
  const endpoint = `/api/games/${gameId}`;
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
  const reloadWanted = useRef(false);
  const playerListId = useId();

  const loadGameState = useCallback(async () => {
    if (requestController.current || submitting.current) {
      reloadWanted.current = true;
      return;
    }

    const controller = new AbortController();
    requestController.current = controller;

    setIsSyncing(true);
    setError(null);

    try {
      const response = await fetch(endpoint, {
        cache: "no-store",
        signal: controller.signal,
      });
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
        if (reloadWanted.current) {
          reloadWanted.current = false;
          void loadGameState();
        }
      }
    }
  }, [endpoint, setGameState]);

  useEffect(() => {
    void loadGameState();
    const interval = window.setInterval(loadGameState, SYNC_INTERVAL_MS);

    const supabase = createClient();
    const channel = supabase
      .channel(`game:${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "games",
          filter: `id=eq.${gameId}`,
        },
        () => void loadGameState(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_players",
          filter: `game_id=eq.${gameId}`,
        },
        () => void loadGameState(),
      )
      .subscribe();

    const syncWhenVisible = () => {
      if (document.visibilityState === "visible") void loadGameState();
    };

    window.addEventListener("online", loadGameState);
    document.addEventListener("visibilitychange", syncWhenVisible);

    return () => {
      supabase.removeChannel(channel);
      window.clearInterval(interval);
      window.removeEventListener("online", loadGameState);
      document.removeEventListener("visibilitychange", syncWhenVisible);
      requestController.current?.abort();
      requestController.current = null;
    };
  }, [gameId, loadGameState]);

  async function submitAction(action: "lock-in", cardIds?: string[]) {
    if (!gameState || submitting.current || isPlaying) return;
    submitting.current = true;
    setIsSubmitting(true);
    setSubmitError(null);
    // A pre-submit poll must never overwrite the accepted program with stale state.
    requestController.current?.abort();
    requestController.current = null;
    setIsSyncing(false);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, round: gameState.round, cardIds }),
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
      <GameHeader
        gameState={gameState}
        currentPlayer={currentPlayer}
        currentRobot={currentRobot}
        secondsLeft={secondsLeft}
        error={error}
        isSyncing={isSyncing}
        syncedAt={syncedAt}
        onRefresh={loadGameState}
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
              onSubmit={(cardIds) => submitAction("lock-in", cardIds)}
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
