import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AuthPanel } from "./auth-panel";

const auth = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
}));
const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ auth }) }));
vi.mock("@/lib/utils", () => ({ hasEnvVars: true }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

function fillForm(signUp = false, confirmation = "safe-password") {
  fireEvent.change(screen.getByLabelText("Email address"), {
    target: { value: "pilot@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Password", { exact: true }), {
    target: { value: "safe-password" },
  });
  if (signUp)
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: confirmation },
    });
  fireEvent.submit(screen.getByLabelText("Email address").closest("form")!);
}

it("rejects mismatched passwords before making a sign-up request", () => {
  render(<AuthPanel initialMode="sign-up" />);
  fillForm(true, "wrong-password");
  expect(screen.getByRole("alert").textContent).toContain("don’t match");
  expect(auth.signUp).not.toHaveBeenCalled();
});

it("shows authentication errors and allows another attempt", async () => {
  auth.signInWithPassword.mockResolvedValue({
    error: new Error("Invalid login credentials"),
  });
  render(<AuthPanel />);
  fillForm();
  expect((await screen.findByRole("alert")).textContent).toBe(
    "Invalid login credentials",
  );
  expect(
    (screen.getByRole("button", { name: "Let’s play" }) as HTMLButtonElement)
      .disabled,
  ).toBe(false);
  expect(router.push).not.toHaveBeenCalled();
});

it("refreshes the authenticated landing page after sign-in", async () => {
  auth.signInWithPassword.mockResolvedValue({ error: null });
  render(<AuthPanel />);
  fillForm();
  await waitFor(() => expect(router.refresh).toHaveBeenCalledOnce());
  expect(auth.signInWithPassword).toHaveBeenCalledWith({
    email: "pilot@example.com",
    password: "safe-password",
  });
  expect(router.push).toHaveBeenCalledWith("/");
});

it("shows email confirmation when sign-up has no active session", async () => {
  auth.signUp.mockResolvedValue({ data: { session: null }, error: null });
  render(<AuthPanel initialMode="sign-up" />);
  fillForm(true);
  expect(
    await screen.findByRole("heading", { name: "Check your inbox." }),
  ).toBeDefined();
  expect(screen.getByRole("status").textContent).toContain("pilot@example.com");
  expect(auth.signUp).toHaveBeenCalledWith({
    email: "pilot@example.com",
    password: "safe-password",
    options: { emailRedirectTo: `${window.location.origin}/` },
  });
  expect(router.push).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Back to sign in" }));
  expect(
    (screen.getByLabelText("Password", { exact: true }) as HTMLInputElement)
      .value,
  ).toBe("");
});

it("enters the landing page directly when sign-up returns a session", async () => {
  auth.signUp.mockResolvedValue({
    data: { session: { access_token: "test" } },
    error: null,
  });
  render(<AuthPanel initialMode="sign-up" />);
  fillForm(true);
  await waitFor(() => expect(router.refresh).toHaveBeenCalledOnce());
  expect(router.push).toHaveBeenCalledWith("/");
  expect(screen.queryByText("Check your inbox.")).toBeNull();
});

it("blocks duplicate submissions and mode switches while a request is pending", async () => {
  let resolve!: (value: { error: null }) => void;
  auth.signInWithPassword.mockReturnValue(
    new Promise((done) => {
      resolve = done;
    }),
  );
  render(<AuthPanel />);
  fillForm();
  fireEvent.submit(screen.getByLabelText("Email address").closest("form")!);
  expect(auth.signInWithPassword).toHaveBeenCalledOnce();
  expect(
    (
      screen.getByRole("button", {
        name: "Create account",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  resolve({ error: null });
  await waitFor(() => expect(router.refresh).toHaveBeenCalledOnce());
});

it("toggles password visibility and clears secrets when changing modes", () => {
  render(<AuthPanel />);
  fireEvent.change(screen.getByLabelText("Password", { exact: true }), {
    target: { value: "private-password" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Show password" }));
  expect(
    (screen.getByLabelText("Password", { exact: true }) as HTMLInputElement)
      .type,
  ).toBe("text");
  fireEvent.click(screen.getByRole("button", { name: "Create account" }));
  const password = screen.getByLabelText("Password", {
    exact: true,
  }) as HTMLInputElement;
  expect(password.type).toBe("password");
  expect(password.value).toBe("");
  expect(password.autocomplete).toBe("new-password");
});
