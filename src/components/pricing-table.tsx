"use client";

import { useState } from "react";

const TIERS = [
  {
    id: "FREE",
    name: "Free",
    monthly: "$0",
    annual: "$0",
    points: ["Today’s idea, kept public", "Past idea pages stay indexable", "Daily email", "Cursor build guide", "Trend and insight teasers"],
  },
  {
    id: "BUILDER",
    name: "Builder",
    monthly: "$19",
    annual: "$149",
    points: ["Full database, filters, and export", "Trends library and 10 research queries / month", "Insights and the idea generator (20 / month)", "Founder fit on every idea", "All build guides", "Advisor: 20 chats / month"],
  },
  {
    id: "PRO",
    name: "Pro",
    monthly: "$49",
    annual: "$399",
    points: ["Everything in Builder", "Idea Agent: 5 research runs / month", "Advisor: 150 chats / month", "Trend research: 50 queries / month", "Build hub skills, including run-all", "Generator: 100 ideas / month"],
  },
];

export function PricingTable({ stripeOn, signedIn }: { stripeOn: boolean; signedIn: boolean }) {
  const [annual, setAnnual] = useState(true);
  return (
    <div>
      <div className="mb-6 inline-flex rounded-full border border-line bg-card p-1 text-sm">
        <button type="button" onClick={() => setAnnual(false)} className={`rounded-full px-4 py-1.5 ${annual ? "" : "bg-ink text-paper"}`}>Monthly</button>
        <button type="button" onClick={() => setAnnual(true)} className={`rounded-full px-4 py-1.5 ${annual ? "bg-ink text-paper" : ""}`}>Annual</button>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {TIERS.map((tier) => (
          <article key={tier.id} className={`rounded-3xl border bg-card p-6 shadow-card ${tier.id === "BUILDER" ? "border-teal" : "border-line"}`}>
            <h2 className="font-serif text-3xl">{tier.name}</h2>
            <p className="mt-2 font-serif text-4xl">{annual ? tier.annual : tier.monthly}</p>
            <p className="text-sm text-muted">{tier.id === "FREE" ? "No card" : annual ? "per year" : "per month"}</p>
            <ul className="mt-4 space-y-2 text-sm">
              {tier.points.map((point) => (
                <li key={point}>· {point}</li>
              ))}
            </ul>
            {tier.id === "FREE" ? (
              <a href="/signup" className="mt-6 inline-block text-sm font-semibold text-teal">Create a free account</a>
            ) : signedIn ? (
              <form action={stripeOn ? "/api/stripe/checkout" : "/api/billing/demo"} method="post" className="mt-6">
                <input type="hidden" name="plan" value={tier.id} />
                <input type="hidden" name="interval" value={annual ? "ANNUAL" : "MONTHLY"} />
                <button className="rounded-full bg-teal px-4 py-2 text-sm text-white" type="submit">
                  {stripeOn ? `Subscribe ${annual ? "annually" : "monthly"}` : "Demo upgrade (no charge)"}
                </button>
              </form>
            ) : (
              <a href="/login" className="mt-6 inline-block text-sm font-semibold text-teal">Sign in to choose {tier.name}</a>
            )}
          </article>
        ))}
      </div>
      {!stripeOn ? <p className="mt-4 text-sm text-amber-800">Stripe keys are not set. Demo upgrade changes the plan in this database and does not create a charge.</p> : null}
    </div>
  );
}
