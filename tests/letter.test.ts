import { describe, expect, it } from "vitest";
import { brand } from "../src/lib/brand";
import { scoreFocus } from "../src/lib/focus";
import { renderLetterHtml, templateLetter } from "../src/lib/letter";

const checklist = scoreFocus(
  {
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
  "SAMPLE",
);

describe("daily letter", () => {
  const letter = templateLetter({
    title: "QuoteLatch <script>",
    slug: "quotelatch",
    summary: "A quoting desk.",
    checklist,
    publishedAt: new Date("2026-09-26T06:00:00.000Z"),
  });

  it("keeps the letter order and our own wording", () => {
    expect(letter.problems.length).toBeGreaterThanOrEqual(1);
    expect(letter.problems.length).toBeLessThanOrEqual(2);
    expect(letter.frameworkName).toBe(brand.focusName);
    expect(letter.senderName).toBe(brand.senderName);
    expect(letter.ps).toMatch(/Founder Fit/);
    expect(`${letter.opener} ${letter.takeaway} ${letter.frameworkIntro}`).not.toMatch(/1-1-1-1|vibe island/i);
    const html = renderLetterHtml(letter, {
      unsubscribeUrl: "https://example.com/unsub?token=abc",
      preferencesUrl: "https://example.com/prefs?token=abc",
      showPs: true,
      scheme: "auto",
    });
    const at = (needle: string) => html.indexOf(needle);
    expect(at(letter.opener)).toBeGreaterThan(0);
    expect(at(letter.opener)).toBeLessThan(at(letter.problems[0]));
    expect(at(letter.problems[0])).toBeLessThan(at(letter.frameworkName));
    expect(at(letter.frameworkName)).toBeLessThan(at("Today:"));
    expect(at("One customer — Yes.")).toBeGreaterThan(at("Today:"));
    expect(at("The four checks already have a sentence each.")).toBeGreaterThan(at("One channel — Yes."));
    expect(at("/ideas/quotelatch")).toBeGreaterThan(at("The four checks already have a sentence each."));
    expect(at(brand.senderName)).toBeGreaterThan(at("/ideas/quotelatch"));
    expect(at("Founder Fit")).toBeGreaterThan(at(brand.senderName));
    expect(at("https://example.com/unsub?token=abc")).toBeGreaterThan(at("Founder Fit"));
    expect(at(brand.address)).toBeGreaterThan(at("https://example.com/unsub?token=abc"));
    expect(html).toContain("QuoteLatch &lt;script&gt;");
    expect(html).not.toContain("QuoteLatch <script>");
  });

  it("renders light and dark treatments and can hide the fit PS", () => {
    const dark = renderLetterHtml(letter, {
      unsubscribeUrl: "https://example.com/unsub",
      preferencesUrl: "https://example.com/prefs",
      showPs: false,
      scheme: "dark",
    });
    const light = renderLetterHtml(letter, {
      unsubscribeUrl: "https://example.com/unsub",
      preferencesUrl: "https://example.com/prefs",
      showPs: true,
      scheme: "light",
    });
    expect(dark).toContain("force-dark");
    expect(dark).toContain("prefers-color-scheme: dark");
    expect(dark).toContain('color-scheme" content="light dark"');
    expect(dark).not.toContain("Founder Fit");
    expect(light).toContain("force-light");
    expect(light).toContain("<table");
    expect(light).toContain("Founder Fit");
  });

  it("names the failed checks in a needs-work takeaway", () => {
    const wobble = templateLetter({
      title: "Dockboard",
      slug: "dockboard",
      summary: "A shared dock board.",
      checklist: scoreFocus(
        {
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
        "SAMPLE",
      ),
    });
    expect(wobble.problems.some((line) => line.toLowerCase().includes("price"))).toBe(true);
    expect(wobble.takeaway.toLowerCase()).toContain("one offer");
    const html = renderLetterHtml(wobble, {
      unsubscribeUrl: "https://example.com/unsub",
      preferencesUrl: "https://example.com/prefs",
      showPs: true,
    });
    expect(html).toContain("One offer — No.");
    expect(html).toContain("One customer — Yes.");
  });
});
