import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LeaveLobbyButton } from "@/components/lobbies/leave-lobby-button";

const { push, refresh, rpc } = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ rpc }) }));

beforeEach(() => {
  vi.clearAllMocks();
  rpc.mockResolvedValue({ error: null });
});
afterEach(cleanup);

describe("LeaveLobbyButton", () => {
  it("leaves the lobby and returns to the list", async () => {
    render(<LeaveLobbyButton lobbyId="lobby-1" isHost={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Leave lobby" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/lobbies"));
    expect(rpc).toHaveBeenCalledWith("leave_lobby", { p_lobby_id: "lobby-1" });
    expect(refresh).toHaveBeenCalled();
  });

  it("warns the host that closing removes the lobby for everyone", () => {
    render(<LeaveLobbyButton lobbyId="lobby-1" isHost={true} />);

    expect(screen.getByRole("button", { name: "Close lobby" })).toBeDefined();
    expect(
      screen.getByText("Closing removes the lobby for everyone."),
    ).toBeDefined();
  });

  it.each([
    ["not_in_lobby", "You are not a member of this lobby."],
    ["lobby_not_open", "This game has already started."],
    ["lobby_not_found", "This lobby no longer exists."],
  ])(
    "shows the server's %s reason without navigating",
    async (message, expected) => {
      rpc.mockResolvedValue({ error: { message } });
      render(<LeaveLobbyButton lobbyId="lobby-1" isHost={false} />);
      fireEvent.click(screen.getByRole("button", { name: "Leave lobby" }));

      expect((await screen.findByRole("alert")).textContent).toBe(expected);
      expect(push).not.toHaveBeenCalled();
      expect(
        (screen.getByRole("button", { name: "Leave lobby" }) as HTMLButtonElement)
          .disabled,
      ).toBe(false);
    },
  );

  it("falls back to a generic message for an unknown reason", async () => {
    rpc.mockResolvedValue({ error: { message: "something_unexpected" } });
    render(<LeaveLobbyButton lobbyId="lobby-1" isHost={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Leave lobby" }));

    expect((await screen.findByRole("alert")).textContent).toBe(
      "Could not leave the lobby.",
    );
  });

  it("allows retrying an unexpected request failure", async () => {
    rpc.mockRejectedValueOnce(new Error("Network unavailable"));
    render(<LeaveLobbyButton lobbyId="lobby-1" isHost={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Leave lobby" }));

    expect((await screen.findByRole("alert")).textContent).toBe(
      "Could not leave the lobby. Try again.",
    );

    fireEvent.click(screen.getByRole("button", { name: "Leave lobby" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/lobbies"));
  });
});
