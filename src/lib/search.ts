import { env } from "./env";
import type { SearchResult } from "./types";

type SearxngResult = {
  title?: string;
  url?: string;
  content?: string;
  engine?: string;
};

export async function searchWeb(query: string, limit = 6): Promise<SearchResult[]> {
  const url = new URL("/search", env.SEARXNG_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("language", "auto");
  url.searchParams.set("safesearch", "0");

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(20_000)
    });

    if (!response.ok) {
      throw new Error(`SearXNG returned ${response.status}`);
    }

    const data = (await response.json()) as { results?: SearxngResult[] };
    return (data.results ?? [])
      .filter((item) => item.title && item.url)
      .slice(0, limit)
      .map((item) => ({
        title: item.title ?? "Untitled source",
        url: item.url ?? "",
        snippet: item.content ?? "",
        source: item.engine ?? "searxng"
      }));
  } catch (error) {
    console.warn(`[search] ${query}:`, error);
    return [];
  }
}

export async function searchMany(queries: string[], perQueryLimit = 4) {
  const batches = await Promise.all(queries.map((query) => searchWeb(query, perQueryLimit)));
  const seen = new Set<string>();
  return batches
    .flat()
    .filter((result) => {
      if (seen.has(result.url)) return false;
      seen.add(result.url);
      return true;
    })
    .slice(0, 20);
}
