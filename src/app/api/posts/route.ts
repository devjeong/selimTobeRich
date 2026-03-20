import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { PostType, Recommendation, Market } from "@prisma/client";
import { sendPostNotificationToAll } from "@/lib/telegram";

const createPostSchema = z.object({
  title: z.string().min(1, "제목을 입력해주세요").max(200),
  content: z.string().min(1, "내용을 입력해주세요"),
  type: z.nativeEnum(PostType),
  recommendation: z.nativeEnum(Recommendation).default("NONE"),
  recommendedPrice: z.number().positive("추천 가격은 0보다 커야 합니다").nullable().optional(),
  ticker: z.string().nullable().optional(),
  tickerName: z.string().nullable().optional(),
  market: z.nativeEnum(Market).nullable().optional(),
  sectorName: z.string().nullable().optional(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const type = searchParams.get("type") as PostType | null;
  const recommendation = searchParams.get("recommendation") as Recommendation | null;
  const ticker = searchParams.get("ticker");
  const search = searchParams.get("search");

  const where = {
    ...(type && { type }),
    ...(recommendation && { recommendation }),
    ...(ticker && { ticker }),
    ...(search && {
      OR: [
        { title: { contains: search, mode: "insensitive" as const } },
        { content: { contains: search, mode: "insensitive" as const } },
      ],
    }),
  };

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      include: {
        user: { select: { id: true, username: true, image: true } },
        _count: { select: { comments: true, likes: true, buyCertifications: true, sellCertifications: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.post.count({ where }),
  ]);

  return NextResponse.json({ posts, total, page, limit, totalPages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = createPostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { title, content, type, recommendation, recommendedPrice, ticker, tickerName, market, sectorName } = parsed.data;

    if (type === "STOCK" && !ticker) {
      return NextResponse.json({ error: "특정 종목 게시글에는 종목 코드가 필요합니다" }, { status: 400 });
    }

    // 중립(NONE)이면 추천 가격 무시
    const finalRecommendedPrice = recommendation !== "NONE" ? (recommendedPrice ?? null) : null;

    const post = await prisma.post.create({
      data: {
        title, content, type, recommendation,
        recommendedPrice: finalRecommendedPrice,
        ticker: type === "STOCK" ? ticker : null,
        tickerName: type === "STOCK" ? tickerName : null,
        market: type === "STOCK" ? market : null,
        sectorName: type === "SECTOR" ? sectorName : null,
        userId: session.user.id,
      },
      include: {
        user: { select: { id: true, username: true, image: true } },
      },
    });

    // 매수/매도 추천 게시글이면 텔레그램 알림 발송 (비동기, 실패해도 응답에 영향 없음)
    if (recommendation === "BUY" || recommendation === "SELL") {
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      sendPostNotificationToAll({
        recommendation,
        title,
        ticker: type === "STOCK" ? ticker : null,
        tickerName: type === "STOCK" ? tickerName : null,
        market: type === "STOCK" ? market : null,
        sectorName: type === "SECTOR" ? sectorName : null,
        recommendedPrice: finalRecommendedPrice,
        username: post.user.username,
        postUrl: `${baseUrl}/posts/${post.id}`,
      }).catch((e) => console.error("[Telegram] 알림 실패:", e));
    }

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error("Create post error:", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
}
