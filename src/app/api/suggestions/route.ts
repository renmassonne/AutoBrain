import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { FALLBACK_SUGGESTIONS } from "@/lib/templates";
import type { Suggestion } from "@/lib/suggestionMeta";
import {
  SUGGESTION_CATEGORIES,
  ALLOWED_ICON_NAMES,
  buildSuggestionsSystemPrompt,
  normalizeSuggestionIcon,
} from "@/lib/suggestionMeta";

const SYSTEM_PROMPT = buildSuggestionsSystemPrompt();

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
  const icon = normalizeSuggestionIcon(iconRaw);
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
  userLines.push(`Allowed icons: ${ALLOWED_ICON_NAMES.join(", ")}.`);

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
