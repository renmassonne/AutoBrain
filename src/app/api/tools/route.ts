import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/json";

/** GET /api/tools — list user's tools (if authenticated) or public tools */
export async function GET(request: NextRequest) {
  const session = await auth();
  const { searchParams } = new URL(request.url);
  const publicOnly = searchParams.get("public") === "true";

  if (publicOnly) {
    const tools = await prisma.tool.findMany({
      where: { isPublic: true },
      orderBy: { likes: "desc" },
      take: 50,
      include: { user: { select: { name: true, email: true } } },
    });
    return NextResponse.json({
      tools: tools.map((t) => ({
        ...t,
        schema: JSON.parse(t.schema),
      })),
    });
  }

  if (!session?.user?.id) {
    return jsonError(401, "Not authenticated");
  }

  const tools = await prisma.tool.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({
    tools: tools.map((t) => ({
      ...t,
      schema: JSON.parse(t.schema),
    })),
  });
}

/** POST /api/tools — save a new tool */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError(401, "Not authenticated");
  }

  let body: { title: string; description?: string; schema: object; isPublic?: boolean };
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Invalid body");
  }

  const tool = await prisma.tool.create({
    data: {
      title: body.title,
      description: body.description || null,
      schema: JSON.stringify(body.schema),
      isPublic: body.isPublic ?? false,
      userId: session.user.id,
    },
  });

  return NextResponse.json({ tool: { ...tool, schema: JSON.parse(tool.schema) } });
}
