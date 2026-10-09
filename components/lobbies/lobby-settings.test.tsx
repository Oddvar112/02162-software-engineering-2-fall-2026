import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LobbySettings } from "@/components/lobbies/lobby-settings";

const { refresh, rpc } = vi.hoisted(() => ({
  refresh: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ rpc }) }));

beforeEach(() => {
  vi.clearAllMocks();
  rpc.mockResolvedValue({ error: null });
});
afterEach(cleanup);

describe("LobbySettings", () => {
  it("renders the gear icon button and toggles the settings card", () => {
    render(
      <LobbySettings
        lobbyId="lobby-1"
        minPlayers={2}
        maxPlayers={4}
        playerCount={2}
        isHost={true}
        status="open"
      />,
    );

    const gearBtn = screen.getByRole("button", { name: /game settings/i });
    expect(gearBtn).toBeDefined();
    expect(screen.queryByText("Game Settings")).toBeNull();

    fireEvent.click(gearBtn);
    expect(screen.getByText("Game Settings")).toBeDefined();

    // Close button
    fireEvent.click(screen.getByRole("button", { name: /close settings/i }));
    expect(screen.queryByText("Game Settings")).toBeNull();
  });

  it("shows editable inputs for host and validates min <= max", () => {
    render(
      <LobbySettings
        lobbyId="lobby-1"
        minPlayers={2}
        maxPlayers={4}
        playerCount={2}
        isHost={true}
        status="open"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /game settings/i }));

    const minInput = screen.getByLabelText(/minimum players/i);
    const maxInput = screen.getByLabelText(/maximum players/i);
    const saveBtn = screen.getByRole("button", { name: /save settings/i });

    expect(minInput).toBeDefined();
    expect(maxInput).toBeDefined();
    expect((saveBtn as HTMLButtonElement).disabled).toBe(false);

    // Set min > max
    fireEvent.change(minInput, { target: { value: "5" } });
    expect(
      screen.getByText(
        /minimum players cannot be greater than maximum players/i,
      ),
    ).toBeDefined();
    expect((saveBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it("prevents host from setting max players below current player count", () => {
    render(
      <LobbySettings
        lobbyId="lobby-1"
        minPlayers={2}
        maxPlayers={6}
        playerCount={4}
        isHost={true}
        status="open"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /game settings/i }));
    const maxInput = screen.getByLabelText(/maximum players/i);

    fireEvent.change(maxInput, { target: { value: "3" } });
    expect(
      screen.getByText(
        /maximum players cannot be less than the current player count \(4\)/i,
      ),
    ).toBeDefined();
  });

  it("calls update_lobby_settings RPC on save and refreshes router", async () => {
    render(
      <LobbySettings
        lobbyId="lobby-1"
        minPlayers={2}
        maxPlayers={4}
        playerCount={2}
        isHost={true}
        status="open"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /game settings/i }));
    const minInput = screen.getByLabelText(/minimum players/i);
    const maxInput = screen.getByLabelText(/maximum players/i);

    fireEvent.change(minInput, { target: { value: "3" } });
    fireEvent.change(maxInput, { target: { value: "5" } });

    fireEvent.click(screen.getByRole("button", { name: /save settings/i }));

    expect(rpc).toHaveBeenCalledWith("update_lobby_settings", {
      p_lobby_id: "lobby-1",
      p_min_players: 3,
      p_max_players: 5,
    });

    await waitFor(() => {
      expect(screen.getByText(/settings saved successfully/i)).toBeDefined();
      expect(refresh).toHaveBeenCalled();
    });
  });

  it("displays server error message when RPC fails", async () => {
    rpc.mockResolvedValue({
      error: { message: "max_below_current_players" },
    });

    render(
      <LobbySettings
        lobbyId="lobby-1"
        minPlayers={2}
        maxPlayers={4}
        playerCount={2}
        isHost={true}
        status="open"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /game settings/i }));
    fireEvent.click(screen.getByRole("button", { name: /save settings/i }));

    expect(
      await screen.findByText(
        /cannot set maximum players below the current player count/i,
      ),
    ).toBeDefined();
  });

  it("shows read-only view for non-host players", () => {
    render(
      <LobbySettings
        lobbyId="lobby-1"
        minPlayers={3}
        maxPlayers={6}
        playerCount={2}
        isHost={false}
        status="open"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /game settings/i }));

    expect(screen.queryByLabelText(/minimum players/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /save settings/i })).toBeNull();
    expect(
      screen.getByText(/only the host can modify the game settings/i),
    ).toBeDefined();
    expect(screen.getByText("3")).toBeDefined();
    expect(screen.getByText("6")).toBeDefined();
  });
});
