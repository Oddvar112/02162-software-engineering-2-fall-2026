import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function Page() {
  return (
    <div className="rr-auth-page">
      <div className="rr-reveal w-full max-w-sm">
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
