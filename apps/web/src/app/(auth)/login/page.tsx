import Link from "next/link";
import { login } from "@/app/actions/authActions";
import AuthForm from "../AuthForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  return (
    <>
      <h1 className="text-3xl font-serif tracking-tight text-on-surface mb-2">Welcome back</h1>
      <p className="text-on-surface-muted text-sm mb-6">Log in to your calling dashboard.</p>
      {error === "no-workspace" && (
        <p role="alert" className="mb-5 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          Your account has no workspace yet. Contact support.
        </p>
      )}
      <AuthForm
        action={login}
        next={next}
        submitLabel="Log in"
        fields={[
          { name: "email", label: "Email", type: "email", autoComplete: "email", placeholder: "you@company.com" },
          { name: "password", label: "Password", type: "password", autoComplete: "current-password" },
        ]}
      />
      <p className="text-sm text-on-surface-muted mt-6 text-center">
        New here?{" "}
        <Link href="/signup" className="font-semibold text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </>
  );
}
