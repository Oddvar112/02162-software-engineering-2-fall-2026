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
  it("creates lobby directly on click and redirects without popup", async () => {
    render(<CreateLobbyButton />);

    const button = screen.getByRole("button", { name: "Create Lobby" });
    fireEvent.click(button);

    expect(rpc).toHaveBeenCalledWith("create_lobby_with_game");

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

    expect(
      await screen.findByText(/you are already in a lobby/i),
    ).toBeDefined();
    expect(push).not.toHaveBeenCalled();
  });
});
