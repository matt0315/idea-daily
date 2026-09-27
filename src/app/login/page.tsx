import { brand } from "@/lib/brand";

const DEMOS = [
  ["free@ideadaily.dev", "Free"],
  ["builder@ideadaily.dev", "Builder"],
  ["pro@ideadaily.dev", "Pro"],
  ["admin@ideadaily.dev", "Admin"],
];

export default function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  return (
    <LoginForm searchParams={searchParams} />
  );
}

async function LoginForm({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="font-serif text-4xl">Sign in</h1>
      <p className="mt-2 text-sm text-muted">Local demo password for every seeded account is demo1234.</p>
      {sp.error ? <p className="mt-3 text-sm text-copper">Those credentials did not match.</p> : null}
      <form action="/api/auth/login" method="post" className="mt-6 space-y-3">
        <input type="hidden" name="next" value={sp.next || "/account"} />
        <input name="email" type="email" required placeholder="Email" className="w-full rounded-xl border border-line bg-card px-3 py-2" />
        <input name="password" type="password" required placeholder="Password" className="w-full rounded-xl border border-line bg-card px-3 py-2" />
        <button className="rounded-full bg-ink px-4 py-2 text-sm text-paper" type="submit">Sign in</button>
      </form>
      <div className="mt-6 space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted">Demo accounts</p>
        {DEMOS.map(([email, label]) => (
          <form key={email} action="/api/auth/login" method="post">
            <input type="hidden" name="email" value={email} />
            <input type="hidden" name="password" value="demo1234" />
            <input type="hidden" name="next" value={sp.next || "/account"} />
            <button className="text-sm text-teal" type="submit">{label} · {email}</button>
          </form>
        ))}
      </div>
      <p className="mt-6 text-sm">New here? <a className="underline" href="/signup">Create an account</a>. {brand.name} stores a password hash, not a third-party login.</p>
    </div>
  );
}
