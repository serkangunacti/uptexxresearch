import type { SearchResult } from "./types";

export async function searchWeb(query: string, maxResults = 10): Promise<SearchResult[]> {
  // We skip DuckDuckGo HTML because it blocks Vercel IPs with Captchas.
  // Instead, we fetch a list of SearXNG instances and try them dynamically.
  try {
    return await searchSearXNG(query, maxResults);
  } catch (error) {
    throw new Error(`Web search failed: ${error}`);
  }
}

async function fetchSearXNGInstances(): Promise<string[]> {
  try {
    const response = await fetch("https://searx.space/data/instances.json", {
      next: { revalidate: 3600 }, // Cache for 1 hour
    });
    if (!response.ok) return fallbackInstances;

    const data = await response.json();
    const instances = Object.entries(data.instances)
      .filter(([_, info]: [string, any]) => 
        info.network_type === "normal" && 
        info.up === true && 
        info.timing?.search?.all?.median < 2.0
      )
      .map(([url]) => url);
      
    // Return top 15 fastest instances
    return instances.slice(0, 15);
  } catch {
    return fallbackInstances;
  }
}

const fallbackInstances = [
  "https://search.ononoki.org/",
  "https://searx.tiekoetter.com/",
  "https://search.bus-hit.me/",
  "https://searx.roflcopter.fr/",
  "https://searx.be/",
  "https://baresearch.org/"
];

async function searchSearXNG(query: string, maxResults: number): Promise<SearchResult[]> {
  const instances = await fetchSearXNGInstances();

  for (const instance of instances) {
    try {
      const url = new URL("search", instance);
      url.searchParams.set("q", query);
      url.searchParams.set("format", "json");
      url.searchParams.set("categories", "general");

      const response = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(5_000), // Fast fail so we can try the next one quickly
        cache: "no-store",
      });

      if (!response.ok) continue;

      const data = await response.json();
      const results: SearchResult[] = (data.results ?? [])
        .slice(0, maxResults)
        .map((r: { title?: string; url?: string; content?: string; engine?: string }) => ({
          title: r.title ?? "",
          url: r.url ?? "",
          snippet: r.content ?? "",
          source: r.engine ?? "searxng",
        }));

      if (results.length > 0) return results;
    } catch (error) {
      // Ignore and try the next instance
    }
  }

  throw new Error("Tüm SearXNG arama sunucuları yanıt vermedi veya engellendi.");
}

export async function searchAllQueries(queries: string[]): Promise<SearchResult[]> {
  const allResults: SearchResult[] = [];
  const seen = new Set<string>();

  for (const query of queries) {
    try {
      const results = await searchWeb(query, 5);
      for (const result of results) {
        if (!seen.has(result.url)) {
          seen.add(result.url);
          allResults.push(result);
        }
      }
    } catch (error) {
      console.error(`[search] Failed for query: ${query}`, error);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return allResults;
}
