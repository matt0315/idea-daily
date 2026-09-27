export const alphabetDemand = {
  name: "Alphabet Demand",
  blurb:
    "Type a niche. The miner asks an autocomplete source for every letter, digit, and a few question prefixes, then groups the phrases into questions, problems, and desires.",
} as const;

export const IDEA_TYPE_LABEL = {
  SAAS: "Startup / SaaS",
  APP: "App",
  DIGITAL: "Digital product",
} as const;

export type IdeaTypeCode = keyof typeof IDEA_TYPE_LABEL;

export function ideaTypeLabel(type: string): string {
  if (type === "APP") return IDEA_TYPE_LABEL.APP;
  if (type === "DIGITAL") return IDEA_TYPE_LABEL.DIGITAL;
  return IDEA_TYPE_LABEL.SAAS;
}
