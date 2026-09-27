import { scoreFocus, type FocusFacts } from "./focus";

/** Hand-written sample facts for seeded ideas. The scorer, not these notes, decides pass or fail. */
const SAMPLES: Record<string, FocusFacts> = {
  quotelatch: {
    customer: "Maya Chen, owner of a residential electrical shop with six technicians",
    pain: "She rebuilds each quote from a homeowner panel photo and loses the lead when she answers late.",
    offer: "A quoting desk that turns one panel photo into a one-page quote",
    price: "$79 a month",
    funnel: [
      "They see a one-page example of the price book",
      "They forward one real panel photo",
      "They pay the monthly seat after the first quote sends",
    ],
    channel: "Electrician Talk forum",
  },
  dockboard: {
    customer: "Luis Ortega, building manager of a multi-tenant warehouse in one city",
    pain: "Tenants book the same dock door and the morning starts with an argument in the yard.",
    offer: "A shared appointment board for one warehouse",
    price: "Set after the first paid pilot",
    funnel: [
      "They see a sample week on one door",
      "They book a real tenant into that door",
      "They pay a building invoice for the next month",
    ],
    channel: "A regional warehouse association meetup",
  },
  kennelnote: {
    customer: "Priya Shah, overnight lead at an independent vet clinic",
    pain: "The morning vet inherits a sticky note that does not say which patient is still open.",
    offer: "A five-field handoff note the night tech finishes before leaving",
    price: "$39 a month",
    funnel: [
      "They read a sample night note",
      "They file one real handoff",
      "They pay the clinic seat",
    ],
    channel: "social media",
  },
  menumargin: {
    customer: "restaurants",
    pain: "Plates are priced from memory and the spreadsheet is a month behind.",
    offer: "A recipe costing sheet for one menu",
    price: "$59 a month",
    funnel: [
      "They see one dish broken into cost lines",
      "They paste a real recipe",
      "They pay for the costing seat",
    ],
    channel: "An independent restaurant association meetup",
  },
  permitping: {
    customer: "Elena Brooks, owner of a small contracting shop in one metro",
    pain: "She refreshes a public permit page that never emails her when the status changes.",
    offer: "An email when one city’s permit status changes",
    price: "$49 a month",
    funnel: ["They hear about the alert", "They pay the concierge month"],
    channel: "A local builders association meetup",
  },
  crateday: {
    customer: "Jonah Hale, owner of an independent CSA farm with 80 members",
    pain: "Wednesday packing still depends on a text thread and a handwritten pause list.",
    offer: "A Wednesday packing list with a member pause link",
    price: "$120 a season",
    funnel: [
      "They see a sample packing sheet",
      "They load this week’s members",
      "They pay for the season",
    ],
    channel: "A regional organic farming association",
  },
  studiohold: {
    customer: "Nora Blake, private music teacher with 20 students",
    pain: "Empty hours happen because the cancellation rule was never accepted in writing.",
    offer: "A deposit link and a calendar and a marketplace",
    price: "$15 a month",
    funnel: [
      "They see the plain-language rule",
      "A parent accepts it",
      "They pay the setup fee",
    ],
    channel: "A local music teachers facebook group",
  },
  nightfolio: {
    customer: "Chris Adeyemi, night manager of a boutique hotel under forty rooms",
    pain: "Morning inherits a night audit that does not say which exceptions are still open.",
    offer: "A night-audit exception card the morning manager can clear",
    price: "$99 a month",
    funnel: [
      "They read a sample exception card",
      "They clear one real night",
      "They pay the property seat",
    ],
    channel: "A boutique hotel owners facebook group",
  },
  "site-photo-checklist": {
    customer: "Andre Walsh, owner of a residential electrical shop with four technicians",
    pain: "Quotes go out with photos that miss the panel label and the main breaker.",
    offer: "A one-page shot list printed before the site visit",
    price: "$18",
    funnel: [
      "They see the shot list",
      "They print it for one job",
      "They pay eighteen dollars for the file",
    ],
    channel: "Electrician Talk forum",
  },
  "intake-bench": {
    customer: "labs",
    pain: "slow intake",
    offer: "software",
    price: "later",
    funnel: ["look"],
    channel: "online",
  },
};

export function sampleFacts(slug: string): FocusFacts | null {
  return SAMPLES[slug] ?? null;
}

export function checklistForSlug(slug: string) {
  const facts = SAMPLES[slug];
  if (!facts) {
    return scoreFocus(
      { customer: "", pain: "", offer: "", price: "", funnel: [], channel: "" },
      "SAMPLE",
    );
  }
  return scoreFocus(facts, "SAMPLE");
}
