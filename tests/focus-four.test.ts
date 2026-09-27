import { describe, expect, it } from "vitest";
import { brand } from "../src/lib/brand";
import { checklistForSlug } from "../src/lib/focus-samples";
import { checklistFromIdeaFields, judgeChannel, judgeCustomer, judgeFunnel, judgeOffer, scoreFocus } from "../src/lib/focus";

const passFacts = {
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
};

describe("Focus Four scoring", () => {
  it("passes only when a named person, one price, a short paid path, and one room are all present", () => {
    const checklist = scoreFocus(passFacts, "SAMPLE");
    expect(checklist.name).toBe(brand.focusName);
    expect(checklist.passedCount).toBe(4);
    expect(checklist.verdict).toBe("pass");
    expect(checklist.dataMode).toBe("SAMPLE");
    expect(checklist.checks.map((check) => check.passed)).toEqual([true, true, true, true]);
  });

  it("rejects a market, a missing price, a short path, and a generic channel", () => {
    expect(judgeCustomer("restaurants", "Plates are priced from memory and the spreadsheet is a month behind.").passed).toBe(false);
    expect(judgeCustomer("founders", "They cannot pick an idea and keep starting over every Monday.").passed).toBe(false);
    expect(judgeOffer("A quoting desk that turns one panel photo into a one-page quote", "Set after the first paid pilot").passed).toBe(false);
    expect(judgeOffer("A deposit link and a calendar and a marketplace", "$15 a month").passed).toBe(false);
    expect(judgeOffer("software", "$18").passed).toBe(false);
    expect(judgeFunnel(["They hear about the alert", "They pay the concierge month"]).passed).toBe(false);
    expect(judgeFunnel(["look"]).passed).toBe(false);
    expect(judgeChannel("social media").passed).toBe(false);
    expect(judgeChannel("online").passed).toBe(false);
    expect(judgeChannel("Electrician Talk forum").passed).toBe(true);
  });

  it("drops the verdict to needs-work when any one check fails", () => {
    const checklist = scoreFocus({ ...passFacts, price: "Set after the first paid pilot" }, "SAMPLE");
    expect(checklist.passedCount).toBe(3);
    expect(checklist.verdict).toBe("needs-work");
    expect(checklist.checks.find((check) => check.key === "offer")?.passed).toBe(false);
    expect(checklist.checks.find((check) => check.key === "offer")?.rationale).toMatch(/single price/);
  });

  it("scores the seeded ideas the way the archive should read", () => {
    expect(checklistForSlug("quotelatch").verdict).toBe("pass");
    expect(checklistForSlug("crateday").passedCount).toBe(4);
    expect(checklistForSlug("nightfolio").passedCount).toBe(4);
    expect(checklistForSlug("site-photo-checklist").passedCount).toBe(4);
    expect(checklistForSlug("dockboard").checks.find((check) => check.key === "offer")?.passed).toBe(false);
    expect(checklistForSlug("kennelnote").checks.find((check) => check.key === "channel")?.passed).toBe(false);
    expect(checklistForSlug("menumargin").checks.find((check) => check.key === "customer")?.passed).toBe(false);
    expect(checklistForSlug("permitping").checks.find((check) => check.key === "funnel")?.passed).toBe(false);
    expect(checklistForSlug("studiohold").checks.find((check) => check.key === "offer")?.passed).toBe(false);
    expect(checklistForSlug("intake-bench").passedCount).toBe(0);
  });

  it("does not pass a pipeline-shaped target that only names operators", () => {
    const checklist = checklistFromIdeaFields({
      title: "Quote desk",
      summary: "Software that finishes a quoting chore.",
      target: "Operators who currently handle the chore by hand.",
      offerDetail: "Do not invent a price. Use the manual offer until interviews set it.",
      price: "Do not invent a price.",
      channel: "",
      executionPlan: "Capture the inputs. Produce one artifact.",
    });
    expect(checklist.dataMode).toBe("SAMPLE");
    expect(checklist.verdict).toBe("needs-work");
    expect(checklist.checks.find((check) => check.key === "customer")?.passed).toBe(false);
  });
});
