"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ToolRenderer } from "@/components/ToolRenderer";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TemplateCards } from "@/components/TemplateCards";
import { ToolSidebar } from "@/components/ToolSidebar";
import { usePersistedTools } from "@/hooks/usePersistedTools";
import { generateStream } from "@/lib/streamClient";
import { UserNav } from "@/components/UserNav";
import { useSession } from "next-auth/react";
import {
  Cloud,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Wand2,
  X,
  CheckCircle2,
  Wrench,
} from "lucide-react";

const DRAFT_KEY = "autobrain-prompt-draft";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [modifyPrompt, setModifyPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamPreview, setStreamPreview] = useState<string | null>(null);
  const [repairing, setRepairing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [refining, setRefining] = useState(false);
  const [refined, setRefined] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [modifyIdeas, setModifyIdeas] = useState<string[]>([]);
  const [modifyIdeasLoading, setModifyIdeasLoading] = useState(false);

  const { data: session } = useSession();
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const modifyRef = useRef<HTMLInputElement>(null);

  const {
    tools,
    activeIndex,
    activeTool,
    hydrated,
    setActiveIndex,
    addTool,
    updateTool,
    deleteTool,
    duplicateTool,
    renameTool,
  } = usePersistedTools();

  // --- sessionStorage prompt draft ---
  useEffect(() => {
    try {
      const draft = sessionStorage.getItem(DRAFT_KEY);
      if (draft) setPrompt(draft);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      if (prompt) sessionStorage.setItem(DRAFT_KEY, prompt);
      else sessionStorage.removeItem(DRAFT_KEY);
    } catch {
      // ignore
    }
  }, [prompt]);

  // --- "/" focus shortcut ---
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/") return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isTyping =
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        target?.isContentEditable;
      if (isTyping) return;
      e.preventDefault();
      promptRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // --- transient toast ---
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(id);
  }, [toast]);

  const showToast = useCallback((msg: string) => setToast(msg), []);

  const callGenerate = useCallback(
    async (userPrompt: string, isModify: boolean) => {
      setError(null);
      setLoading(true);
      setStreamPreview(null);
      setRepairing(null);
      setRefined(null);

      try {
        const currentActive = isModify ? activeTool : null;
        const body =
          isModify && currentActive
            ? { prompt: userPrompt, modify: true, currentSchema: currentActive }
            : { prompt: userPrompt };

        await generateStream(body, {
          onPartial: (text) => setStreamPreview(text),
          onRepairing: (reason) =>
            setRepairing(reason || "Fixing the generated schema…"),
          onComplete: (schema, meta) => {
            if (isModify && activeIndex !== null) {
              updateTool(activeIndex, schema);
              showToast(
                meta.repaired
                  ? "Tool updated (auto-repaired)"
                  : "Tool updated"
              );
            } else {
              addTool(schema);
              setPrompt("");
              try {
                sessionStorage.removeItem(DRAFT_KEY);
              } catch {
                // ignore
              }
              showToast(
                meta.repaired
                  ? "Tool created (auto-repaired)"
                  : "Tool created"
              );
            }
            setStreamPreview(null);
            setRepairing(null);
            setModifyPrompt("");
          },
          onError: (msg) => {
            setError(msg);
            setStreamPreview(null);
            setRepairing(null);
          },
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
        setStreamPreview(null);
        setRepairing(null);
      } finally {
        setLoading(false);
      }
    },
    [activeIndex, activeTool, addTool, updateTool, showToast]
  );

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    callGenerate(prompt.trim(), false);
  };

  const handleModify = () => {
    if (!modifyPrompt.trim() || activeIndex === null) return;
    callGenerate(modifyPrompt.trim(), true);
  };

  const handleRefinePrompt = async () => {
    if (!prompt.trim() || refining) return;
    setRefining(true);
    setRefined(null);
    setError(null);
    try {
      const res = await fetch("/api/refine-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Refine failed");
      if (typeof data.prompt === "string" && data.prompt.trim()) {
        setRefined(data.prompt.trim());
      } else {
        setError("Could not refine this prompt");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refine failed");
    } finally {
      setRefining(false);
    }
  };

  const acceptRefined = () => {
    if (!refined) return;
    setPrompt(refined);
    setRefined(null);
  };

  const handleSaveToCloud = async () => {
    if (!activeTool || !session) return;
    setSaving(true);
    try {
      const res = await fetch("/api/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: activeTool.title,
          description: activeTool.description,
          schema: activeTool,
          isPublic: false,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      setError(null);
      showToast("Saved to your dashboard");
    } catch {
      setError("Failed to save tool");
    } finally {
      setSaving(false);
    }
  };

  const handleTemplateSelect = (templatePrompt: string) => {
    setPrompt(templatePrompt);
    setShowTemplates(false);
    callGenerate(templatePrompt, false);
  };

  const handleNewTool = () => {
    setActiveIndex(null);
    setPrompt("");
    setModifyPrompt("");
    setError(null);
    setRefined(null);
    promptRef.current?.focus();
  };

  // --- modify suggestions: fetch when the active tool changes ---
  useEffect(() => {
    if (!activeTool) {
      setModifyIdeas([]);
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    setModifyIdeasLoading(true);
    fetch("/api/modify-suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schema: activeTool }),
      signal: controller.signal,
    })
      .then((r) => r.json().catch(() => ({})))
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data?.suggestions) ? data.suggestions : [];
        setModifyIdeas(list.slice(0, 4));
      })
      .catch(() => {
        if (!cancelled) setModifyIdeas([]);
      })
      .finally(() => {
        if (!cancelled) setModifyIdeasLoading(false);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [activeTool]);

  const avoidTitles = useMemo(() => tools.map((t) => t.title), [tools]);

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const showingNewToolForm = activeIndex === null;

  return (
    <div className="min-h-screen bg-background transition-colors flex flex-col">
      <header className="border-b bg-card/50 sticky top-0 z-50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">AutoBrain</h1>
            <p className="text-muted-foreground text-sm">
              Describe a problem &rarr; get a working interactive tool
            </p>
          </div>
          <div className="flex items-center gap-2">
            <UserNav />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <ToolSidebar
          tools={tools}
          activeIndex={activeIndex}
          onSelect={setActiveIndex}
          onDelete={deleteTool}
          onDuplicate={duplicateTool}
          onRename={renameTool}
          onNewTool={handleNewTool}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-8">
            {/* Prompt card */}
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
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey))
                        handleGenerate();
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
                      <Button size="sm" onClick={acceptRefined}>
                        Use this
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setRefined(null)}
                      >
                        <X className="h-3 w-3 mr-1" /> Dismiss
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    onClick={handleGenerate}
                    disabled={loading || !prompt.trim()}
                  >
                    {loading ? "Generating\u2026" : "Generate Tool"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleRefinePrompt}
                    disabled={loading || refining || !prompt.trim()}
                    title="Rewrite your prompt so it produces a better tool"
                  >
                    <Wand2 className="h-4 w-4 mr-1" />
                    {refining ? "Refining\u2026" : "Improve prompt"}
                  </Button>
                  {!loading && tools.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowTemplates(!showTemplates)}
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
                  {loading && !repairing && (
                    <span className="text-sm text-muted-foreground animate-pulse">
                      AI is building your tool...
                    </span>
                  )}
                  {loading && repairing && (
                    <span className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <Wrench className="h-3.5 w-3.5" />
                      {repairing}
                    </span>
                  )}
                </div>
                {error && (
                  <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 flex items-start justify-between gap-3">
                    <p className="text-sm text-destructive">{error}</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleGenerate}
                      disabled={loading || !prompt.trim()}
                    >
                      Try again
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Suggestions / inspiration */}
            {(tools.length === 0 || showTemplates) && !loading && (
              <div className="mb-8">
                {tools.length === 0 && (
                  <h2 className="text-lg font-semibold mb-3">
                    Need inspiration?
                  </h2>
                )}
                <TemplateCards
                  onSelect={handleTemplateSelect}
                  disabled={loading}
                  avoidTitles={avoidTitles}
                />
              </div>
            )}

            {/* Modify tool card */}
            {activeTool && !loading && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle>Modify this tool</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Ask for changes to &quot;{activeTool.title}&quot;
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="modify">Modification prompt</Label>
                    <Input
                      ref={modifyRef}
                      id="modify"
                      placeholder="e.g. Add a field for utilities and include it in expenses"
                      value={modifyPrompt}
                      onChange={(e) => setModifyPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleModify();
                      }}
                      disabled={loading}
                    />
                  </div>

                  {(modifyIdeasLoading || modifyIdeas.length > 0) && (
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground">
                        Ideas for this tool
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {modifyIdeasLoading && modifyIdeas.length === 0
                          ? Array.from({ length: 4 }).map((_, i) => (
                              <span
                                key={i}
                                className="h-6 w-28 rounded-full bg-muted animate-pulse"
                              />
                            ))
                          : modifyIdeas.map((idea) => (
                              <button
                                key={idea}
                                type="button"
                                onClick={() => {
                                  setModifyPrompt(idea);
                                  modifyRef.current?.focus();
                                }}
                                className="px-2.5 py-1 text-xs rounded-full border bg-background hover:bg-muted text-foreground transition-colors"
                              >
                                {idea}
                              </button>
                            ))}
                      </div>
                    </div>
                  )}

                  <Button
                    variant="outline"
                    onClick={handleModify}
                    disabled={loading || !modifyPrompt.trim()}
                  >
                    Modify Tool
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Stream preview */}
            {loading && streamPreview && (
              <Card className="mb-4 overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-sm font-medium text-muted-foreground">
                      {repairing ? "Repairing schema…" : "Generating schema…"}
                    </span>
                  </div>
                  <pre className="text-xs text-muted-foreground bg-muted rounded-md p-3 overflow-auto max-h-[200px] whitespace-pre-wrap font-mono">
                    {streamPreview}
                  </pre>
                </CardContent>
              </Card>
            )}

            {/* Active tool renderer */}
            {activeTool && !loading && (
              <>
                {session && (
                  <div className="flex justify-end mb-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSaveToCloud}
                      disabled={saving}
                    >
                      <Cloud className="h-4 w-4 mr-1" />
                      {saving ? "Saving\u2026" : "Save to Cloud"}
                    </Button>
                  </div>
                )}
                <ErrorBoundary fallbackTitle="Tool rendering error">
                  <ToolRenderer schema={activeTool} />
                </ErrorBoundary>
              </>
            )}

            {loading && !streamPreview && <LoadingSkeleton />}
          </div>
        </main>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 left-4 z-[60] animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 shadow-lg">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-sm">{toast}</span>
          </div>
        </div>
      )}
    </div>
  );
}
