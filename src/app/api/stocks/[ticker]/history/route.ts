import { NextRequest, NextResponse } from "next/server";
import { getStockCandles, type ChartInterval } from "@/lib/yahoo-finance";

const VALID_INTERVALS: ChartInterval[] = [
  "1m", "5m", "15m", "30m", "1h", "4h",
  "1d", "1wk", "1mo", "1y",
];

const INTRADAY = new Set<ChartInterval>(["1m", "5m", "15m", "30m", "1h", "4h"]);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  const symbol = decodeURIComponent(ticker);
  const interval = (request.nextUrl.searchParams.get("interval") ?? "1d") as ChartInterval;

  if (!VALID_INTERVALS.includes(interval)) {
    return NextResponse.json({ error: "Invalid interval" }, { status: 400 });
  }

  const data = await getStockCandles(symbol, interval);
  return NextResponse.json({ interval, type: INTRADAY.has(interval) ? "intraday" : "daily", data });
}
