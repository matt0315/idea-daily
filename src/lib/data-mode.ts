/** True when the deployment should label figures as sample data. */
export function isSampleMode(): boolean {
  const flag = process.env.IDEADAILY_DATA_MODE;
  if (flag === "live") return false;
  if (flag === "sample") return true;
  const hasLlm = Boolean(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.GEMINI_API_KEY);
  const hasVolume = Boolean(process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD);
  return !(hasLlm && hasVolume);
}

export function integrationStatus() {
  return {
    llm: Boolean(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.GEMINI_API_KEY),
    dataforseo: Boolean(process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD),
    youtube: Boolean(process.env.YOUTUBE_API_KEY),
    productHunt: Boolean(process.env.PRODUCTHUNT_TOKEN),
    search: Boolean(process.env.TAVILY_API_KEY || process.env.BRAVE_SEARCH_API_KEY || process.env.EXA_API_KEY),
    stripe: Boolean(process.env.STRIPE_SECRET_KEY),
    resend: Boolean(process.env.RESEND_API_KEY),
    inngest: Boolean(process.env.INNGEST_EVENT_KEY),
    hackerNews: true,
    appleRss: true,
    sampleMode: isSampleMode(),
  };
}
