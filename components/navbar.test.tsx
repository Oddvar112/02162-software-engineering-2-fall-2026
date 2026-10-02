import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { Navbar } from "@/components/navbar";

vi.mock("@/components/auth/auth-button", () => ({
  AuthButton: () => <button>Mocked Auth</button>,
}));

vi.mock("@/components/theme-switcher", () => ({
  ThemeSwitcher: () => <div>Mocked Theme</div>,
}));

it("renders the RoboRally brand link with prominent styling", () => {
  render(<Navbar />);

  const link = screen.getByRole("link", { name: "RoboRally" });
  expect(link).toBeDefined();
  expect(link.getAttribute("href")).toBe("/");
  expect(screen.getByText("Robo")).toBeDefined();
  expect(screen.getByText("Rally")).toBeDefined();
});

