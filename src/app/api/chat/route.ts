import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// 최근 메시지 50개 조회
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const after = searchParams.get("after"); // 마지막 메시지 ID (폴링용)

  const messages = await prisma.chatMessage.findMany({
    where: after ? { id: { gt: after } } : undefined,
    orderBy: { createdAt: "asc" },
    take: 50,
    select: {
      id: true,
      content: true,
      createdAt: true,
      user: {
        select: { id: true, username: true, image: true },
      },
    },
  });

  return NextResponse.json(messages);
}

// 메시지 전송
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { content } = await req.json();
  if (!content?.trim() || content.trim().length > 500) {
    return NextResponse.json({ error: "Invalid message" }, { status: 400 });
  }

  const message = await prisma.chatMessage.create({
    data: {
      content: content.trim(),
      userId: session.user.id!,
    },
    select: {
      id: true,
      content: true,
      createdAt: true,
      user: {
        select: { id: true, username: true, image: true },
      },
    },
  });

  // 오래된 메시지 정리 (500개 초과 시 오래된 것 삭제)
  const count = await prisma.chatMessage.count();
  if (count > 500) {
    const oldest = await prisma.chatMessage.findMany({
      orderBy: { createdAt: "asc" },
      take: count - 500,
      select: { id: true },
    });
    await prisma.chatMessage.deleteMany({
      where: { id: { in: oldest.map((m) => m.id) } },
    });
  }

  return NextResponse.json(message, { status: 201 });
}
