import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DemoLobbyControl } from "./demo-lobby-control";
import { conveyorSprintBoard, laserGauntletBoard } from "../maps";

const { refresh, channel } = vi.hoisted(() => ({
  refresh: vi.fn(),
  channel: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
  })),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ channel, removeChannel: vi.fn() }),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ isDemo: true, mapId: "demo-conveyor-sprint" }),
  });
});

afterEach(cleanup);

describe("DemoLobbyControl", () => {
  describe("Host View", () => {
    it("renders demo toggle switch for the lobby host", () => {
      render(
        <DemoLobbyControl
          lobbyId="lobby-1"
          gameId="game-1"
          isHost={true}
          initialBoard={null}
          status="open"
        />,
      );

      expect(screen.getByText("Demo Mode")).toBeDefined();
      expect(screen.getByText("OFF")).toBeDefined();
      const toggleSwitch = screen.getByRole("switch", {
        name: /enable demo mode/i,
      });
      expect(toggleSwitch).toBeDefined();
      expect(toggleSwitch.getAttribute("aria-checked")).toBe("false");
    });

    it("toggles demo mode on and displays map choices and solo play notice", async () => {
      render(
        <DemoLobbyControl
          lobbyId="lobby-1"
          gameId="game-1"
          isHost={true}
          initialBoard={null}
          status="open"
          playerCount={1}
          robotsChosen={true}
        />,
      );

      const toggleSwitch = screen.getByRole("switch", {
        name: /enable demo mode/i,
      });
      fireEvent.click(toggleSwitch);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/games/game-1/demo",
          expect.objectContaining({
            method: "POST",
            body: JSON.stringify({
              enabled: true,
              mapId: "demo-conveyor-sprint",
            }),
          }),
        );
      });

      expect(screen.getByText("Conveyor Sprint")).toBeDefined();
      expect(screen.getByText("Laser Gauntlet")).toBeDefined();
      expect(screen.getByText("Gearworks & Pits")).toBeDefined();
      expect(screen.getByText(/Solo Play Enabled/)).toBeDefined();
    });

    it("allows choosing a different demo map", async () => {
      render(
        <DemoLobbyControl
          lobbyId="lobby-1"
          gameId="game-1"
          isHost={true}
          initialBoard={conveyorSprintBoard}
          status="open"
        />,
      );

      expect(screen.getByText("Laser Gauntlet")).toBeDefined();
      const laserMapCard = screen.getByRole("button", {
        name: /laser gauntlet/i,
      });
      fireEvent.click(laserMapCard);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/games/game-1/demo",
          expect.objectContaining({
            method: "POST",
            body: JSON.stringify({
              enabled: true,
              mapId: "demo-laser-gauntlet",
            }),
          }),
        );
      });
    });

    it("disables buttons when lobby status is not open", () => {
      render(
        <DemoLobbyControl
          lobbyId="lobby-1"
          gameId="game-1"
          isHost={true}
          initialBoard={conveyorSprintBoard}
          status="started"
        />,
      );

      const toggleBtn = screen.getByRole("switch", {
        name: /disable demo mode/i,
      });
      expect(toggleBtn.hasAttribute("disabled")).toBe(true);
    });
  });

  describe("Non-Host View", () => {
    it("renders nothing when demo mode is not active", () => {
      const { container } = render(
        <DemoLobbyControl
          lobbyId="lobby-1"
          gameId="game-1"
          isHost={false}
          initialBoard={null}
          status="open"
        />,
      );

      expect(container.firstChild).toBeNull();
    });

    it("renders demo active badge when demo mode is enabled", () => {
      render(
        <DemoLobbyControl
          lobbyId="lobby-1"
          gameId="game-1"
          isHost={false}
          initialBoard={laserGauntletBoard}
          status="open"
        />,
      );

      expect(screen.getByText("Demo Mode Active")).toBeDefined();
      expect(screen.getByText("Laser Gauntlet")).toBeDefined();
    });
  });
});
