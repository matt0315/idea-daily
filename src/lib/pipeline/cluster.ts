export type Signal = {
  source: "hackernews" | "producthunt" | "youtube" | "apple_rss" | "dataforseo" | "web_search" | "autocomplete";
  title: string;
  url: string;
  text: string;
  /** Relative importance inside its source. Higher is stronger. */
  score: number;
  capturedAt: string;
  sample: boolean;
};

export type Cluster = {
  id: string;
  signals: Signal[];
  label: string;
  score: number;
  sample: boolean;
};

const STOP = new Set([
  "the", "and", "for", "with", "that", "this", "from", "your", "you", "are", "was", "how", "what",
  "why", "into", "about", "have", "has", "not", "but", "its", "our", "their", "they", "will", "can",
  "new", "app", "just", "more", "than", "using", "use", "via", "per", "all", "any", "out", "get",
  "show", "hn", "best", "top", "free",
]);

export function tokens(value: string): Set<string> {
  const parts = value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((part) => part.length > 2 && !STOP.has(part));
  return new Set(parts);
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection += 1;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function signalText(signal: Signal): string {
  return `${signal.title} ${signal.text}`;
}

export function clusterSignals(signals: Signal[], threshold = 0.18): Cluster[] {
  const ordered = [...signals].sort((a, b) => b.score - a.score);
  const clusters: { tokens: Set<string>; signals: Signal[] }[] = [];

  for (const signal of ordered) {
    const own = tokens(signalText(signal));
    let bestIndex = -1;
    let bestScore = 0;
    clusters.forEach((cluster, index) => {
      const similarity = jaccard(own, cluster.tokens);
      if (similarity > bestScore) {
        bestScore = similarity;
        bestIndex = index;
      }
    });
    if (bestIndex >= 0 && bestScore >= threshold) {
      const cluster = clusters[bestIndex];
      cluster.signals.push(signal);
      for (const token of own) cluster.tokens.add(token);
    } else {
      clusters.push({ tokens: new Set(own), signals: [signal] });
    }
  }

  return clusters
    .map((cluster, index) => {
      const top = [...cluster.signals].sort((a, b) => b.score - a.score)[0];
      const score = cluster.signals.reduce((sum, signal) => sum + signal.score, 0);
      return {
        id: `cluster-${index + 1}`,
        signals: cluster.signals,
        label: top.title,
        score,
        sample: cluster.signals.every((signal) => signal.sample),
      };
    })
    .sort((a, b) => b.score - a.score);
}

export type Candidate = {
  title: string;
  keyword: string;
  signals: Signal[];
  sample: boolean;
  clusterScore: number;
};

export function selectCandidates(clusters: Cluster[], limit = 20): Candidate[] {
  return clusters.slice(0, limit).map((cluster) => {
    const keyword = keywordFromCluster(cluster);
    return {
      title: titleFromKeyword(keyword),
      keyword,
      signals: cluster.signals,
      sample: cluster.sample,
      clusterScore: cluster.score,
    };
  });
}

export function keywordFromCluster(cluster: Cluster): string {
  const counts = new Map<string, number>();
  for (const signal of cluster.signals) {
    for (const token of tokens(signalText(signal))) {
      counts.set(token, (counts.get(token) ?? 0) + 1);
    }
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const words = ranked.slice(0, 3).map(([word]) => word);
  return words.join(" ") || cluster.label.toLowerCase();
}

export function titleFromKeyword(keyword: string): string {
  return keyword
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
