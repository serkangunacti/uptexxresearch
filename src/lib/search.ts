import type { SearchResult } from "./types";

const PUBLIC_SEARXNG_INSTANCES = [
  "https://search.ononoki.org",
  "https://searx.tiekoetter.com",
  "https://search.bus-hit.me",
];

export async function searchWeb(query: string, maxResults = 10): Promise<SearchResult[]> {
  // Try SearXNG public instances
  for (const instance of PUBLIC_SEARXNG_INSTANCES) {
    try {
      const results = await searchSearXNG(instance, query, maxResults);
      if (results.length > 0) return results;
    } catch {
      // Try next instance
    }
  }

  // Fallback: return empty results
  console.warn(`[search] No results for: "${query}"`);
  return [];
}

async function searchSearXNG(baseUrl: string, query: string, maxResults: number): Promise<SearchResult[]> {
  const url = new URL("/search", baseUrl);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("categories", "general");
  url.searchParams.set("language", "auto");

  const response = await fetch(url.toString(), {
    headers: { "Accept": "application/json" },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) throw new Error(`SearXNG ${response.status}`);

  const data = await response.json();
  const results: SearchResult[] = (data.results ?? [])
    .slice(0, maxResults)
    .map((r: { title?: string; url?: string; content?: string; engine?: string }) => ({
      title: r.title ?? "",
      url: r.url ?? "",
      snippet: r.content ?? "",
      source: r.engine ?? "searxng",
    }));

  return results;
}

export async function searchAllQueries(queries: string[]): Promise<SearchResult[]> {
  const allResults: SearchResult[] = [];
  const seen = new Set<string>();

  for (const query of queries) {
    const results = await searchWeb(query, 5);
    for (const result of results) {
      if (!seen.has(result.url)) {
        seen.add(result.url);
        allResults.push(result);
      }
    }
  }

  return allResults;
}
