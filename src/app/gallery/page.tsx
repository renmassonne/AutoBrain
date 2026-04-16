"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToolRenderer } from "@/components/ToolRenderer";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Heart, GitFork, Search, ArrowLeft } from "lucide-react";
import type { GenUISchema } from "@/types/schema";
import Link from "next/link";

interface GalleryTool {
  id: string;
  title: string;
  description: string | null;
  schema: GenUISchema;
  isPublic: boolean;
  likes: number;
  createdAt: string;
  user: { name: string | null; email: string };
}

export default function GalleryPage() {
  const [tools, setTools] = useState<GalleryTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedTool, setSelectedTool] = useState<GalleryTool | null>(null);

  useEffect(() => {
    fetch("/api/tools?public=true")
      .then((r) => r.json())
      .then((data) => setTools(data.tools || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleLike = async (id: string) => {
    const res = await fetch(`/api/tools/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "like" }),
    });
    if (res.ok) {
      const data = await res.json();
      setTools((prev) =>
        prev.map((t) => (t.id === id ? { ...t, likes: data.likes } : t))
      );
    }
  };

  const handleFork = async (id: string) => {
    const res = await fetch(`/api/tools/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "fork" }),
    });
    if (res.ok) {
      alert("Tool forked to your dashboard!");
    } else {
      const data = await res.json();
      alert(data.error || "Fork failed. Are you logged in?");
    }
  };

  const filtered = tools.filter(
    (t) =>
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.description || "").toLowerCase().includes(search.toLowerCase())
  );

  if (selectedTool) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card/50 sticky top-0 z-50 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => setSelectedTool(null)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-lg font-bold">{selectedTool.title}</h1>
                <p className="text-sm text-muted-foreground">
                  by {selectedTool.user.name || selectedTool.user.email}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => handleLike(selectedTool.id)}>
                <Heart className="h-4 w-4 mr-1" /> {selectedTool.likes}
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleFork(selectedTool.id)}>
                <GitFork className="h-4 w-4 mr-1" /> Fork
              </Button>
              <ThemeToggle />
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8 max-w-3xl">
          <ErrorBoundary fallbackTitle="Tool rendering error">
            <ToolRenderer schema={selectedTool.schema} />
          </ErrorBoundary>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 sticky top-0 z-50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Tool Gallery</h1>
            <p className="text-muted-foreground text-sm">
              Explore community-created tools
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back to App
              </Button>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tools..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground animate-pulse">
            Loading tools...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {tools.length === 0
                ? "No public tools yet. Be the first to share!"
                : "No tools match your search."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((tool) => (
              <Card
                key={tool.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedTool(tool)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{tool.title}</CardTitle>
                  {tool.description && (
                    <CardDescription className="line-clamp-2">
                      {tool.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{tool.user.name || tool.user.email}</span>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Heart className="h-3 w-3" /> {tool.likes}
                      </span>
                      <span>{tool.schema.inputs.length} inputs</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
