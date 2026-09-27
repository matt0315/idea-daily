/** Our framework names. Do not swap these for anyone else's labels. */
export const FRAMEWORKS = {
  positionMap: "Position Map",
  signalTriangle: "Signal Triangle",
  offerLadder: "Offer Ladder",
  axes: {
    audience: "Audience reach",
    community: "Community heat",
    offer: "Offer clarity",
  },
} as const;

export type PositionName =
  | "Breakthrough"
  | "Category Leader"
  | "Quiet Niche"
  | "Crowded Commodity";

/** Uniqueness × value, each 1–10. High is 6 or above. */
export function positionLabel(uniqueness: number, value: number): PositionName {
  const hiU = uniqueness >= 6;
  const hiV = value >= 6;
  if (hiU && hiV) return "Breakthrough";
  if (!hiU && hiV) return "Category Leader";
  if (hiU && !hiV) return "Quiet Niche";
  return "Crowded Commodity";
}
