import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const buyCertSchema = z.object({
  ticker: z.string().min(1, "종목 코드를 입력해주세요"),
  avgBuyPrice: z.number().positive("매수 가격은 양수여야 합니다"),
  shares: z.number().positive().optional(),
  note: z.string().max(200).optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: postId } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = buyCertSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

    const cert = await prisma.buyCertification.create({
      data: { ...parsed.data, postId, userId: session.user.id },
      include: { user: { select: { id: true, username: true, image: true } } },
    });

    return NextResponse.json(cert, { status: 201 });
  } catch (error) {
    console.error("Buy cert error:", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
}
