import type { Metadata } from "next";
import { PricingTable } from "@/components/pricing-table";
import { getCurrentUser } from "@/lib/auth";
import { brand } from "@/lib/brand";

export const metadata: Metadata = { title: "Pricing" };

export default async function PricingPage() {
  const user = await getCurrentUser();
  const stripeOn = Boolean(process.env.STRIPE_SECRET_KEY);
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-serif text-5xl">Pricing</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted">
        {brand.name} is monthly or annual. The free plan keeps every published idea page public. Builder opens the archive. Pro opens research and the build hub.
      </p>
      <div className="mt-8">
        <PricingTable stripeOn={stripeOn} signedIn={Boolean(user)} />
      </div>
      <div className="mt-10 max-w-3xl space-y-3 text-sm text-muted">
        <h2 className="font-serif text-2xl text-ink">Notes</h2>
        <p>Annual prices are $149 (Builder) and $399 (Pro). Monthly is $19 and $49. These are our prices, not a copy of anyone else’s menu.</p>
        <p>Idea Agent runs are metered because each live run can spend real money on search and model calls. Sample mode still counts against the quota so the gate can be tested.</p>
        <p>Refunds: if Stripe is connected, cancel from the billing portal you configure. This build does not invent a refund workflow.</p>
      </div>
    </div>
  );
}
