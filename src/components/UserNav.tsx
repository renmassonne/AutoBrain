"use client";

import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { User, LogOut, LayoutDashboard, Globe } from "lucide-react";

export function UserNav() {
  const { data: session, status } = useSession();

  if (status === "loading") return null;

  if (!session) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/gallery">
          <Button variant="ghost" size="sm">
            <Globe className="h-4 w-4 mr-1" /> Gallery
          </Button>
        </Link>
        <Link href="/login">
          <Button variant="outline" size="sm">
            <User className="h-4 w-4 mr-1" /> Sign in
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link href="/gallery">
        <Button variant="ghost" size="sm">
          <Globe className="h-4 w-4 mr-1" /> Gallery
        </Button>
      </Link>
      <Link href="/dashboard">
        <Button variant="ghost" size="sm">
          <LayoutDashboard className="h-4 w-4 mr-1" /> Dashboard
        </Button>
      </Link>
      <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: "/" })}>
        <LogOut className="h-4 w-4 mr-1" /> Out
      </Button>
    </div>
  );
}
