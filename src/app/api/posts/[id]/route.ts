import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { PostType, Recommendation, Market } from "@prisma/client";

const updatePostSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
  type: z.nativeEnum(PostType).optional(),
  recommendation: z.nativeEnum(Recommendation).optional(),
  recommendedPrice: z.number().positive().nullable().optional(),
  ticker: z.string().optional().nullable(),
  tickerName: z.string().optional().nullable(),
  market: z.nativeEnum(Market).optional().nullable(),
  sectorName: z.string().optional().nullable(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, username: true, image: true, bio: true } },
      comments: {
        where: { parentId: null },
        include: {
          user: { select: { id: true, username: true, image: true } },
          replies: {
            include: { user: { select: { id: true, username: true, image: true } } },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      buyCertifications: {
        include: { user: { select: { id: true, username: true, image: true } } },
        orderBy: { createdAt: "desc" },
      },
      sellCertifications: {
        include: { user: { select: { id: true, username: true, image: true } } },
        orderBy: { createdAt: "desc" },
      },
      likes: true,
      _count: { select: { comments: true, likes: true } },
    },
  });

  if (!post) return NextResponse.json({ error: "게시글을 찾을 수 없습니다" }, { status: 404 });

  // 조회수 증가
  await prisma.post.update({ where: { id }, data: { viewCount: { increment: 1 } } });

  return NextResponse.json(post);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });

  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) return NextResponse.json({ error: "게시글을 찾을 수 없습니다" }, { status: 404 });
  if (post.userId !== session.user.id) return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });

  try {
    const body = await req.json();
    const parsed = updatePostSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

    const { recommendation, recommendedPrice, ...rest } = parsed.data;
    const finalRecommendedPrice =
      recommendation !== undefined
        ? recommendation !== "NONE" ? (recommendedPrice ?? null) : null
        : recommendedPrice ?? null;

    const updated = await prisma.post.update({
      where: { id },
      data: { ...rest, ...(recommendation && { recommendation }), recommendedPrice: finalRecommendedPrice },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update post error:", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });

  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) return NextResponse.json({ error: "게시글을 찾을 수 없습니다" }, { status: 404 });

  const dbUser = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (post.userId !== session.user.id && dbUser?.role !== "ADMIN") {
    return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
  }

  await prisma.post.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
