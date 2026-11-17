import Link from "next/link";
import { BRAND } from "@/lib/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-neutral">
      <Link href="/" className="font-serif text-3xl tracking-tighter text-on-surface mb-8">
        {BRAND.name}
      </Link>
      <div className="w-full max-w-md bg-surface border border-border/50 rounded-2xl p-8 shadow-sm">
        {children}
      </div>
    </div>
  );
}
