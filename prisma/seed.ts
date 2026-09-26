import bcrypt from "bcryptjs";
import { queuedIdea, seedIdeaRecords } from "../src/content/ideas";
import { seedInsights, seedTrends } from "../src/content/trends";
import { db } from "../src/lib/db";
import { briefFromUnknown } from "../src/lib/build-guides";
import { buildResearchReport } from "../src/lib/research";
import { runSkill } from "../src/lib/skills";

const profile = {
  skills: { tech: 4, sales: 3, design: 2, domain: 3 },
  weeklyHours: 20,
  capitalBand: "low" as const,
  riskTolerance: "medium" as const,
  model: "b2b" as const,
  motion: "saas" as const,
  industries: ["trades"],
  location: "Melbourne",
};

async function main() {
  await db.advisorMessage.deleteMany();
  await db.usageLedger.deleteMany();
  await db.savedIdea.deleteMany();
  await db.galleryItem.deleteMany();
  await db.generatedIdea.deleteMany();
  await db.trendQuery.deleteMany();
  await db.researchReport.deleteMany();
  await db.project.deleteMany();
  await db.session.deleteMany();
  await db.pipelineRun.deleteMany();
  await db.subscriber.deleteMany();
  await db.trend.deleteMany();
  await db.insight.deleteMany();
  await db.idea.deleteMany();
  await db.user.deleteMany();

  const passwordHash = await bcrypt.hash("demo1234", 10);
  const [free, builder, pro, admin] = await Promise.all([
    db.user.create({ data: { email: "free@ideadaily.dev", name: "Free Demo", passwordHash, plan: "FREE" } }),
    db.user.create({ data: { email: "builder@ideadaily.dev", name: "Builder Demo", passwordHash, plan: "BUILDER", billingInterval: "MONTHLY", founderProfile: profile } }),
    db.user.create({ data: { email: "pro@ideadaily.dev", name: "Pro Demo", passwordHash, plan: "PRO", billingInterval: "ANNUAL", founderProfile: profile } }),
    db.user.create({ data: { email: "admin@ideadaily.dev", name: "Admin Demo", passwordHash, plan: "PRO", isAdmin: true, founderProfile: profile } }),
  ]);
  void free;
  void builder;
  void admin;

  for (const idea of [...seedIdeaRecords(), queuedIdea]) {
    await db.idea.create({ data: idea });
  }

  const { rows, dropped } = seedTrends();
  for (const row of rows) await db.trend.create({ data: row });
  for (const insight of seedInsights()) {
    await db.insight.create({ data: { ...insight, dataMode: "SAMPLE" } });
  }

  const quote = await db.idea.findUniqueOrThrow({ where: { slug: "quotelatch" } });
  const dock = await db.idea.findUniqueOrThrow({ where: { slug: "dockboard" } });

  await db.galleryItem.createMany({
    data: [
      {
        ideaId: quote.id,
        userId: pro.id,
        tool: "cursor",
        title: "Sample quote desk",
        url: "https://example.com/ideadaily-sample-quotelatch",
        blurb: "Sample gallery entry for layout preview. This is not a live product.",
        makerName: "Sample maker",
        status: "approved",
        dataMode: "SAMPLE",
      },
      {
        ideaId: quote.id,
        userId: pro.id,
        tool: "google-ai-studio",
        title: "Sample studio build",
        url: "https://example.com/ideadaily-sample-studio",
        blurb: "Sample gallery entry showing where a Google AI Studio build would be linked.",
        makerName: "Sample maker",
        status: "approved",
        dataMode: "SAMPLE",
      },
      {
        ideaId: dock.id,
        userId: pro.id,
        tool: "bolt",
        title: "Sample dock board",
        url: "https://example.com/ideadaily-sample-dockboard",
        blurb: "Sample gallery entry. Not a shipped app.",
        makerName: "Sample maker",
        status: "approved",
        dataMode: "SAMPLE",
      },
      {
        ideaId: quote.id,
        userId: builder.id,
        tool: "replit",
        title: "Pending sample submission",
        url: "https://example.com/ideadaily-sample-pending",
        blurb: "Waiting in the admin queue.",
        makerName: "Sample maker",
        status: "pending",
        dataMode: "SAMPLE",
      },
    ],
  });

  const reportBody = buildResearchReport(
    {
      description: "A shared dock calendar for warehouses with several tenants",
      customer: "Building managers at multi-tenant warehouses",
      country: "AU",
    },
    profile,
  );
  await db.researchReport.create({
    data: {
      userId: pro.id,
      title: reportBody.title,
      input: {
        description: "A shared dock calendar for warehouses with several tenants",
        customer: "Building managers at multi-tenant warehouses",
        country: "AU",
      },
      status: "complete",
      progress: ["keywords", "demand", "competition", "voice", "sizing", "verdict"],
      report: reportBody,
      verdict: reportBody.verdict,
      confidence: reportBody.confidence,
      dataMode: reportBody.dataMode,
    },
  });

  const skill = runSkill("offer", { brief: briefFromUnknown(quote.buildBrief, quote.title), weeklyHours: 20, archetype: "Systems Builder" });
  await db.project.create({
    data: {
      userId: pro.id,
      ideaId: quote.id,
      title: "QuoteLatch build",
      context: { archetype: "Systems Builder" },
      outputs: { offer: { markdown: skill.markdown, createdAt: new Date().toISOString() } },
    },
  });

  await db.subscriber.create({ data: { email: "reader@example.com" } });
  await db.pipelineRun.create({
    data: {
      kind: "seed",
      status: "completed",
      dataMode: "SAMPLE",
      log: { ideas: 9, trends: rows.length, droppedNoise: dropped },
    },
  });
}

main()
  .then(() => db.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await db.$disconnect();
    process.exit(1);
  });
