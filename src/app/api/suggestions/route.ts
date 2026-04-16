import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { FALLBACK_SUGGESTIONS, type Suggestion } from "@/lib/templates";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const SUGGESTION_CATEGORIES = [
  "Finance",
  "Health",
  "Productivity",
  "Science",
  "Daily life",
  "Business",
] as const;

export type SuggestionCategory = (typeof SUGGESTION_CATEGORIES)[number];

const ALLOWED_ICONS = [
  "Wallet",
  "Heart",
  "Landmark",
  "ArrowLeftRight",
  "Receipt",
  "PiggyBank",
  "Calculator",
  "TrendingUp",
  "Clock",
  "Ruler",
  "Thermometer",
  "Car",
  "Home",
  "ShoppingCart",
  "Percent",
  "Timer",
  "Gauge",
  "Zap",
  "Beaker",
  "Briefcase",
];

const SYSTEM_PROMPT = `You are curating starter ideas for AutoBrain, an app that turns a natural-language prompt into an interactive calculator/tool. Generate short, concrete, varied tool ideas that a real person would actually find useful.

Return ONLY a JSON object in this exact shape:
{
  "suggestions": [
    {
      "title": "string - 2-4 words, no punctuation at the end",
      "description": "string - one line, max ~80 chars, describes the benefit",
      "prompt": "string - the actual prompt we will feed the generator. Write it as the user would, specifying inputs, what to calculate, and (if relevant) a chart.",
      "category": "one of: Finance | Health | Productivity | Science | Daily life | Business",
      "icon": "one of the allowed icon names (see list)"
    }
  ]
}

Rules:
- Return exactly the requested number of suggestions.
- No duplicates with each other and no duplicates of any titles in the "avoid" list.
- Prompts must be specific enough to drive a good schema (mention inputs + what to calculate).
- Prefer useful, everyday tools over gimmicks. Avoid anything requiring external data fetches.
- "icon" MUST be chosen from this whitelist: [${ALLOWED_ICONS.join(", ")}].
- If a category filter is given, every suggestion must match it.
- Return ONLY the JSON object.`;

interface CacheEntry {
  suggestions: Suggestion[];
  at: number;
}
const CACHE_TTL_MS = 60 * 60 * 1000; // 1h
const cache = new Map<string, CacheEntry>();

function cacheKey(category: string, seed: string, count: number): string {
  return `${category}|${seed}|${count}`;
}

function normalizeSuggestion(raw: unknown): Suggestion | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const title = typeof r.title === "string" ? r.title.trim() : "";
  const description =
    typeof r.description === "string" ? r.description.trim() : "";
  const prompt = typeof r.prompt === "string" ? r.prompt.trim() : "";
  const category =
    typeof r.category === "string" ? r.category.trim() : "Daily life";
  const iconRaw = typeof r.icon === "string" ? r.icon.trim() : "";
  const icon = ALLOWED_ICONS.includes(iconRaw) ? iconRaw : "Sparkles";
  if (!title || !description || !prompt) return null;
  return { title, description, prompt, category, icon };
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const category = (url.searchParams.get("category") || "").trim();
  const seed = (url.searchParams.get("seed") || "0").trim();
  const refresh = url.searchParams.get("refresh") === "1";
  const count = Math.min(
    Math.max(parseInt(url.searchParams.get("count") || "6", 10) || 6, 3),
    10
  );
  const avoidParam = (url.searchParams.get("avoid") || "").trim();
  const avoid = avoidParam
    ? avoidParam.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 20)
    : [];

  const key = cacheKey(category || "any", seed, count);
  if (!refresh) {
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
      return NextResponse.json({
        suggestions: hit.suggestions,
        cached: true,
        source: "cache",
      });
    }
  }

  if (!process.env.OPENAI_API_KEY) {
    // Fall back to the static list if no key (dev UX).
    const filtered = filterFallback(FALLBACK_SUGGESTIONS, category, count);
    return NextResponse.json({
      suggestions: filtered,
      cached: false,
      source: "fallback-no-key",
    });
  }

  const userLines: string[] = [];
  userLines.push(`Generate ${count} starter tool ideas.`);
  if (category) {
    userLines.push(`Category filter: ${category}`);
  } else {
    userLines.push(
      `Spread across categories: ${SUGGESTION_CATEGORIES.join(", ")}.`
    );
  }
  userLines.push(`Variety seed: ${seed}. Use it to vary from prior sets.`);
  if (avoid.length > 0) {
    userLines.push(`Avoid these titles: ${avoid.join(", ")}.`);
  }
  userLines.push(`Allowed icons: ${ALLOWED_ICONS.join(", ")}.`);

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userLines.join("\n") },
      ],
      temperature: 0.9,
    });

    const content = completion.choices[0]?.message?.content?.trim() ?? "";
    if (!content) throw new Error("empty");

    const parsed = JSON.parse(content) as { suggestions?: unknown };
    const list = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
    const normalized: Suggestion[] = list
      .map(normalizeSuggestion)
      .filter((s): s is Suggestion => !!s);

    if (normalized.length === 0) throw new Error("no valid suggestions");

    cache.set(key, { suggestions: normalized, at: Date.now() });

    return NextResponse.json({
      suggestions: normalized,
      cached: false,
      source: "ai",
    });
  } catch (e) {
    console.error("[suggestions] error:", e);
    const filtered = filterFallback(FALLBACK_SUGGESTIONS, category, count);
    return NextResponse.json({
      suggestions: filtered,
      cached: false,
      source: "fallback-error",
    });
  }
}

function filterFallback(
  list: Suggestion[],
  category: string,
  count: number
): Suggestion[] {
  const filtered = category
    ? list.filter((s) => s.category.toLowerCase() === category.toLowerCase())
    : list;
  const pool = filtered.length > 0 ? filtered : list;
  return pool.slice(0, count);
}
