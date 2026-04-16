"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ToolRenderer } from "@/components/ToolRenderer";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Trash2, Globe, GlobeLock, ArrowLeft } from "lucide-react";
import type { GenUISchema } from "@/types/schema";
import Link from "next/link";

interface SavedTool {
  id: string;
  title: string;
  description: string | null;
  schema: GenUISchema;
  isPublic: boolean;
  likes: number;
  createdAt: string;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tools, setTools] = useState<SavedTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTool, setSelectedTool] = useState<SavedTool | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/tools")
      .then((r) => r.json())
      .then((data) => setTools(data.tools || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [status]);

  const togglePublic = async (id: string, isPublic: boolean) => {
    const res = await fetch(`/api/tools/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublic: !isPublic }),
    });
    if (res.ok) {
      setTools((prev) =>
        prev.map((t) => (t.id === id ? { ...t, isPublic: !isPublic } : t))
      );
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this tool?")) return;
    const res = await fetch(`/api/tools/${id}`, { method: "DELETE" });
    if (res.ok) {
      setTools((prev) => prev.filter((t) => t.id !== id));
      if (selectedTool?.id === id) setSelectedTool(null);
    }
  };

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 sticky top-0 z-50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">My Dashboard</h1>
            <p className="text-muted-foreground text-sm">
              {session?.user?.name || session?.user?.email}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" /> App
              </Button>
            </Link>
            <Link href="/gallery">
              <Button variant="outline" size="sm">Gallery</Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: "/" })}>
              Sign out
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground animate-pulse">
            Loading your tools...
          </div>
        ) : tools.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              You haven't saved any tools yet.
            </p>
            <Link href="/">
              <Button>Create your first tool</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-2">
              <h2 className="text-sm font-semibold mb-3">Saved tools ({tools.length})</h2>
              {tools.map((tool) => (
                <Card
                  key={tool.id}
                  className={`cursor-pointer transition-shadow hover:shadow-md ${
                    selectedTool?.id === tool.id ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => setSelectedTool(tool)}
                >
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span className="truncate">{tool.title}</span>
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => togglePublic(tool.id, tool.isPublic)}
                          title={tool.isPublic ? "Make private" : "Make public"}
                        >
                          {tool.isPublic ? (
                            <Globe className="h-3.5 w-3.5 text-green-500" />
                          ) : (
                            <GlobeLock className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleDelete(tool.id)}
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-3">
                    <p className="text-xs text-muted-foreground">
                      {tool.schema.inputs.length} inputs &middot; {tool.likes} likes
                      {tool.isPublic && " \u00B7 public"}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="lg:col-span-2">
              {selectedTool ? (
                <ErrorBoundary fallbackTitle="Tool rendering error">
                  <ToolRenderer schema={selectedTool.schema} />
                </ErrorBoundary>
              ) : (
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  Select a tool to preview
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
