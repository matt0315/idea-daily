import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/lib/brand";

export const metadata: Metadata = { title: "Unsubscribed" };

export default function UnsubscribedPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="font-serif text-4xl">You are off the list</h1>
      <p className="mt-4">The daily letter from {brand.name} will not go to this address. Past issues stay public. <Link className="underline" href="/letter">Read the archive</Link>.</p>
    </div>
  );
}
