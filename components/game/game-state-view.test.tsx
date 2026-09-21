import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { getMockGameState } from "@/lib/game/mock-game-state";
import { GameStateView } from "./game-state-view";

vi.mock("./robo-board", () => ({ RoboBoard: () => <div>Board preview</div> }));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("shows submission errors, preserves the draft for retry, and locks accepted programs", async () => {
  const state = getMockGameState();
  const locked = structuredClone(state);
  locked.players[0].programLocked = true;
  locked.players[0].programmedCardCount = 5;
  locked.currentPlayerProgram = locked.currentPlayerCards.slice(0, 5);
  locked.phase = "end-of-round";
  let accepted = false;
  let attempts = 0;
  const fetchMock = vi.fn(async (_url, options) => {
    if (options?.method === "POST") {
      attempts++;
      if (attempts === 1)
        return {
          ok: false,
          json: async () => ({
            error: "The server is busy. Please try again.",
          }),
        };
      accepted = true;
    }
    return { ok: true, json: async () => (accepted ? locked : state) };
  });
  vi.stubGlobal("fetch", fetchMock);
  render(<GameStateView />);
  await screen.findByRole("button", { name: "Move 3, priority 840" });
  for (const card of state.currentPlayerCards.slice(0, 5))
    fireEvent.click(
      screen.getByRole("button", {
        name: `${card.name}, priority ${card.priority}`,
      }),
    );
  fireEvent.click(screen.getByRole("button", { name: "Lock In" }));
  expect((await screen.findByRole("alert")).textContent).toContain(
    "server is busy",
  );
  expect(
    within(
      screen.getByRole("button", { name: "Move 3, priority 840" }),
    ).getByText(/Execution order 1/),
  ).toBeDefined();
  await waitFor(() =>
    expect(
      (screen.getByRole("button", { name: "Lock In" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false),
  );
  fireEvent.click(screen.getByRole("button", { name: "Lock In" }));
  await screen.findByText("Program executed · locked");
  expect(
    (screen.getByRole("button", { name: "Locked In" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  expect(screen.queryByRole("alert")).toBeNull();
  const submission = fetchMock.mock.calls.find(
    ([, options]) => options?.method === "POST",
  );
  expect(JSON.parse(submission![1].body)).toMatchObject({
    action: "lock-in",
    round: 1,
    playerId: "player-1",
    cardIds: state.currentPlayerCards.slice(0, 5).map((card) => card.id),
  });
});

it("does not let a poll started before submission overwrite the locked state", async () => {
  const state = getMockGameState();
  const locked = structuredClone(state);
  locked.players[0].programLocked = true;
  locked.currentPlayerProgram = locked.currentPlayerCards.slice(0, 5);
  locked.phase = "end-of-round";
  let reads = 0;
  let finishStalePoll!: (response: unknown) => void;
  vi.stubGlobal(
    "fetch",
    vi.fn((_url, options) => {
      if (options?.method === "POST")
        return Promise.resolve({ ok: true, json: async () => locked });
      reads++;
      if (reads === 2)
        return new Promise((resolve) => {
          finishStalePoll = resolve;
        });
      return Promise.resolve({
        ok: true,
        json: async () => (reads > 2 ? locked : state),
      });
    }),
  );
  render(<GameStateView />);
  await screen.findByRole("button", { name: "Move 3, priority 840" });
  for (const card of state.currentPlayerCards.slice(0, 5))
    fireEvent.click(
      screen.getByRole("button", {
        name: `${card.name}, priority ${card.priority}`,
      }),
    );
  act(() => {
    window.dispatchEvent(new Event("online"));
  });
  fireEvent.click(screen.getByRole("button", { name: "Lock In" }));
  await screen.findByText("Program executed · locked");
  await act(async () => {
    finishStalePoll({ ok: true, json: async () => state });
  });
  expect(screen.getByText("Program executed · locked")).toBeDefined();
});
