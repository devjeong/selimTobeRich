import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { calcProfitRate } from "@/lib/utils";

const sellCertSchema = z.object({
  ticker: z.string().min(1, "종목 코드를 입력해주세요"),
  sellPrice: z.number().positive("매도 가격은 양수여야 합니다"),
  buyPrice: z.number().positive("매수 가격은 양수여야 합니다"),
  shares: z.number().positive().optional(),
  note: z.string().max(200).optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: postId } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = sellCertSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

    const { ticker, sellPrice, buyPrice, shares, note } = parsed.data;
    const profitRate = calcProfitRate(sellPrice, buyPrice);

    const cert = await prisma.sellCertification.create({
      data: { ticker, sellPrice, buyPrice, profitRate, shares, note, postId, userId: session.user.id },
      include: { user: { select: { id: true, username: true, image: true } } },
    });

    return NextResponse.json(cert, { status: 201 });
  } catch (error) {
    console.error("Sell cert error:", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
}
