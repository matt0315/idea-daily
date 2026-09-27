import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <h1 className="font-serif text-4xl">That page is not here</h1>
      <Link href="/" className="mt-4 inline-block underline">Back home</Link>
    </div>
  );
}
