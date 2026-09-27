import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/lib/brand";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Email preferences" };

export default async function PreferencesPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  const user = token ? await db.user.findFirst({ where: { emailToken: token } }) : null;
  const subscriber = !user && token ? await db.subscriber.findFirst({ where: { token } }) : null;
  const email = user?.email || subscriber?.email;
  const on = user ? user.emailOptIn : subscriber ? subscriber.unsubscribedAt == null : false;

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="font-serif text-4xl">Email preferences</h1>
      {!email ? (
        <p className="mt-4">This link does not match a letter subscription. <Link className="underline" href="/account">Open your account</Link> if you have one, or <Link className="underline" href="/">join from the homepage</Link>.</p>
      ) : (
        <>
          <p className="mt-4">{email} is {on ? "on" : "off"} the daily letter from {brand.name}.</p>
          <form action={on ? "/api/letter/unsubscribe" : "/api/letter/resubscribe"} method="post" className="mt-4">
            <input type="hidden" name="token" value={token} />
            <button className="rounded-full bg-ink px-4 py-2 text-sm text-paper" type="submit">{on ? "Unsubscribe" : "Subscribe again"}</button>
          </form>
        </>
      )}
    </div>
  );
}
