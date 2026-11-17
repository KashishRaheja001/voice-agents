import Link from "next/link";
import { signup } from "@/app/actions/authActions";
import AuthForm from "../AuthForm";

export default function SignupPage() {
  return (
    <>
      <h1 className="text-3xl font-serif tracking-tight text-on-surface mb-2">Create your workspace</h1>
      <p className="text-on-surface-muted text-sm mb-6">
        One workspace per company. Add your projects, import leads, start calling.
      </p>
      <AuthForm
        action={signup}
        submitLabel="Create account"
        fields={[
          { name: "company", label: "Company name", type: "text", autoComplete: "organization", placeholder: "Sharma Builders" },
          { name: "email", label: "Work email", type: "email", autoComplete: "email", placeholder: "you@company.com" },
          { name: "password", label: "Password (8+ characters)", type: "password", autoComplete: "new-password" },
        ]}
      />
      <p className="text-sm text-on-surface-muted mt-6 text-center">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Log in
        </Link>
      </p>
    </>
  );
}
