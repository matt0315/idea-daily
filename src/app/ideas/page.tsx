import type { Metadata } from "next";
import Link from "next/link";
import { asPlan, getCurrentUser } from "@/lib/auth";
import { brand } from "@/lib/brand";
import { db } from "@/lib/db";
import { founderFit } from "@/lib/founder-fit";
import { canAccess } from "@/lib/gating";
import { ideaTypeLabel } from "@/lib/autocomplete/copy";
import { formatGrowth } from "@/lib/idea-view";
import { readProfile } from "@/lib/profile";
import type { IdeaRequirements } from "@/lib/founder-fit";
import type { Prisma } from "@prisma/client";

export const metadata: Metadata = { title: "Idea database", description: `Search and filter ${brand.name} ideas.` };

export default async function IdeasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  const plan = asPlan(user?.plan ?? "FREE");
  const open = canAccess(plan, "database");
  const q = one(sp.q);
  const category = one(sp.category);
  const market = one(sp.market);
  const capital = one(sp.capital);
  const difficulty = numberOr(one(sp.difficulty));
  const score = numberOr(one(sp.score));
  const growth = numberOr(one(sp.growth));
  const sort = one(sp.sort) || "newest";
  const ideaType = one(sp.type);
  const focus = one(sp.focus);
  const focusScore = numberOr(one(sp.focusScore));

  const where: Prisma.IdeaWhereInput = { status: "PUBLISHED" };
  if (open && q) where.OR = [{ title: { contains: q, mode: "insensitive" } }, { summary: { contains: q, mode: "insensitive" } }, { keyword: { contains: q, mode: "insensitive" } }];
  if (open && category) where.category = category;
  if (open && (market === "B2B" || market === "B2C" || market === "BOTH")) where.market = market;
  if (open && (ideaType === "SAAS" || ideaType === "APP" || ideaType === "DIGITAL")) where.ideaType = ideaType;
  if (open && capital) where.capitalBand = capital;
  if (open && difficulty != null) where.difficulty = { lte: difficulty };
  if (open && score != null) where.opportunity = { gte: score };
  if (open && growth != null) where.growth = { gte: growth };
  if (open && focus === "pass") where.focusVerdict = "pass";
  if (open && focus === "needs") where.focusVerdict = "needs-work";
  if (open && focusScore != null) where.focusScore = { gte: focusScore };

  const orderBy: Prisma.IdeaOrderByWithRelationInput =
    sort === "opportunity" ? { opportunity: "desc" } : sort === "pain" ? { pain: "desc" } : sort === "buildability" ? { buildability: "desc" } : sort === "timing" ? { timing: "desc" } : sort === "growth" ? { growth: "desc" } : sort === "focus" ? { focusScore: "desc" } : { publishedAt: "desc" };

  const ideas = await db.idea.findMany({
    where: open ? where : { status: "PUBLISHED" },
    orderBy,
    take: open ? 100 : 4,
  });
  const categories = await db.idea.findMany({ where: { status: "PUBLISHED" }, distinct: ["category"], select: { category: true } });
  const profile = readProfile(user?.founderProfile);

  const rows = ideas.map((idea) => ({
    ...idea,
    fit: profile && canAccess(plan, "founderFit") ? founderFit(profile, idea.requirements as IdeaRequirements).percent : null,
  }));
  if (open && sort === "fit") rows.sort((a, b) => (b.fit ?? -1) - (a.fit ?? -1));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-serif text-5xl">Idea database</h1>
      <p className="mt-2 max-w-2xl text-muted">Every permalink stays public. Search, filters, and sorting are on Builder. {open ? <a className="underline" href="/api/export/ideas">Download CSV</a> : null}</p>
      {!open ? (
        <div className="mt-6 rounded-3xl border border-dashed border-copper bg-copper-soft p-5">
          <h2 className="font-serif text-2xl">Filters are on Builder</h2>
          <p className="mt-1 text-sm">You can open any idea from its public URL. The searchable archive is a paid feature.</p>
          <Link href="/pricing" className="mt-3 inline-block font-semibold text-copper">See pricing</Link>
        </div>
      ) : (
        <form className="mt-6 grid gap-3 rounded-3xl border border-line bg-card p-4 md:grid-cols-4" method="get">
          <input name="q" defaultValue={q} placeholder="Search" className="rounded-xl border border-line bg-paper px-3 py-2 md:col-span-2" />
          <select name="category" defaultValue={category} className="rounded-xl border border-line bg-paper px-3 py-2">
            <option value="">All categories</option>
            {categories.map((item) => <option key={item.category}>{item.category}</option>)}
          </select>
          <select name="type" defaultValue={ideaType} className="rounded-xl border border-line bg-paper px-3 py-2">
            <option value="">All types</option>
            <option value="SAAS">Startup / SaaS</option>
            <option value="APP">App</option>
            <option value="DIGITAL">Digital product</option>
          </select>
          <select name="market" defaultValue={market} className="rounded-xl border border-line bg-paper px-3 py-2">
            <option value="">B2B and B2C</option>
            <option>B2B</option>
            <option>B2C</option>
            <option>BOTH</option>
          </select>
          <select name="capital" defaultValue={capital} className="rounded-xl border border-line bg-paper px-3 py-2">
            <option value="">Any capital</option>
            <option value="none">none</option>
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
          </select>
          <input name="difficulty" defaultValue={one(sp.difficulty)} placeholder="Max difficulty 1–10" className="rounded-xl border border-line bg-paper px-3 py-2" />
          <input name="score" defaultValue={one(sp.score)} placeholder="Min opportunity" className="rounded-xl border border-line bg-paper px-3 py-2" />
          <input name="growth" defaultValue={one(sp.growth)} placeholder="Min growth %" className="rounded-xl border border-line bg-paper px-3 py-2" />
          <select name="focus" defaultValue={focus} className="rounded-xl border border-line bg-paper px-3 py-2">
            <option value="">Any {brand.focusName}</option>
            <option value="pass">Pass</option>
            <option value="needs">Needs work</option>
          </select>
          <input name="focusScore" defaultValue={one(sp.focusScore)} placeholder="Min checklist score 0–4" className="rounded-xl border border-line bg-paper px-3 py-2" />
          <select name="sort" defaultValue={sort} className="rounded-xl border border-line bg-paper px-3 py-2">
            <option value="newest">Newest</option>
            <option value="opportunity">Opportunity</option>
            <option value="pain">Pain</option>
            <option value="buildability">Buildability</option>
            <option value="timing">Timing</option>
            <option value="growth">Growth</option>
            <option value="focus">{brand.focusName} score</option>
            <option value="fit">Best for me</option>
          </select>
          <button className="rounded-full bg-ink px-4 py-2 text-sm text-paper" type="submit">Apply</button>
        </form>
      )}
      <div className="mt-6 divide-y divide-line rounded-3xl border border-line bg-card">
        {rows.map((idea) => (
          <Link key={idea.id} href={`/ideas/${idea.slug}`} className="grid gap-2 px-4 py-4 hover:bg-paper md:grid-cols-[1fr_auto]">
            <div>
              <h2 className="font-serif text-2xl">{idea.title}</h2>
              <p className="text-sm text-muted">{ideaTypeLabel(idea.ideaType)} · {idea.category} · {idea.market} · capital {idea.capitalBand}</p>
            </div>
            <p className="num text-sm text-muted">
              Opp {idea.opportunity} · Pain {idea.pain} · Build {idea.buildability} · Time {idea.timing} · {brand.focusName} {idea.focusScore}/4 · {formatGrowth(idea.growth)}
              {idea.fit != null ? ` · Fit ${idea.fit}%` : ""}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}
function numberOr(value: string): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
