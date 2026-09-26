import Link from "next/link";
import { brand } from "@/lib/brand";
import { planLabel, type Plan } from "@/lib/gating";
import { isSampleMode } from "@/lib/data-mode";

const LINKS = [
  { href: "/today", label: "Today" },
  { href: "/ideas", label: "Database" },
  { href: "/trends", label: "Trends" },
  { href: "/insights", label: "Insights" },
  { href: "/research", label: "Research" },
  { href: "/build", label: "Build" },
  { href: "/pricing", label: "Pricing" },
];

export function SampleBanner() {
  if (!isSampleMode()) return null;
  return (
    <div className="bg-amber-100 text-amber-950 text-sm">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-2">
        <p>
          <strong className="font-semibold">Sample data.</strong> Figures on this deployment are labelled placeholders. They are not live measurements.
        </p>
        <Link href="/methodology" className="underline underline-offset-2">
          How scoring works
        </Link>
      </div>
    </div>
  );
}

export function Header({ email, plan }: { email?: string | null; plan?: Plan | null }) {
  return (
    <header className="border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-teal font-serif text-sm text-white">Id</span>
          <span className="font-serif text-xl tracking-tight">{brand.name}</span>
        </Link>
        <nav className="hidden items-center gap-4 text-sm text-muted lg:flex">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-ink">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2 text-sm">
          {email ? (
            <>
              <span className="hidden text-muted sm:inline">{plan ? planLabel(plan) : "Free"}</span>
              <Link href="/account" className="rounded-full border border-line bg-card px-3 py-1.5 hover:border-teal">
                Account
              </Link>
            </>
          ) : (
            <Link href="/login" className="rounded-full bg-ink px-3 py-1.5 text-paper">
              Sign in
            </Link>
          )}
        </div>
      </div>
      <nav className="flex gap-4 overflow-x-auto px-4 pb-3 text-sm text-muted lg:hidden">
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="whitespace-nowrap">
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-20 border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-8 text-sm text-muted">
        <p>{brand.name} — {brand.tagline}</p>
        <div className="flex gap-4">
          <Link href="/methodology">Methodology</Link>
          <Link href="/built-with">Built with</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/fit">Founder fit</Link>
        </div>
      </div>
    </footer>
  );
}
