import { SignUpForm } from "@/components/auth/sign-up-form";

export default function Page() {
  return (
    <div className="rr-auth-page">
      <div className="rr-reveal w-full max-w-sm">
        <SignUpForm />
      </div>
    </div>
  );
}
