import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { requireOrg } from "@/lib/auth";
import { logout } from "@/app/actions/authActions";

const NAV = [
  { href: "/dashboard", label: "Dashboard", className: "text-on-surface" },
  { href: "/leads", label: "Leads", className: "text-on-surface" },
  { href: "/leads/interested", label: "Hot Leads", className: "text-red-700 font-bold" },
  { href: "/properties", label: "Properties", className: "text-on-surface" },
  { href: "/settings", label: "Settings", className: "text-on-surface" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { org } = await requireOrg();

  return (
    <>
      <header className="border-b border-border/50 bg-surface/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between gap-6">
          <Link href="/dashboard" className="font-serif text-2xl tracking-tighter text-on-surface shrink-0">
            {BRAND.name}
          </Link>
          <nav className="hidden md:flex items-center gap-8 font-medium text-sm">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className={`${item.className} hover:text-primary transition-colors`}>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            <span className="hidden sm:block text-sm text-on-surface-muted truncate max-w-[10rem]">{org.name}</span>
            <form action={logout}>
              <button
                type="submit"
                className="border border-border/50 bg-neutral px-5 py-2 rounded-full text-sm font-semibold hover:bg-tertiary transition-colors"
              >
                Log out
              </button>
            </form>
          </div>
        </div>
        <nav className="md:hidden flex gap-5 overflow-x-auto px-6 pb-3 text-sm font-medium">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className={`${item.className} whitespace-nowrap`}>
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="flex-1 max-w-7xl w-full mx-auto p-6">{children}</main>
    </>
  );
}
