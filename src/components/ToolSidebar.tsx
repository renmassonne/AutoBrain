"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Copy,
  Trash2,
  Pencil,
  Check,
  X,
  Search,
  PanelLeftClose,
  PanelLeft,
  Plus,
} from "lucide-react";
import type { GenUISchema } from "@/types/schema";

interface ToolSidebarProps {
  tools: GenUISchema[];
  activeIndex: number | null;
  onSelect: (index: number) => void;
  onDelete: (index: number) => void;
  onDuplicate: (index: number) => void;
  onRename: (index: number, title: string) => void;
  onNewTool: () => void;
}

export function ToolSidebar({
  tools,
  activeIndex,
  onSelect,
  onDelete,
  onDuplicate,
  onRename,
  onNewTool,
}: ToolSidebarProps) {
  const [search, setSearch] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [collapsed, setCollapsed] = useState(false);

  const filtered = tools
    .map((t, i) => ({ tool: t, index: i }))
    .filter(({ tool }) =>
      tool.title.toLowerCase().includes(search.toLowerCase())
    );

  const startRename = (index: number, currentTitle: string) => {
    setEditingIndex(index);
    setEditTitle(currentTitle);
  };

  const confirmRename = () => {
    if (editingIndex !== null && editTitle.trim()) {
      onRename(editingIndex, editTitle.trim());
    }
    setEditingIndex(null);
    setEditTitle("");
  };

  const cancelRename = () => {
    setEditingIndex(null);
    setEditTitle("");
  };

  if (tools.length === 0) return null;

  if (collapsed) {
    return (
      <div className="w-10 shrink-0 flex flex-col items-center pt-2 gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(false)}
        >
          <PanelLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onNewTool}
          title="New tool"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-64 shrink-0 border-r bg-card/50 flex flex-col h-full">
      <div className="p-3 border-b flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold truncate">My Tools</h2>
        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onNewTool}
            title="New tool"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setCollapsed(true)}
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {tools.length > 3 && (
        <div className="p-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search tools..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-xs pl-8"
            />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filtered.map(({ tool, index }) => (
          <div
            key={index}
            className={`group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm cursor-pointer transition-colors ${
              activeIndex === index
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            }`}
            onClick={() => onSelect(index)}
          >
            {editingIndex === index ? (
              <div className="flex items-center gap-1 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") confirmRename();
                    if (e.key === "Escape") cancelRename();
                  }}
                  className="h-6 text-xs px-1"
                  autoFocus
                />
                <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={confirmRename}>
                  <Check className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={cancelRename}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <>
                <span className="flex-1 truncate">{tool.title}</span>
                <div
                  className={`flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ${
                    activeIndex === index ? "opacity-100" : ""
                  }`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() => startRename(index, tool.title)}
                    title="Rename"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() => onDuplicate(index)}
                    title="Duplicate"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() => onDelete(index)}
                    title="Delete"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">No tools found</p>
        )}
      </div>

      <div className="p-2 border-t">
        <p className="text-xs text-muted-foreground text-center">
          {tools.length} tool{tools.length !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
}
