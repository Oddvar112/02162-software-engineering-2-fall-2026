import { LoginForm } from "@/components/auth/login-form";

export default function Page() {
  return (
    <div className="rr-auth-page">
      <div className="rr-reveal w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  );
}
