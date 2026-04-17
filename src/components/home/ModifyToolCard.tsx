"use client";

import type { RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GenUISchema } from "@/types/schema";

interface ModifyToolCardProps {
  activeTool: GenUISchema;
  modifyPrompt: string;
  setModifyPrompt: (v: string) => void;
  modifyRef: RefObject<HTMLInputElement | null>;
  loading: boolean;
  onModify: () => void;
  ideas: string[];
  ideasLoading: boolean;
}

export function ModifyToolCard({
  activeTool,
  modifyPrompt,
  setModifyPrompt,
  modifyRef,
  loading,
  onModify,
  ideas,
  ideasLoading,
}: ModifyToolCardProps) {
  return (
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
              if (e.key === "Enter") onModify();
            }}
            disabled={loading}
          />
        </div>

        {(ideasLoading || ideas.length > 0) && (
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">Ideas for this tool</p>
            <div className="flex flex-wrap gap-1.5">
              {ideasLoading && ideas.length === 0
                ? Array.from({ length: 4 }).map((_, i) => (
                    <span
                      key={i}
                      className="h-6 w-28 rounded-full bg-muted animate-pulse"
                    />
                  ))
                : ideas.map((idea) => (
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
          onClick={onModify}
          disabled={loading || !modifyPrompt.trim()}
        >
          Modify Tool
        </Button>
      </CardContent>
    </Card>
  );
}
