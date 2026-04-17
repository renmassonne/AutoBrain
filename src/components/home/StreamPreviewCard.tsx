"use client";

import { Card, CardContent } from "@/components/ui/card";

interface StreamPreviewCardProps {
  visible: boolean;
  streamPreview: string | null;
  repairing: string | null;
}

export function StreamPreviewCard({
  visible,
  streamPreview,
  repairing,
}: StreamPreviewCardProps) {
  if (!visible || !streamPreview) return null;
  return (
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
  );
}
