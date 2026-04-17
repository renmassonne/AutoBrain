"use client";

import { useMemo, useRef, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { ToolRenderer } from "@/components/ToolRenderer";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TemplateCards } from "@/components/TemplateCards";
import { ToolSidebar } from "@/components/ToolSidebar";
import { usePersistedTools } from "@/hooks/usePersistedTools";
import { UserNav } from "@/components/UserNav";
import { useSession } from "next-auth/react";
import { Cloud } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { usePromptDraft } from "@/hooks/usePromptDraft";
import { useRefinePrompt } from "@/hooks/useRefinePrompt";
import { useModifyIdeas } from "@/hooks/useModifyIdeas";
import { useGenerator } from "@/hooks/useGenerator";
import { PromptCard } from "@/components/home/PromptCard";
import { ModifyToolCard } from "@/components/home/ModifyToolCard";
import { StreamPreviewCard } from "@/components/home/StreamPreviewCard";
import { Toast } from "@/components/home/Toast";

export default function Home() {
  const { data: session } = useSession();
  const modifyRef = useRef<HTMLInputElement>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [saving, setSaving] = useState(false);

  const { toast, showToast } = useToast();
  const { prompt, setPrompt, promptRef, clearDraft } = usePromptDraft();
  const {
    refined,
    refining,
    refine,
    accept: acceptRefinedInner,
    dismiss: dismissRefined,
  } = useRefinePrompt();

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

  const dismissRefinedStable = useCallback(() => dismissRefined(), [dismissRefined]);

  const {
    loading,
    error,
    setError,
    streamPreview,
    repairing,
    modifyPrompt,
    setModifyPrompt,
    generate,
    modify,
  } = useGenerator({
    activeIndex,
    activeTool,
    addTool,
    updateTool,
    showToast,
    setPrompt,
    clearDraft,
    onClearRefined: dismissRefinedStable,
  });

  const { ideas: modifyIdeas, loading: modifyIdeasLoading } =
    useModifyIdeas(activeTool);

  const avoidTitles = useMemo(() => tools.map((t) => t.title), [tools]);

  const handleGenerate = () => generate(prompt);
  const handleModify = () => modify(modifyPrompt);
  const handleRefinePrompt = () => refine(prompt, setError);
  const acceptRefined = () => acceptRefinedInner(setPrompt);

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
    generate(templatePrompt);
  };

  const handleNewTool = () => {
    setActiveIndex(null);
    setPrompt("");
    setModifyPrompt("");
    setError(null);
    dismissRefined();
    promptRef.current?.focus();
  };

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
            <PromptCard
              showingNewToolForm={showingNewToolForm}
              prompt={prompt}
              setPrompt={setPrompt}
              promptRef={promptRef}
              loading={loading}
              refineBusy={refining}
              streamRepairing={repairing}
              refined={refined}
              onAcceptRefined={acceptRefined}
              onDismissRefined={dismissRefined}
              onGenerate={handleGenerate}
              onRefine={handleRefinePrompt}
              toolsCount={tools.length}
              showTemplates={showTemplates}
              setShowTemplates={setShowTemplates}
              error={error}
            />

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

            {activeTool && !loading && (
              <ModifyToolCard
                activeTool={activeTool}
                modifyPrompt={modifyPrompt}
                setModifyPrompt={setModifyPrompt}
                modifyRef={modifyRef}
                loading={loading}
                onModify={handleModify}
                ideas={modifyIdeas}
                ideasLoading={modifyIdeasLoading}
              />
            )}

            <StreamPreviewCard
              visible={loading}
              streamPreview={streamPreview}
              repairing={repairing}
            />

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

      <Toast message={toast} />
    </div>
  );
}
