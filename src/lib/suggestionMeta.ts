import type { LucideIcon } from "lucide-react";
import {
  Wallet,
  Heart,
  Landmark,
  ArrowLeftRight,
  Receipt,
  PiggyBank,
  Calculator,
  TrendingUp,
  Clock,
  Ruler,
  Thermometer,
  Car,
  Home,
  ShoppingCart,
  Percent,
  Timer,
  Gauge,
  Zap,
  Beaker,
  Briefcase,
} from "lucide-react";

export interface Suggestion {
  title: string;
  description: string;
  prompt: string;
  category: string;
  icon: string;
}

export const SUGGESTION_CATEGORIES = [
  "Finance",
  "Health",
  "Productivity",
  "Science",
  "Daily life",
  "Business",
] as const;

export type SuggestionCategory = (typeof SUGGESTION_CATEGORIES)[number];

/** Whitelist for AI-generated suggestion icons (must match normalize fallback). */
export const ALLOWED_ICON_NAMES = [
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
] as const;

export type AllowedIconName = (typeof ALLOWED_ICON_NAMES)[number];

export const ICON_MAP: Record<string, LucideIcon> = {
  Wallet,
  Heart,
  Landmark,
  ArrowLeftRight,
  Receipt,
  PiggyBank,
  Calculator,
  TrendingUp,
  Clock,
  Ruler,
  Thermometer,
  Car,
  Home,
  ShoppingCart,
  Percent,
  Timer,
  Gauge,
  Zap,
  Beaker,
  Briefcase,
};

/** UI chip list: All + each API category */
export const TEMPLATE_UI_CATEGORIES = [
  "All",
  ...SUGGESTION_CATEGORIES,
] as const;

export function buildSuggestionsSystemPrompt(): string {
  return `You are curating starter ideas for AutoBrain, an app that turns a natural-language prompt into an interactive calculator/tool. Generate short, concrete, varied tool ideas that a real person would actually find useful.

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
- "icon" MUST be chosen from this whitelist: [${ALLOWED_ICON_NAMES.join(", ")}].
- If a category filter is given, every suggestion must match it.
- Return ONLY the JSON object.`;
}

export function normalizeSuggestionIcon(iconRaw: string): string {
  const trimmed = iconRaw.trim();
  return (ALLOWED_ICON_NAMES as readonly string[]).includes(trimmed)
    ? trimmed
    : "Sparkles";
}
