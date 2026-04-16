"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function LoadingSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader className="space-y-3">
        <div className="h-6 w-2/5 rounded bg-muted" />
        <div className="h-4 w-3/5 rounded bg-muted" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="h-4 w-1/4 rounded bg-muted" />
          <div className="h-10 w-full rounded bg-muted" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-1/3 rounded bg-muted" />
          <div className="h-10 w-full rounded bg-muted" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-1/4 rounded bg-muted" />
          <div className="h-10 w-full rounded bg-muted" />
        </div>
        <div className="border-t pt-4 space-y-2">
          <div className="flex justify-between">
            <div className="h-4 w-1/4 rounded bg-muted" />
            <div className="h-5 w-20 rounded bg-muted" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
