import type { SearchResult } from "./types";

/**
 * Web search using DuckDuckGo HTML (no API key needed)
 */
export async function searchWeb(query: string, maxResults = 10): Promise<SearchResult[]> {
  try {
    const results = await searchDuckDuckGo(query, maxResults);
    if (results.length > 0) return results;
    throw new Error("DDG returned 0 results (likely Captcha)");
  } catch (error) {
    console.warn(`[search] DuckDuckGo failed: ${error}`);
    // Fallback: try SearXNG
    try {
      const results = await searchSearXNG(query, maxResults);
      if (results.length > 0) return results;
      throw new Error("SearXNG returned 0 results");
    } catch (searxngError) {
      throw new Error(`All search engines failed. DDG Error: ${error}. SearXNG Error: ${searxngError}`);
    }
  }
}

async function searchDuckDuckGo(query: string, maxResults: number): Promise<SearchResult[]> {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `q=${encodeURIComponent(query)}`,
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });

  if (!response.ok) throw new Error(`DDG ${response.status}`);

  const html = await response.text();
  return parseDDGResults(html, maxResults);
}

function parseDDGResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = [];

  // Match result blocks: <a class="result__a" href="...">title</a> + <a class="result__snippet">snippet</a>
  const linkRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;

  const links: { url: string; title: string }[] = [];
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(html)) !== null) {
    const rawUrl = match[1];
    const title = match[2].replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();

    // DDG wraps URLs in a redirect — extract actual URL
    let url = rawUrl;
    const uddgMatch = rawUrl.match(/uddg=([^&]+)/);
    if (uddgMatch) {
      url = decodeURIComponent(uddgMatch[1]);
    }

    if (url.startsWith("http") && title) {
      links.push({ url, title });
    }
  }

  const snippets: string[] = [];
  while ((match = snippetRegex.exec(html)) !== null) {
    const snippet = match[1].replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
    snippets.push(snippet);
  }

  for (let i = 0; i < Math.min(links.length, maxResults); i++) {
    results.push({
      title: links[i].title,
      url: links[i].url,
      snippet: snippets[i] ?? "",
      source: "duckduckgo",
    });
  }

  return results;
}

async function searchSearXNG(query: string, maxResults: number): Promise<SearchResult[]> {
  const instances = [
    "https://search.ononoki.org",
    "https://searx.tiekoetter.com",
    "https://search.bus-hit.me",
  ];

  for (const instance of instances) {
    try {
      const url = new URL("/search", instance);
      url.searchParams.set("q", query);
      url.searchParams.set("format", "json");
      url.searchParams.set("categories", "general");

      const response = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(10_000),
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
      console.warn(`[search] SearXNG instance ${instance} failed: ${error}`);
      // Try next instance
    }
  }

  throw new Error("All SearXNG instances failed or returned 0 results");
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
    // Small delay between queries to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return allResults;
}
