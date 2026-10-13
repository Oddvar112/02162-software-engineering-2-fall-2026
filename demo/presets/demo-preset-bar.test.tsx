import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DemoPresetBar } from "./demo-preset-bar";
import { createDemoHand } from "../cards";

describe("DemoPresetBar component", () => {
  let mockStorage: Record<string, string> = {};

  afterEach(cleanup);
  beforeEach(() => {
    mockStorage = {};
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: (key: string) => mockStorage[key] ?? null,
        setItem: (key: string, val: string) => {
          mockStorage[key] = val;
        },
        removeItem: (key: string) => {
          delete mockStorage[key];
        },
        clear: () => {
          mockStorage = {};
        },
      },
      writable: true,
    });
  });

  const cardsInHand = createDemoHand("player-1", 5);

  it("renders the demo preset selector and default presets", () => {
    render(
      <DemoPresetBar
        cardsInHand={cardsInHand}
        selectedIds={[]}
        onApplyPreset={vi.fn()}
        onClear={vi.fn()}
      />,
    );

    expect(screen.getByText("Demo Presets")).toBeDefined();
    const select = screen.getByRole("combobox", {
      name: "Demo Presets Selector",
    }) as HTMLSelectElement;
    expect(select).toBeDefined();
    expect(screen.getByText(/Sprint Straight \(5\)/)).toBeDefined();
    expect(screen.getByText(/Single Step \(1\)/)).toBeDefined();
  });

  it("selects a preset and applies matching cards to program", () => {
    const onApply = vi.fn();
    render(
      <DemoPresetBar
        cardsInHand={cardsInHand}
        selectedIds={[]}
        onApplyPreset={onApply}
        onClear={vi.fn()}
      />,
    );

    const select = screen.getByRole("combobox", {
      name: "Demo Presets Selector",
    });
    fireEvent.change(select, { target: { value: "preset-single-1" } });

    expect(onApply).toHaveBeenCalledTimes(1);
    const appliedIds = onApply.mock.calls[0][0];
    expect(appliedIds).toHaveLength(1);
    const matchedCard = cardsInHand.find((c) => c.id === appliedIds[0]);
    expect(matchedCard?.name).toBe("Move 1");
  });

  it("allows clearing selected cards", () => {
    const onClear = vi.fn();
    const selectedIds = [cardsInHand[0].id, cardsInHand[1].id];

    render(
      <DemoPresetBar
        cardsInHand={cardsInHand}
        selectedIds={selectedIds}
        onApplyPreset={vi.fn()}
        onClear={onClear}
      />,
    );

    const clearButton = screen.getByRole("button", { name: /Clear/i });
    fireEvent.click(clearButton);
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("allows saving currently selected cards as a custom preset and deleting it", () => {
    const selectedIds = [
      cardsInHand.find((c) => c.name === "Move 3")!.id,
      cardsInHand.find((c) => c.name === "Rotate right")!.id,
    ];

    const { rerender } = render(
      <DemoPresetBar
        cardsInHand={cardsInHand}
        selectedIds={selectedIds}
        onApplyPreset={vi.fn()}
        onClear={vi.fn()}
      />,
    );

    // Click Save Preset button
    const savePresetBtn = screen.getByRole("button", {
      name: /Save Preset \(2\)/i,
    });
    fireEvent.click(savePresetBtn);

    const nameInput = screen.getByLabelText("Preset Name") as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "Fast Right" } });

    const confirmSaveBtn = screen.getByRole("button", { name: "Save" });
    fireEvent.click(confirmSaveBtn);

    // Should display success message
    expect(screen.getByText('Preset "Fast Right" saved!')).toBeDefined();

    // Verify option is in select
    expect(screen.getByText(/★ Fast Right \(2 cards\)/)).toBeDefined();

    // Verify Delete button appears for active custom preset
    const deleteBtn = screen.getByRole("button", {
      name: /Delete custom preset Fast Right/i,
    });
    expect(deleteBtn).toBeDefined();
    fireEvent.click(deleteBtn);

    // Option should no longer be present
    expect(screen.queryByText(/★ Fast Right/)).toBeNull();
  });
});
