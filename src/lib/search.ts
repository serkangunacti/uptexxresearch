import type { SearchResult } from "./types";

export async function searchWeb(query: string, maxResults = 10): Promise<SearchResult[]> {
  const tavilyKey = process.env.TAVILY_API_KEY;

  if (!tavilyKey) {
    throw new Error("TAVILY_API_KEY bulunamadı. Lütfen Vercel'e ekleyin.");
  }

  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: tavilyKey,
        query,
        search_depth: "basic",
        max_results: maxResults,
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
    }));
  } catch (error) {
    throw new Error(`Web search failed: ${error}`);
  }
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
      throw error; // Fail fast if API key is missing
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return allResults;
}
