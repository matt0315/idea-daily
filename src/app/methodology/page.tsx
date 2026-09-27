import type { Metadata } from "next";
import { brand } from "@/lib/brand";
import { FRAMEWORKS } from "@/lib/frameworks";

export const metadata: Metadata = { title: "Methodology" };

export default function MethodologyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-[17px] leading-7">
      <h1 className="font-serif text-5xl">Methodology</h1>
      <p>{brand.name} prints a number only when it can point at the input. If the input is a placeholder, the page wears a Sample data badge and the footnote says so.</p>
      <h2 id="scores" className="font-serif text-3xl">Scores</h2>
      <p>Four scores, each 1–10, come from stored inputs. Opportunity is 40% volume, 35% growth, 25% competitor gap. Pain is 60% quote count and 40% severity. Buildability starts at 10 and subtracts weeks, capital, regulation, and dependency. Timing is 55% growth and 45% the count of independent signals. Labels are our own words.</p>
      <h2 id="volume" className="font-serif text-3xl">Volume and growth</h2>
      <p>Live volume is meant to come from DataForSEO’s Google Ads search-volume endpoint. Growth is the last 3 months of the series versus the same 3 months a year earlier. Sample series are shaped so the chart and the percentage use that definition. They are still not measurements.</p>
      <h2 id="quotes" className="font-serif text-3xl">Quotes</h2>
      <p>A customer sentence is stored only with the URL it came from. Illustrative composites are labelled and link here. Reddit is not scraped. A Reddit link appears only when a search API returned it.</p>
      <h2 id="research" className="font-serif text-3xl">Idea Agent</h2>
      <p>Without a provider, demand volume is null and the verdict uses a neutral prior. Build requires opportunity, pain, and buildability to clear a fixed bar. Otherwise the report says Test-first or Pass.</p>
      <h2 id="trends" className="font-serif text-3xl">Trends</h2>
      <p>The library drops navigational and government queries (near me, DMV, login, weather, big brand names, camp registration). A country switch rescales the sample library. Live mode is the same filter on provider data.</p>
      <h2 id="frameworks" className="font-serif text-3xl">Frameworks</h2>
      <p>{FRAMEWORKS.positionMap} is uniqueness × value. {FRAMEWORKS.signalTriangle} is audience reach, community heat, and offer clarity. {FRAMEWORKS.offerLadder} is the free, manual, and software sequence.</p>
      <h2 id="competitors" className="font-serif text-3xl">Competitors</h2>
      <p>Competitor lists stay empty until a search result URL is attached. The template does not invent company names to fill the box.</p>
    </div>
  );
}
