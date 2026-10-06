import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CreateLobbyButton } from "@/components/lobbies/create-lobby-button";

const { push, rpc } = vi.hoisted(() => ({
  push: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ rpc }) }));

beforeEach(() => {
  vi.clearAllMocks();
  rpc.mockResolvedValue({ data: "lobby-new-123", error: null });
});
afterEach(cleanup);

describe("CreateLobbyButton", () => {
  it("opens settings dialog upon clicking Create Lobby", () => {
    render(<CreateLobbyButton />);

    expect(screen.queryByText(/configure the player capacity/i)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Create Lobby" }));

    expect(screen.getByText(/configure the player capacity/i)).toBeDefined();
    expect(screen.getByLabelText(/minimum players/i)).toBeDefined();
    expect(screen.getByLabelText(/maximum players/i)).toBeDefined();
  });

  it("prevents submission if min > max", () => {
    render(<CreateLobbyButton />);

    fireEvent.click(screen.getByRole("button", { name: "Create Lobby" }));

    const minInput = screen.getByLabelText(/minimum players/i);
    const maxInput = screen.getByLabelText(/maximum players/i);
    const submitBtn = screen.getByRole("button", { name: /confirm & create/i });

    fireEvent.change(minInput, { target: { value: "6" } });
    fireEvent.change(maxInput, { target: { value: "4" } });

    expect(
      screen.getByText(/minimum players cannot be greater than maximum players/i),
    ).toBeDefined();
    expect((submitBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it("submits configured limits to create_lobby_with_game and redirects", async () => {
    render(<CreateLobbyButton />);

    fireEvent.click(screen.getByRole("button", { name: "Create Lobby" }));

    const minInput = screen.getByLabelText(/minimum players/i);
    const maxInput = screen.getByLabelText(/maximum players/i);

    fireEvent.change(minInput, { target: { value: "3" } });
    fireEvent.change(maxInput, { target: { value: "5" } });

    fireEvent.click(screen.getByRole("button", { name: /confirm & create/i }));

    expect(rpc).toHaveBeenCalledWith("create_lobby_with_game", {
      p_min_players: 3,
      p_max_players: 5,
    });

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/lobbies/lobby-new-123");
    });
  });

  it("displays server error when create_lobby_with_game fails", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { message: "already_in_a_lobby" },
    });

    render(<CreateLobbyButton />);

    fireEvent.click(screen.getByRole("button", { name: "Create Lobby" }));
    fireEvent.click(screen.getByRole("button", { name: /confirm & create/i }));

    expect(
      await screen.findByText(/you are already in a lobby/i),
    ).toBeDefined();
    expect(push).not.toHaveBeenCalled();
  });
});
