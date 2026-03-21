import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getPeriodStart(period: string): Date {
  const now = new Date();
  switch (period) {
    case "today": {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case "week": {
      const d = new Date(now);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
      d.setDate(diff);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case "month": {
      return new Date(now.getFullYear(), now.getMonth(), 1);
    }
    case "year": {
      return new Date(now.getFullYear(), 0, 1);
    }
    default: {
      return new Date(now.getFullYear(), now.getMonth(), 1);
    }
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || "month";
  const periodStart = getPeriodStart(period);

  try {
    const sellCerts = await prisma.sellCertification.findMany({
      where: { createdAt: { gte: periodStart } },
      include: {
        user: { select: { id: true, username: true, image: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Group sell certs by userId
    const userMap = new Map<
      string,
      {
        user: { id: string; username: string; image: string | null };
        trades: {
          id: string;
          ticker: string;
          buyPrice: number;
          sellPrice: number;
          profitRate: number;
          shares: number | null;
          note: string | null;
          createdAt: Date;
        }[];
      }
    >();

    for (const cert of sellCerts) {
      if (!userMap.has(cert.userId)) {
        userMap.set(cert.userId, { user: cert.user, trades: [] });
      }
      userMap.get(cert.userId)!.trades.push({
        id: cert.id,
        ticker: cert.ticker,
        buyPrice: cert.buyPrice,
        sellPrice: cert.sellPrice,
        profitRate: cert.profitRate,
        shares: cert.shares,
        note: cert.note,
        createdAt: cert.createdAt,
      });
    }

    const leaderboard = Array.from(userMap.values())
      .map(({ user, trades }) => {
        const rates = trades.map((t) => t.profitRate);
        const avgProfitRate = rates.reduce((a, b) => a + b, 0) / rates.length;
        const totalProfitRate = rates.reduce((a, b) => a + b, 0);
        const winCount = rates.filter((r) => r > 0).length;
        const best = trades.reduce((b, t) => (t.profitRate > b.profitRate ? t : b), trades[0]);

        return {
          user,
          tradeCount: trades.length,
          avgProfitRate,
          totalProfitRate,
          winRate: (winCount / rates.length) * 100,
          bestTrade: { ticker: best.ticker, profitRate: best.profitRate },
          trades,
        };
      })
      .sort((a, b) => b.avgProfitRate - a.avgProfitRate);

    return NextResponse.json({ leaderboard, period, periodStart: periodStart.toISOString() });
  } catch (error) {
    console.error("Leaderboard error:", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
}
