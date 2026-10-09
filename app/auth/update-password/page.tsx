import { UpdatePasswordForm } from "@/components/auth/update-password-form";

export default function Page() {
  return (
    <div className="rr-auth-page">
      <div className="rr-reveal w-full max-w-sm">
        <UpdatePasswordForm />
      </div>
    </div>
  );
}
