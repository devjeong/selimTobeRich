import YahooFinanceClass from "yahoo-finance2";
import { getStockQuote } from "./yahoo-finance";
import type { MarketItem, MarketOverviewResponse } from "@/types/market";

const yahooFinance = new YahooFinanceClass();

// ── 심볼 설정 ─────────────────────────────────────────────────────────────────

const MARKET_SYMBOLS: Array<{
  symbol: string;
  label: string;
  group: MarketItem["group"];
  currency: string;
}> = [
  { symbol: "^KS11",    label: "KOSPI",    group: "KR",        currency: "KRW" },
  { symbol: "^KQ11",    label: "KOSDAQ",   group: "KR",        currency: "KRW" },
  { symbol: "^IXIC",    label: "나스닥",   group: "US",        currency: "USD" },
  { symbol: "^GSPC",    label: "S&P 500",  group: "US",        currency: "USD" },
  { symbol: "^DJI",     label: "다우존스", group: "US",        currency: "USD" },
  { symbol: "USDKRW=X", label: "달러/원",  group: "FX",        currency: "KRW" },
  { symbol: "CL=F",     label: "WTI 원유", group: "COMMODITY", currency: "USD" },
  { symbol: "GC=F",     label: "금",       group: "COMMODITY", currency: "USD" },
  { symbol: "SI=F",     label: "은",       group: "COMMODITY", currency: "USD" },
];

// ── 한국 장 시간 판별 (KST 09:00~15:30 = UTC 00:00~06:30, 평일) ─────────────

function isKoreanMarketOpen(): boolean {
  const now = new Date();
  const utcDay = now.getUTCDay(); // 0=Sun, 6=Sat
  if (utcDay === 0 || utcDay === 6) return false;
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  return utcMinutes >= 0 && utcMinutes < 390; // KST 09:00~15:30
}

// ── Sparkline 조회 (최근 30일 일봉 종가) ──────────────────────────────────────

async function getSparkline(symbol: string): Promise<number[]> {
  try {
    const period1 = new Date(Date.now() - 30 * 86_400_000);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (yahooFinance as any).chart(
      symbol,
      { period1, interval: "1d" },
      { validateResult: false }
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const closes: number[] = ((result.quotes ?? []) as any[])
      .filter((q) => q.close != null)
      .map((q) => q.close as number);
    return closes.slice(-30);
  } catch {
    return [];
  }
}

// ── 서버 인메모리 캐시 (분리) ──────────────────────────────────────────────────
// quote: 4초 TTL  — 5초 폴링 주기에 맞춰 빠르게 갱신
// sparkline: 10분 TTL — 일봉 데이터는 자주 변하지 않으므로 재사용

const QUOTE_TTL      = 4_000;        // 4초
const SPARKLINE_TTL  = 10 * 60_000;  // 10분

let quoteCache: {
  quotes: (Awaited<ReturnType<typeof import("./yahoo-finance").getStockQuote>>)[];
  expiresAt: number;
} | null = null;

let sparklineCache: {
  sparklines: number[][];
  expiresAt: number;
} | null = null;

// ── 메인 조회 함수 ────────────────────────────────────────────────────────────

export async function getMarketOverview(): Promise<MarketOverviewResponse> {
  const now = Date.now();

  // 스파크라인: 만료된 경우만 재조회
  if (!sparklineCache || now >= sparklineCache.expiresAt) {
    const sparklines = await Promise.all(
      MARKET_SYMBOLS.map((s) => getSparkline(s.symbol))
    );
    sparklineCache = { sparklines, expiresAt: now + SPARKLINE_TTL };
  }

  // 쿼트: 만료된 경우만 재조회 (매 5초 폴링 시 대부분 여기서 갱신)
  if (!quoteCache || now >= quoteCache.expiresAt) {
    const quotes = await Promise.all(
      MARKET_SYMBOLS.map((s) => getStockQuote(s.symbol))
    );
    quoteCache = { quotes, expiresAt: now + QUOTE_TTL };
  }

  const krLive = isKoreanMarketOpen();

  const items: MarketItem[] = MARKET_SYMBOLS.map((config, i) => {
    const quote = quoteCache!.quotes[i];
    const isLive = config.group === "KR" ? krLive : false;
    return {
      symbol: config.symbol,
      label: config.label,
      group: config.group,
      price: quote?.price ?? null,
      change: quote?.change ?? null,
      changePercent: quote?.changePercent ?? null,
      currency: config.currency,
      isLive,
      sparkline: sparklineCache!.sparklines[i],
    };
  });

  return {
    items,
    fetchedAt: new Date().toISOString(),
  };
}
