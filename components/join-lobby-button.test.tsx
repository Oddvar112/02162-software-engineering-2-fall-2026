import { Activity } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JoinLobbyButton } from "@/components/join-lobby-button";

const { push, rpc } = vi.hoisted(() => ({ push: vi.fn(), rpc: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ rpc }) }));

beforeEach(() => {
  vi.clearAllMocks();
  rpc.mockResolvedValue({ error: null });
});
afterEach(cleanup);

describe("JoinLobbyButton", () => {
  it("clears pending state when returning to the preserved lobby list", async () => {
    const page = (mode: "visible" | "hidden") => (
      <Activity mode={mode}>
        <JoinLobbyButton lobbyId="lobby-1" full={false} />
      </Activity>
    );
    const { rerender } = render(page("visible"));
    fireEvent.click(screen.getByRole("button", { name: "Join" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/lobbies/lobby-1"));
    expect(rpc).toHaveBeenCalledWith("join_lobby", { p_lobby_id: "lobby-1" });

    await act(async () => {
      rerender(page("hidden"));
    });
    await act(async () => {
      rerender(page("visible"));
    });

    expect(
      (screen.getByRole("button", { name: "Join" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });

  it.each([
    ["already_member", "You are already a member of this lobby."],
    ["lobby_full", "This lobby is full."],
    ["lobby_not_open", "This game has already started."],
  ])(
    "shows the server's %s reason without navigating",
    async (message, expected) => {
      rpc.mockResolvedValue({ error: { message } });
      render(<JoinLobbyButton lobbyId="lobby-1" full={false} />);
      fireEvent.click(screen.getByRole("button", { name: "Join" }));
      expect((await screen.findByRole("alert")).textContent).toBe(expected);
      expect(push).not.toHaveBeenCalled();
      expect(
        (screen.getByRole("button", { name: "Join" }) as HTMLButtonElement)
          .disabled,
      ).toBe(false);
    },
  );

  it("allows retrying an unexpected request failure", async () => {
    rpc.mockRejectedValueOnce(new Error("Network unavailable"));
    render(<JoinLobbyButton lobbyId="lobby-1" full={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Join" }));
    expect((await screen.findByRole("alert")).textContent).toBe(
      "Could not join the lobby. Try again.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Join" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/lobbies/lobby-1"));
  });
});
