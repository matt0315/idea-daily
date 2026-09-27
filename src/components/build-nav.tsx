import Link from "next/link";
import { alphabetDemand } from "@/lib/autocomplete/copy";

export function BuildNav({ current }: { current: "projects" | "alphabet" }) {
  const item = (href: string, label: string, active: boolean) => (
    <Link href={href} className={`rounded-full px-3 py-1.5 text-sm ${active ? "bg-ink text-paper" : "border border-line bg-card"}`}>
      {label}
    </Link>
  );
  return (
    <nav className="mt-4 flex flex-wrap gap-2">
      {item("/build", "Projects", current === "projects")}
      {item("/build/alphabet", alphabetDemand.name, current === "alphabet")}
    </nav>
  );
}
