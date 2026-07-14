import { readFileSync } from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { openRouterChat, ChatMessage } from "@/lib/openrouter";

// Load the Agent Skill once per cold start. Same SKILL.md format used by
// Claude Code / Cowork — reusing it here means the skill can also be
// dropped straight into an agent harness for the "Agent Skills" track.
function loadSkillPrompt(): string {
  const skillPath = path.join(process.cwd(), "lib/skills/world-cup-analyst/SKILL.md");
  return readFileSync(skillPath, "utf-8");
}

export async function POST(req: NextRequest) {
  const { messages, matchContext } = (await req.json()) as {
    messages: ChatMessage[];
    matchContext?: unknown;
  };

  const skill = loadSkillPrompt();
  const systemPrompt = `${skill}\n\n---\nCurrent match context (if any):\n${
    matchContext ? JSON.stringify(matchContext) : "none provided"
  }`;

  try {
    const reply = await openRouterChat([{ role: "system", content: systemPrompt }, ...messages]);
    return NextResponse.json({ reply });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Chat request failed" },
      { status: 500 }
    );
  }
}
