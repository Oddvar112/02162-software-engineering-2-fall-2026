import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getMockGameState } from "@/lib/game/mock-game-state";
import { ProgramEditor } from "./program-editor";

afterEach(cleanup);

describe("program editor", () => {
  it("limits selections, supports ordering and replacement, and submits in register order", () => {
    const gameState = getMockGameState();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <ProgramEditor
        gameState={gameState}
        isSubmitting={false}
        onSubmit={onSubmit}
      />,
    );
    const lockIn = screen.getByRole("button", {
      name: "Lock In",
    }) as HTMLButtonElement;
    expect(lockIn.disabled).toBe(true);
    const hand = gameState.currentPlayerCards.map(
      (card) =>
        screen.getByRole("button", {
          name: `${card.name}, priority ${card.priority}`,
        }) as HTMLButtonElement,
    );
    [hand[1], hand[0], ...hand.slice(2, 5)].forEach((card) =>
      fireEvent.click(card),
    );
    expect(lockIn.disabled).toBe(false);
    expect(hand[5].disabled).toBe(true);
    expect(within(hand[1]).getByText("01")).toBeDefined();
    expect(within(hand[0]).getByText("02")).toBeDefined();
    // Removing and reselecting a card moves it to the end of the queue.
    fireEvent.click(hand[0]);
    expect(within(hand[2]).getByText("02")).toBeDefined();
    expect(hand[0].getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(hand[0]);
    expect(within(hand[0]).getByText("05")).toBeDefined();
    fireEvent.click(hand[2]);
    expect(lockIn.disabled).toBe(true);
    fireEvent.click(hand[5]);
    fireEvent.click(lockIn);
    expect(onSubmit).toHaveBeenCalledWith([
      "card-2",
      "card-4",
      "card-5",
      "card-1",
      "card-6",
    ]);
  });

  it("keeps a draft through polling and replaces it with the server's locked program", () => {
    const gameState = getMockGameState();
    const props = { gameState, isSubmitting: false, onSubmit: vi.fn() };
    const { rerender } = render(<ProgramEditor {...props} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Move 3, priority 840" }),
    );
    rerender(
      <ProgramEditor {...props} gameState={structuredClone(gameState)} />,
    );
    expect(
      within(
        screen.getByRole("button", { name: "Move 3, priority 840" }),
      ).getByText(/Execution order 1/),
    ).toBeDefined();
    const locked = structuredClone(gameState);
    locked.players[0].programLocked = true;
    locked.currentPlayerProgram = locked.currentPlayerCards.slice(1);
    locked.phase = "end-of-round";
    rerender(<ProgramEditor {...props} gameState={locked} />);
    expect(screen.getByText("Program executed · locked")).toBeDefined();
    expect(
      within(
        screen.getByRole("button", { name: "Move 2, priority 670" }),
      ).getByText(/Execution order 1/),
    ).toBeDefined();
    expect(
      screen
        .getAllByRole("button")
        .every((button) => (button as HTMLButtonElement).disabled),
    ).toBe(true);
    expect(
      screen
        .getByRole("button", { name: "Move 3, priority 840" })
        .getAttribute("aria-pressed"),
    ).toBe("false");
  });

  it("disables edits while submitting but lets an unlocked player program while others wait", () => {
    const gameState = getMockGameState();
    gameState.phase = "waiting";
    const props = { gameState, isSubmitting: false, onSubmit: vi.fn() };
    const { rerender } = render(<ProgramEditor {...props} />);
    const card = screen.getByRole("button", {
      name: "Move 3, priority 840",
    }) as HTMLButtonElement;
    expect(card.disabled).toBe(false);
    rerender(<ProgramEditor {...props} isSubmitting />);
    expect(card.disabled).toBe(true);
  });
});
