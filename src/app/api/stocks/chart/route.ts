import { NextRequest, NextResponse } from "next/server";
import YahooFinanceClass from "yahoo-finance2";

const yahooFinance = new YahooFinanceClass();

export interface ChartDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const PERIOD_CONFIG: Record<string, { daysBack: number; interval: "1d" | "1wk" }> = {
  "1w":  { daysBack: 7,   interval: "1d" },
  "1mo": { daysBack: 30,  interval: "1d" },
  "3mo": { daysBack: 90,  interval: "1d" },
  "1y":  { daysBack: 365, interval: "1wk" },
};

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get("ticker");
  const period = req.nextUrl.searchParams.get("period") || "1mo";

  if (!ticker) {
    return NextResponse.json({ error: "ticker is required" }, { status: 400 });
  }

  const config = PERIOD_CONFIG[period] ?? PERIOD_CONFIG["1mo"];
  const period1 = new Date(Date.now() - config.daysBack * 24 * 60 * 60 * 1000);

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (yahooFinance as any).historical(ticker, {
      period1,
      interval: config.interval,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: ChartDataPoint[] = result.map((item: any) => ({
      date: item.date instanceof Date
        ? item.date.toISOString().split("T")[0]
        : String(item.date).split("T")[0],
      open:   item.open   ?? 0,
      high:   item.high   ?? 0,
      low:    item.low    ?? 0,
      close:  item.close  ?? 0,
      volume: item.volume ?? 0,
    }));

    return NextResponse.json(data);
  } catch (error) {
    console.error("Yahoo Finance historical error:", error);
    return NextResponse.json({ error: "Failed to fetch chart data" }, { status: 500 });
  }
}
