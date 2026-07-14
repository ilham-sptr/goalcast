/**
 * Thin client for OpenRouter's OpenAI-compatible chat completions API.
 * Docs: https://openrouter.ai/docs
 *
 * Free tier: sign up at https://openrouter.ai/keys, no credit card needed.
 * OPENROUTER_MODEL defaults to "openrouter/free", which auto-picks a free
 * model per request — resilient to individual free models rotating out.
 * Pin a specific model (e.g. "meta-llama/llama-3.3-70b-instruct:free") if
 * you want consistent behavior for a demo.
 */

export type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

export async function openRouterChat(messages: ChatMessage[], maxTokens = 800): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set — get a free key at https://openrouter.ai/keys");
  }
  const model = process.env.OPENROUTER_MODEL || "openrouter/free";

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      // Optional but recommended by OpenRouter for their leaderboard/analytics:
      "HTTP-Referer": "https://goalcast.app",
      "X-Title": "GoalCast",
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenRouter request failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error(`OpenRouter returned no content: ${JSON.stringify(data)}`);
  }
  return text as string;
}
