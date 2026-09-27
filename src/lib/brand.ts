/**
 * Single source for the product name. Rename the product here.
 * Do not hardcode the brand string in components.
 */
export const brand = {
  name: "IdeaDaily",
  tagline: "The daily startup idea, with receipts.",
  description:
    "One sourced startup idea each day, a filterable archive, trend cards, and build guides that carry the brief into the tool you already use.",
  methodologyPath: "/methodology",
  supportEmail: "hello@example.com",
  /** Named sign-off on the daily letter. */
  senderName: "Matt Smith",
  /**
   * Studio name in the letter footer.
   * A postal address can be added later if needed for US CAN-SPAM.
   */
  address: "Botland Studio",
  website: "https://botland.studio",
  /** Four-check pick-and-ship list. Rename the framework here. */
  focusName: "Focus Four",
} as const;
