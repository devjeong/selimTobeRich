import { NextRequest, NextResponse } from "next/server";

export interface ChartDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const PERIOD_CONFIG: Record<string, { range: string; interval: string }> = {
  "1w":  { range: "5d",  interval: "1d" },
  "1mo": { range: "1mo", interval: "1d" },
  "3mo": { range: "3mo", interval: "1d" },
  "1y":  { range: "1y",  interval: "1wk" },
};

// query1 실패 시 query2로 fallback
const YF_HOSTS = [
  "https://query1.finance.yahoo.com",
  "https://query2.finance.yahoo.com",
];

async function fetchYahooChart(
  ticker: string,
  range: string,
  interval: string
): Promise<ChartDataPoint[]> {
  let lastError: unknown;

  for (const host of YF_HOSTS) {
    const url = `${host}/v8/finance/chart/${encodeURIComponent(ticker)}?interval=${interval}&range=${range}&includePrePost=false&events=div%2Csplit`;
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "application/json",
        },
        next: { revalidate: 300 },
      });

      if (!res.ok) {
        lastError = new Error(`HTTP ${res.status} from ${host}`);
        continue;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const json: any = await res.json();
      const result = json?.chart?.result?.[0];

      if (!result) {
        lastError = new Error("No chart result in response");
        continue;
      }

      const timestamps: number[] = result.timestamp ?? [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const q: any = result.indicators?.quote?.[0] ?? {};

      const data: ChartDataPoint[] = timestamps
        .map((ts, i) => ({
          date: new Date(ts * 1000).toISOString().split("T")[0],
          open:   q.open?.[i]   ?? 0,
          high:   q.high?.[i]   ?? 0,
          low:    q.low?.[i]    ?? 0,
          close:  q.close?.[i]  ?? 0,
          volume: q.volume?.[i] ?? 0,
        }))
        .filter((d) => d.close > 0);

      return data;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError ?? new Error("All Yahoo Finance hosts failed");
}

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get("ticker");
  const period = req.nextUrl.searchParams.get("period") || "1mo";

  if (!ticker) {
    return NextResponse.json({ error: "ticker is required" }, { status: 400 });
  }

  const config = PERIOD_CONFIG[period] ?? PERIOD_CONFIG["1mo"];

  try {
    const data = await fetchYahooChart(ticker, config.range, config.interval);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Yahoo Finance chart error:", error);
    return NextResponse.json({ error: "Failed to fetch chart data" }, { status: 500 });
  }
}
