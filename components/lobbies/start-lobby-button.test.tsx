import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StartLobbyButton } from "@/components/lobbies/start-lobby-button";

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ rpc }) }));

beforeEach(() => {
  vi.clearAllMocks();
  rpc.mockResolvedValue({ data: "game-123", error: null });
});
afterEach(cleanup);

describe("StartLobbyButton", () => {
  it("is disabled when playerCount is below minPlayers", () => {
    render(
      <StartLobbyButton
        lobbyId="lobby-1"
        playerCount={2}
        minPlayers={4}
        robotsChosen={true}
      />,
    );

    const button = screen.getByRole("button", { name: /start game/i });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(
      screen.getByText(
        /waiting for at least 2 more players to reach minimum \(4\)/i,
      ),
    ).toBeDefined();
  });

  it("is disabled when robot is not chosen even if minPlayers is met", () => {
    render(
      <StartLobbyButton
        lobbyId="lobby-1"
        playerCount={3}
        minPlayers={2}
        robotsChosen={false}
      />,
    );

    const button = screen.getByRole("button", { name: /start game/i });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(
      screen.getByText(/waiting for every player to choose a robot/i),
    ).toBeDefined();
  });

  it("is enabled when minPlayers is met and all robots are chosen", () => {
    render(
      <StartLobbyButton
        lobbyId="lobby-1"
        playerCount={3}
        minPlayers={3}
        robotsChosen={true}
      />,
    );

    const button = screen.getByRole("button", { name: /start game/i });
    expect((button as HTMLButtonElement).disabled).toBe(false);
    expect(screen.queryByText(/waiting/i)).toBeNull();
  });

  it("shows custom error when server responds with not_enough_players", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { message: "not_enough_players" },
    });

    render(
      <StartLobbyButton
        lobbyId="lobby-1"
        playerCount={3}
        minPlayers={3}
        robotsChosen={true}
      />,
    );

    const button = screen.getByRole("button", { name: /start game/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(
        screen.getByText(/at least 3 players are needed to start/i),
      ).toBeDefined();
    });
  });
});
