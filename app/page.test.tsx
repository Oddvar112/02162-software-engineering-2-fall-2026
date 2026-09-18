import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import Home from "@/app/page";

vi.mock("@/components/landing/landing-access", () => ({
  LandingAccess: () => <div>Account access</div>,
}));

it("shows the approved brand, course credit, and public board entry", () => {
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  const { unmount } = render(<Home />);
  expect(screen.getByText(/02162/)).toBeDefined();
  expect(
    screen.getByRole("img", { name: "RoboRally Reimagined" }),
  ).toBeDefined();
  expect(
    screen
      .getByRole("link", { name: "Explore the board" })
      .getAttribute("href"),
  ).toBe("/game");
  unmount();
  vi.unstubAllGlobals();
});
