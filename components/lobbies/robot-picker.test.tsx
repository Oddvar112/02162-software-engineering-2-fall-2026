import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RobotPicker } from "@/components/lobbies/robot-picker";
import roster from "@/lib/robots.json";

const { refresh, rpc } = vi.hoisted(() => ({ refresh: vi.fn(), rpc: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ rpc }) }));
vi.mock("@/components/lobbies/robot-preview", () => ({
  RobotPreview: ({ id }: { id: string | null }) =>
    id ? <div>Preview of {id}</div> : null,
  usePreloadRobots: () => undefined,
}));

beforeEach(() => {
  vi.clearAllMocks();
  rpc.mockResolvedValue({ error: null });
});
afterEach(cleanup);

const robot = (name: string) =>
  screen.getByRole("button", {
    name: new RegExp(`^${name}`),
  }) as HTMLButtonElement;

describe("RobotPicker", () => {
  it("shows the whole roster, marks my robot and greys out taken ones", () => {
    render(<RobotPicker lobbyId="lobby-1" chosen="bolt" taken={["gizmo"]} />);
    expect(screen.getAllByRole("button")).toHaveLength(roster.length);
    expect(robot("Bolt").getAttribute("aria-pressed")).toBe("true");
    expect(robot("Gizmo").disabled).toBe(true);
    expect(robot("Pixel").disabled).toBe(false);
  });

  it("shows a robot only after it is clicked, not when it is pointed at", () => {
    render(<RobotPicker lobbyId="lobby-1" chosen={null} taken={[]} />);
    fireEvent.mouseEnter(robot("Bolt"));
    fireEvent.focus(robot("Bolt"));
    expect(screen.queryByText(/Preview of/)).toBeNull();
    fireEvent.click(robot("Bolt"));
    expect(screen.getByText("Preview of bolt")).toBeDefined();
    expect(screen.getByText(/The reckless racer/)).toBeDefined();
  });

  it("shows the robot I already have when the lobby opens", () => {
    render(<RobotPicker lobbyId="lobby-1" chosen="glitch" taken={[]} />);
    expect(screen.getByText("Preview of glitch")).toBeDefined();
  });

  it("sends the chosen model to the server and refreshes the lobby", async () => {
    render(<RobotPicker lobbyId="lobby-1" chosen={null} taken={[]} />);
    fireEvent.click(robot("Pixel"));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(rpc).toHaveBeenCalledWith("choose_robot", {
      p_lobby_id: "lobby-1",
      p_model: "pixel",
    });
  });

  it.each([
    ["robot_taken", "Another player already picked that robot."],
    ["lobby_not_open", "This game has already started."],
    ["unknown_robot", "That robot does not exist."],
  ])("shows the server's %s reason", async (message, expected) => {
    rpc.mockResolvedValue({ error: { message } });
    render(<RobotPicker lobbyId="lobby-1" chosen={null} taken={[]} />);
    fireEvent.click(robot("Pixel"));
    expect((await screen.findByRole("alert")).textContent).toBe(expected);
    expect(refresh).not.toHaveBeenCalled();
    expect(robot("Pixel").disabled).toBe(false);
    expect(screen.queryByText(/Preview of/)).toBeNull();
  });

  it("goes back to showing my own robot when the server refuses another", async () => {
    rpc.mockResolvedValue({ error: { message: "robot_taken" } });
    render(<RobotPicker lobbyId="lobby-1" chosen="bolt" taken={[]} />);
    fireEvent.click(robot("Pixel"));
    await screen.findByRole("alert");
    expect(screen.getByText("Preview of bolt")).toBeDefined();
    expect(screen.queryByText("Preview of pixel")).toBeNull();
  });

  it("goes back to showing my own robot when the request fails", async () => {
    rpc.mockRejectedValue(new Error("offline"));
    render(<RobotPicker lobbyId="lobby-1" chosen="bolt" taken={[]} />);
    fireEvent.click(robot("Pixel"));
    await screen.findByRole("alert");
    expect(screen.getByText("Preview of bolt")).toBeDefined();
  });
});
