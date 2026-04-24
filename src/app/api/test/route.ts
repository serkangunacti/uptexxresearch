import { NextResponse } from "next/server";
import { minimaxIsConfigured } from "@/lib/env";
import { searchWeb } from "@/lib/search";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Test endpoint: checks search + MiniMax connectivity
export async function GET() {
  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    minimaxConfigured: minimaxIsConfigured(),
  };

  // Test 1: Web search
  try {
    const searchResults = await searchWeb("Uptexx IT consulting", 3);
    results.search = {
      ok: searchResults.length > 0,
      count: searchResults.length,
      sample: searchResults[0] ?? null,
    };
  } catch (error) {
    results.search = {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  // Test 2: MiniMax API (simple ping)
  if (minimaxIsConfigured()) {
    try {
      const { env } = await import("@/lib/env");
      const OpenAI = (await import("openai")).default;
      const client = new OpenAI({ apiKey: env.MINIMAX_API_KEY, baseURL: env.MINIMAX_BASE_URL });
      const response = await client.chat.completions.create({
        model: env.MINIMAX_MODEL,
        messages: [{ role: "user", content: "Say OK" }],
        max_tokens: 5,
      });
      results.minimax = {
        ok: true,
        model: env.MINIMAX_MODEL,
        response: response.choices[0]?.message?.content ?? "",
      };
    } catch (error) {
      results.minimax = {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  } else {
    results.minimax = { ok: false, error: "MINIMAX_API_KEY not configured" };
  }

  return NextResponse.json(results);
}
