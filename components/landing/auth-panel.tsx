"use client";

import { useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Flag,
  MailCheck,
  ShieldCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { hasEnvVars } from "@/lib/utils";
import styles from "./landing.module.css";

export type AuthMode = "login" | "sign-up";

export function AuthPanel({
  initialMode = "login",
}: {
  initialMode?: AuthMode;
}) {
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(
    null,
  );
  const submitting = useRef(false);
  const router = useRouter();
  const id = useId();
  const isSignUp = mode === "sign-up";

  function changeMode(next: AuthMode) {
    if (submitting.current) return;
    setMode(next);
    setError(null);
    setPassword("");
    setRepeatPassword("");
    setShowPassword(false);
    setConfirmationEmail(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    setError(null);
    if (isSignUp && password !== repeatPassword) {
      setError("Your passwords don’t match. Give them another look.");
      return;
    }
    if (!hasEnvVars) {
      setError("Sign-in is temporarily unavailable. Please try again later.");
      return;
    }
    submitting.current = true;
    setIsLoading(true);
    try {
      const supabase = createClient();
      if (isSignUp) {
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (authError) throw authError;
        if (!data.session) {
          setConfirmationEmail(email.trim());
          setPassword("");
          setRepeatPassword("");
          return;
        }
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (authError) throw authError;
      }
      router.push("/");
      router.refresh();
    } catch (error: unknown) {
      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      submitting.current = false;
      setIsLoading(false);
    }
  }

  if (confirmationEmail) {
    return (
      <div className={styles.confirmation} role="status">
        <div className={styles.panelIcon}>
          <MailCheck size={24} aria-hidden="true" />
        </div>
        <p className={styles.panelEyebrow}>ONE LAST CHECKPOINT</p>
        <h2>Check your inbox.</h2>
        <p>
          Follow the confirmation link sent to{" "}
          <strong>{confirmationEmail}</strong> to activate your account. Then
          you&apos;re ready to roll.
        </p>
        <button
          type="button"
          className={styles.submit}
          onClick={() => changeMode("login")}
        >
          Back to sign in <ArrowRight size={18} aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <>
      <div className={styles.panelTop}>
        <div className={styles.panelIcon}>
          <Flag size={22} aria-hidden="true" />
        </div>
        <span className={styles.panelEyebrow}>
          YOUR NEXT RIVALRY STARTS HERE
        </span>
      </div>
      <h2 className={styles.panelTitle}>
        {isSignUp ? "Join the starting line." : "Ready to roll?"}
      </h2>
      <p className={styles.panelDescription}>
        {isSignUp
          ? "Make an account. Make some mischief."
          : "Good to see you. Let’s make some mischief."}
      </p>
      <div
        className={styles.modeSwitch}
        role="group"
        aria-label="Account access"
      >
        <button
          type="button"
          aria-pressed={!isSignUp}
          disabled={isLoading}
          onClick={() => changeMode("login")}
        >
          Sign in
        </button>
        <button
          type="button"
          aria-pressed={isSignUp}
          disabled={isLoading}
          onClick={() => changeMode("sign-up")}
        >
          Create account
        </button>
      </div>
      <form
        onSubmit={handleSubmit}
        className={styles.form}
        aria-busy={isLoading}
        aria-describedby={error ? `${id}-error` : undefined}
      >
        <div className={styles.field}>
          <label htmlFor={`${id}-email`}>Email address</label>
          <input
            id={`${id}-email`}
            name="email"
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="you@example.com"
            required
            value={email}
            disabled={isLoading}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <div className={styles.labelRow}>
            <label htmlFor={`${id}-password`}>Password</label>
            {!isSignUp && (
              <Link href="/auth/forgot-password">Forgot password?</Link>
            )}
          </div>
          <div className={styles.passwordField}>
            <input
              id={`${id}-password`}
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete={isSignUp ? "new-password" : "current-password"}
              placeholder={
                isSignUp ? "At least 6 characters" : "Enter your password"
              }
              required
              minLength={isSignUp ? 6 : undefined}
              value={password}
              disabled={isLoading}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
        {isSignUp && (
          <div className={styles.field}>
            <label htmlFor={`${id}-repeat-password`}>Confirm password</label>
            <input
              id={`${id}-repeat-password`}
              name="repeat-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Once more, just to be sure"
              required
              minLength={6}
              value={repeatPassword}
              disabled={isLoading}
              onChange={(e) => setRepeatPassword(e.target.value)}
            />
          </div>
        )}
        {error && (
          <p id={`${id}-error`} className={styles.error} role="alert">
            {error}
          </p>
        )}
        <button className={styles.submit} type="submit" disabled={isLoading}>
          {isLoading
            ? isSignUp
              ? "Creating your account…"
              : "Signing you in…"
            : isSignUp
              ? "Create account"
              : "Let’s play"}
          {!isLoading && <ArrowRight size={18} aria-hidden="true" />}
        </button>
      </form>
      <div className={styles.panelDivider}>
        <span /> OR TAKE A LOOK FIRST <span />
      </div>
      <Link href="/game" className={styles.exploreLink}>
        Explore the board <ArrowRight size={15} aria-hidden="true" />
      </Link>
      <p className={styles.securityNote}>
        <ShieldCheck size={14} aria-hidden="true" /> No downloads. Just good
        decisions. Mostly.
      </p>
    </>
  );
}
