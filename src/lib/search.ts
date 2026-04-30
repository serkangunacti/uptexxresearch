import type { SearchResult } from "./types";
import { env } from "./env";

export async function searchWeb(
  query: string,
  maxResults = 10,
  maxAgeDays = 7
): Promise<SearchResult[]> {
  if (!env.TAVILY_API_KEY) {
    throw new Error("TAVILY_API_KEY bulunamadı. Lütfen Vercel'e ekleyin.");
  }

  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: env.TAVILY_API_KEY,
        query,
        search_depth: "basic",
        max_results: maxResults,
        topic: "news",
        days: maxAgeDays,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Tavily API hatası: ${response.statusText}`);
    }

    const data = await response.json();
    return (data.results || []).map((r: any) => ({
      title: r.title,
      url: r.url,
      snippet: r.content,
      source: "tavily",
      publishedAt: r.published_date ?? r.published_at ?? r.date ?? null,
    }));
  } catch (error) {
    throw new Error(`Web search failed: ${error}`);
  }
}

export async function searchAllQueries(queries: string[], maxAgeDays = 7): Promise<SearchResult[]> {
  const allResults: SearchResult[] = [];
  const seen = new Set<string>();

  const searchPromises = queries.map(async (query) => {
    try {
      return await searchWeb(query, 15, maxAgeDays);
    } catch (error) {
      console.error(`[search] Failed for query: ${query}`, error);
      throw error; // Fail fast if API key is missing
    }
  });

  const resultsArrays = await Promise.all(searchPromises);

  for (const results of resultsArrays) {
    for (const result of results) {
      if (!seen.has(result.url)) {
        seen.add(result.url);
        allResults.push(result);
      }
    }
  }

  return allResults;
}
