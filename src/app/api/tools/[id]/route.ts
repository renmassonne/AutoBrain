import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** GET /api/tools/:id — get a single tool */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tool = await prisma.tool.findUnique({ where: { id } });
  if (!tool) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ tool: { ...tool, schema: JSON.parse(tool.schema) } });
}

/** PATCH /api/tools/:id — update a tool */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const tool = await prisma.tool.findUnique({ where: { id } });
  if (!tool || tool.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found or not authorized" }, { status: 404 });
  }

  let body: { title?: string; description?: string; schema?: object; isPublic?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const updated = await prisma.tool.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.schema !== undefined && { schema: JSON.stringify(body.schema) }),
      ...(body.isPublic !== undefined && { isPublic: body.isPublic }),
    },
  });

  return NextResponse.json({ tool: { ...updated, schema: JSON.parse(updated.schema) } });
}

/** DELETE /api/tools/:id — delete a tool */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const tool = await prisma.tool.findUnique({ where: { id } });
  if (!tool || tool.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found or not authorized" }, { status: 404 });
  }

  await prisma.tool.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

/** POST /api/tools/:id — like/fork */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let body: { action: "like" | "fork" };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const tool = await prisma.tool.findUnique({ where: { id } });
  if (!tool) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (body.action === "like") {
    const updated = await prisma.tool.update({
      where: { id },
      data: { likes: { increment: 1 } },
    });
    return NextResponse.json({ likes: updated.likes });
  }

  if (body.action === "fork") {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const forked = await prisma.tool.create({
      data: {
        title: `${tool.title} (fork)`,
        description: tool.description,
        schema: tool.schema,
        userId: session.user.id,
      },
    });
    return NextResponse.json({ tool: { ...forked, schema: JSON.parse(forked.schema) } });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
