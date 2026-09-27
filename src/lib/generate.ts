import type { FounderProfile } from "./founder-fit";

export type GeneratedCard = {
  title: string;
  summary: string;
  customer: string;
  wedge: string;
  keyword: string;
  sample: true;
};

export function generateIdeaCards(profile: FounderProfile | null, seed?: string): GeneratedCard[] {
  const topic = (seed || profile?.industries[0] || "independent operators").trim();
  const customer =
    profile?.model === "b2c" ? `households dealing with ${topic}` : `small operators who handle ${topic} by hand`;
  const hours = profile?.weeklyHours ?? 10;
  return [
    {
      title: `${capitalize(topic)} desk`,
      summary: `A single screen that turns the messy input around ${topic} into one sendable artifact. Sized for ${hours} hours a week.`,
      customer,
      wedge: "Software seat after a manual pilot.",
      keyword: `${topic} software`,
      sample: true,
    },
    {
      title: `${capitalize(topic)} service`,
      summary: `Sell the artifact done-for-you before any product code. Five deliveries will show whether ${customer} will pay.`,
      customer,
      wedge: "Service first.",
      keyword: `${topic} service`,
      sample: true,
    },
    {
      title: `${capitalize(topic)} watch`,
      summary: `A weekly digest of public complaints and job posts about ${topic}, each row linking to the page it came from.`,
      customer,
      wedge: "Research product, not a workflow tool.",
      keyword: `${topic} problems`,
      sample: true,
    },
  ];
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
