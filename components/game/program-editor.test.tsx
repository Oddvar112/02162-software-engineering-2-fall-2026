import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildGameState } from "@/lib/game/fixtures";
import { ProgramEditor } from "./program-editor";

afterEach(cleanup);

describe("program editor", () => {
  it("limits selections, supports ordering and replacement, and submits in register order", () => {
    const gameState = buildGameState();
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
    const gameState = buildGameState();
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
    const gameState = buildGameState();
    gameState.players[1].programLocked = true;
    const props = { gameState, isSubmitting: false, onSubmit: vi.fn() };
    const { rerender } = render(<ProgramEditor {...props} />);
    const card = screen.getByRole("button", {
      name: "Move 3, priority 840",
    }) as HTMLButtonElement;
    expect(card.disabled).toBe(false);
    rerender(<ProgramEditor {...props} isSubmitting />);
    expect(card.disabled).toBe(true);
  });

  describe("demo mode card selection and lock in", () => {
    it("allows submitting just 1 card while displaying 1/5 in heading", () => {
      const gameState = buildGameState();
      gameState.board = {
        ...gameState.board,
        id: "demo-test",
        isDemo: true as const,
        name: "Demo",
        description: "Test",
      } as unknown as typeof gameState.board;
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

      fireEvent.click(
        screen.getByRole("button", { name: "Move 3, priority 840" }),
      );
      expect(screen.getByText("YOUR PROGRAM · 1/5")).toBeDefined();
      expect(lockIn.disabled).toBe(false);

      fireEvent.click(lockIn);
      expect(onSubmit).toHaveBeenCalledWith(["card-1"]);
    });

    it("allows submitting unlimited cards (> 5) while displaying x/5 without disabling unselected cards", () => {
      const gameState = buildGameState();
      gameState.board = {
        ...gameState.board,
        id: "demo-test",
        isDemo: true as const,
        name: "Demo",
        description: "Test",
      } as unknown as typeof gameState.board;
      // Provide 7 cards in hand
      gameState.currentPlayerCards.push({
        id: "card-7",
        name: "U-turn",
        type: "rotate",
        value: 2,
        priority: 100,
      });

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

      // Select 6 cards (all except card-7)
      for (let i = 1; i <= 6; i++) {
        const card = gameState.currentPlayerCards.find(
          (c) => c.id === `card-${i}`,
        )!;
        fireEvent.click(
          screen.getByRole("button", {
            name: `${card.name}, priority ${card.priority}`,
          }),
        );
      }

      // Check header shows 6/5
      expect(screen.getByText("YOUR PROGRAM · 6/5")).toBeDefined();

      // The 7th card should NOT be disabled in demo mode
      const card7 = screen.getByRole("button", {
        name: "U-turn, priority 100",
      }) as HTMLButtonElement;
      expect(card7.disabled).toBe(false);

      // Lock in button should be enabled
      expect(lockIn.disabled).toBe(false);

      fireEvent.click(lockIn);
      expect(onSubmit).toHaveBeenCalledWith([
        "card-1",
        "card-2",
        "card-3",
        "card-4",
        "card-5",
        "card-6",
      ]);
    });

    it("renders demo preset bar and loads preset directly into program", () => {
      const gameState = buildGameState();
      gameState.board = {
        ...gameState.board,
        id: "demo-test",
        isDemo: true as const,
        name: "Demo",
        description: "Test",
      } as unknown as typeof gameState.board;

      const onSubmit = vi.fn().mockResolvedValue(undefined);
      render(
        <ProgramEditor
          gameState={gameState}
          isSubmitting={false}
          onSubmit={onSubmit}
        />,
      );

      // Verify preset selector is present
      const select = screen.getByRole("combobox", {
        name: "Demo Presets Selector",
      });
      expect(select).toBeDefined();

      // Select Single Step (1)
      fireEvent.change(select, { target: { value: "preset-single-1" } });

      // Heading updates to 1/5
      expect(screen.getByText("YOUR PROGRAM · 1/5")).toBeDefined();

      // Lock in button is enabled and submits with matched card-3 (Move 1)
      const lockIn = screen.getByRole("button", { name: "Lock In" });
      expect(lockIn).toBeDefined();
      fireEvent.click(lockIn);
      expect(onSubmit).toHaveBeenCalledWith(["card-3"]);
    });
  });
});
