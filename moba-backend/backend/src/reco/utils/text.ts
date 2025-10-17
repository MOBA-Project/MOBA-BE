export function normalizeText(s: string): string {
  return (s || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ') // keep letters/digits/space
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenize(s: string): string[] {
  const n = normalizeText(s);
  const parts = n.split(' ');
  return parts.filter((w) => w.length >= 2 && w.length <= 30);
}

export function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

export function buildMovieTerms(args: {
  overview?: string;
  keywords?: string[];
  cast?: string[];
  director?: string;
}): string[] {
  const kw = (args.keywords || []).map((k) => normalizeText(k).replace(/\s+/g, '_')).filter(Boolean);
  const people = [
    ...(args.cast || []).map((c) => normalizeText(c).replace(/\s+/g, '_')),
    ...(args.director ? [normalizeText(args.director).replace(/\s+/g, '_')] : []),
  ].filter(Boolean);
  const overviewTokens = tokenize(args.overview || '');
  return unique([...kw, ...people, ...overviewTokens]);
}

export type TermWeight = { term: string; weight: number };

export function tfidfWeights(terms: string[], dfLookup: (term: string) => number, docCount: number, topN = 50): TermWeight[] {
  if (!terms.length || docCount <= 0) return [];
  const tf = new Map<string, number>();
  for (const t of terms) tf.set(t, (tf.get(t) || 0) + 1);
  const weights: TermWeight[] = [];
  for (const [term, freq] of tf.entries()) {
    const df = Math.max(0, dfLookup(term) || 0);
    const idf = Math.log((docCount + 1) / (df + 1)) + 1; // smoothing
    weights.push({ term, weight: (freq / terms.length) * idf });
  }
  weights.sort((a, b) => b.weight - a.weight);
  return weights.slice(0, topN);
}

export function cosineFromWeights(a: TermWeight[], b: TermWeight[]): number {
  if (!a.length || !b.length) return 0;
  const mapA = new Map(a.map((x) => [x.term, x.weight] as const));
  const mapB = new Map(b.map((x) => [x.term, x.weight] as const));
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (const w of mapA.values()) normA += w * w;
  for (const w of mapB.values()) normB += w * w;
  const iter = mapA.size < mapB.size ? mapA : mapB;
  const other = iter === mapA ? mapB : mapA;
  for (const [term, wa] of iter.entries()) {
    const wb = other.get(term) || 0;
    dot += wa * wb;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom > 0 ? dot / denom : 0;
}

