import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import Home from "@/app/page";

vi.mock("@/components/auth-button", () => ({
  AuthButton: () => null,
}));

it("shows the course code on the landing page", () => {
  render(<Home />);

  expect(screen.getByText(/02162/)).toBeDefined();
});
