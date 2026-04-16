"use client";

import { useCallback, useEffect, useState } from "react";
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
  Sparkles,
  RefreshCw,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

const ICON_MAP: Record<string, LucideIcon> = {
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

const CATEGORIES = [
  "All",
  "Finance",
  "Health",
  "Productivity",
  "Science",
  "Daily life",
  "Business",
] as const;

interface Suggestion {
  title: string;
  description: string;
  prompt: string;
  category: string;
  icon: string;
}

interface TemplateCardsProps {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
  /** Titles to avoid (e.g. tools the user has already created). */
  avoidTitles?: string[];
}

export function TemplateCards({
  onSelect,
  disabled,
  avoidTitles = [],
}: TemplateCardsProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("All");
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1000));

  const load = useCallback(
    async (opts?: { refresh?: boolean }) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (category !== "All") params.set("category", category);
        params.set("seed", String(seed));
        params.set("count", "6");
        if (opts?.refresh) params.set("refresh", "1");
        if (avoidTitles.length > 0) {
          params.set("avoid", avoidTitles.slice(0, 10).join(","));
        }
        const res = await fetch(`/api/suggestions?${params.toString()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setSuggestions(data.suggestions || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load suggestions");
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    },
    [category, seed, avoidTitles]
  );

  useEffect(() => {
    load();
  }, [load]);

  const reroll = () => setSeed(Math.floor(Math.random() * 1000));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              disabled={disabled || loading}
              className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                category === c
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background hover:bg-muted border-border text-muted-foreground"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="ml-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={reroll}
            disabled={disabled || loading}
            className="h-7 text-xs"
            title="Reroll suggestions"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`} />
            Reroll
          </Button>
        </div>
      </div>

      {error && (
        <p className="text-xs text-destructive">
          Could not load suggestions: {error}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {loading && !suggestions
          ? Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-lg border bg-card p-4 animate-pulse"
              >
                <div className="h-9 w-9 rounded-md bg-muted shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-2/3 rounded bg-muted" />
                  <div className="h-2 w-full rounded bg-muted" />
                  <div className="h-2 w-4/5 rounded bg-muted" />
                </div>
              </div>
            ))
          : (suggestions || []).map((t) => {
              const Icon = ICON_MAP[t.icon] ?? Sparkles;
              return (
                <button
                  key={`${t.title}-${t.category}`}
                  disabled={disabled}
                  onClick={() => onSelect(t.prompt)}
                  className="group flex items-start gap-3 rounded-lg border bg-card p-4 text-left transition-all hover:border-primary/50 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm leading-tight truncate">
                        {t.title}
                      </p>
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground shrink-0">
                        {t.category}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {t.description}
                    </p>
                  </div>
                </button>
              );
            })}
        {!loading && suggestions && suggestions.length === 0 && !error && (
          <p className="text-xs text-muted-foreground col-span-full text-center py-6">
            No suggestions yet. Try another category or reroll.
          </p>
        )}
      </div>
    </div>
  );
}
