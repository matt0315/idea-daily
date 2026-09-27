export default function SignupPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="font-serif text-4xl">Create an account</h1>
      <form action="/api/auth/signup" method="post" className="mt-6 space-y-3">
        <input name="name" placeholder="Name" className="w-full rounded-xl border border-line bg-card px-3 py-2" />
        <input name="email" type="email" required placeholder="Email" className="w-full rounded-xl border border-line bg-card px-3 py-2" />
        <input name="password" type="password" required minLength={8} placeholder="Password (8+)" className="w-full rounded-xl border border-line bg-card px-3 py-2" />
        <button className="rounded-full bg-teal px-4 py-2 text-sm text-white" type="submit">Create free account</button>
      </form>
    </div>
  );
}
