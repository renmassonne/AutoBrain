"use client";

import type { RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChevronDown,
  ChevronUp,
  Sparkles,
  Wand2,
  X,
  Wrench,
} from "lucide-react";

interface PromptCardProps {
  showingNewToolForm: boolean;
  prompt: string;
  setPrompt: (v: string) => void;
  promptRef: RefObject<HTMLTextAreaElement | null>;
  loading: boolean;
  /** True while /api/refine-prompt is in flight */
  refineBusy: boolean;
  /** Non-null while streamed schema is being auto-repaired */
  streamRepairing: string | null;
  refined: string | null;
  onAcceptRefined: () => void;
  onDismissRefined: () => void;
  onGenerate: () => void;
  onRefine: () => void;
  toolsCount: number;
  showTemplates: boolean;
  setShowTemplates: (v: boolean | ((p: boolean) => boolean)) => void;
  error: string | null;
}

export function PromptCard({
  showingNewToolForm,
  prompt,
  setPrompt,
  promptRef,
  loading,
  refineBusy,
  streamRepairing,
  refined,
  onAcceptRefined,
  onDismissRefined,
  onGenerate,
  onRefine,
  toolsCount,
  showTemplates,
  setShowTemplates,
  error,
}: PromptCardProps) {
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>
          {showingNewToolForm
            ? "What do you want to build?"
            : "Create another tool"}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {showingNewToolForm
            ? "Enter a prompt or pick a suggestion below. Press / anywhere to focus this field."
            : "Enter a new prompt to generate a fresh tool"}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="prompt">Prompt</Label>
          <textarea
            ref={promptRef}
            id="prompt"
            placeholder="Describe the tool you need..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onGenerate();
            }}
            className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
            disabled={loading}
          />
        </div>

        {refined && (
          <div className="rounded-md border border-primary/40 bg-primary/5 p-3 space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>Suggested rewrite</span>
            </div>
            <p className="text-sm">{refined}</p>
            <div className="flex gap-2">
              <Button size="sm" onClick={onAcceptRefined}>
                Use this
              </Button>
              <Button size="sm" variant="ghost" onClick={onDismissRefined}>
                <X className="h-3 w-3 mr-1" /> Dismiss
              </Button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={onGenerate}
            disabled={loading || !prompt.trim()}
          >
            {loading ? "Generating\u2026" : "Generate Tool"}
          </Button>
          <Button
            variant="outline"
            onClick={onRefine}
            disabled={loading || refineBusy || !prompt.trim()}
            title="Rewrite your prompt so it produces a better tool"
          >
            <Wand2 className="h-4 w-4 mr-1" />
            {refineBusy ? "Refining\u2026" : "Improve prompt"}
          </Button>
          {!loading && toolsCount > 0 && (
            <button
              type="button"
              onClick={() => setShowTemplates((s) => !s)}
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              Inspiration
              {showTemplates ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>
          )}
          {loading && !streamRepairing && (
            <span className="text-sm text-muted-foreground animate-pulse">
              AI is building your tool...
            </span>
          )}
          {loading && streamRepairing && (
            <span className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <Wrench className="h-3.5 w-3.5" />
              {streamRepairing}
            </span>
          )}
        </div>
        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 flex items-start justify-between gap-3">
            <p className="text-sm text-destructive">{error}</p>
            <Button
              size="sm"
              variant="ghost"
              onClick={onGenerate}
              disabled={loading || !prompt.trim()}
            >
              Try again
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
