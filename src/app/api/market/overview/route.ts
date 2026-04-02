import { NextResponse } from "next/server";
import { getMarketOverview } from "@/lib/market-overview";

export async function GET() {
  try {
    const data = await getMarketOverview();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Market overview error:", error);
    return NextResponse.json({ error: "데이터 조회 실패" }, { status: 500 });
  }
}
