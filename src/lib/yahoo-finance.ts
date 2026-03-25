import YahooFinanceClass from "yahoo-finance2";
import { searchKrStocks, getKrStockBySymbol } from "./kr-stocks";

const yahooFinance = new YahooFinanceClass();

export interface StockSearchResult {
  symbol: string;
  name: string;
  exchange: string;
  market: "KR" | "US";
  type: string;
}

export interface StockQuote {
  symbol: string;
  name: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  currency: string;
  market: "KR" | "US";
  marketTime: string | null; // ISO string
}

export interface StockDetail extends StockQuote {
  volume: number | null;
  open: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
}

export type ChartInterval =
  | "1m" | "5m" | "15m" | "30m" | "1h" | "4h"
  | "1d" | "1wk" | "1mo" | "1y";

export interface CandleItem {
  time: number; // UTCTimestamp (seconds)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// 인트라데이 인터벌 여부
const INTRADAY_INTERVALS = new Set<ChartInterval>(["1m", "5m", "15m", "30m", "1h", "4h"]);

// Yahoo Finance 인터벌 매핑
const YF_INTERVAL: Partial<Record<ChartInterval, string>> = {
  "1m": "1m", "5m": "5m", "15m": "15m", "30m": "30m",
  "1h": "60m", "4h": "60m",
  "1d": "1d", "1wk": "1wk", "1mo": "1mo", "1y": "1mo",
};

// 인터벌별 조회 기간 (일 단위)
const LOOKBACK_DAYS: Record<ChartInterval, number> = {
  "1m":  5,
  "5m":  30,
  "15m": 60,
  "30m": 60,
  "1h":  365,
  "4h":  365,
  "1d":  365 * 3,
  "1wk": 365 * 10,
  "1mo": 365 * 20,
  "1y":  365 * 30,
};

/** 1h 데이터를 4h 윈도우로 집계 (UTC 기준 4시간 단위) */
function aggregateTo4H(items: CandleItem[]): CandleItem[] {
  const WINDOW = 4 * 3600;
  const groups = new Map<number, CandleItem[]>();
  for (const item of items) {
    const w = Math.floor(item.time / WINDOW) * WINDOW;
    if (!groups.has(w)) groups.set(w, []);
    groups.get(w)!.push(item);
  }
  const result: CandleItem[] = [];
  for (const [windowStart, candles] of groups) {
    if (!candles.length) continue;
    result.push({
      time: windowStart,
      open: candles[0].open,
      high: Math.max(...candles.map((c) => c.high)),
      low: Math.min(...candles.map((c) => c.low)),
      close: candles[candles.length - 1].close,
      volume: candles.reduce((s, c) => s + c.volume, 0),
    });
  }
  return result.sort((a, b) => a.time - b.time);
}

/** 월봉 데이터를 연봉으로 집계 */
function aggregateToYearly(items: CandleItem[]): CandleItem[] {
  const yearMap = new Map<number, CandleItem[]>();
  for (const item of items) {
    const year = new Date(item.time * 1000).getUTCFullYear();
    if (!yearMap.has(year)) yearMap.set(year, []);
    yearMap.get(year)!.push(item);
  }
  const result: CandleItem[] = [];
  for (const [year, candles] of yearMap) {
    if (!candles.length) continue;
    result.push({
      time: Math.floor(Date.UTC(year, 0, 1) / 1000),
      open: candles[0].open,
      high: Math.max(...candles.map((c) => c.high)),
      low: Math.min(...candles.map((c) => c.low)),
      close: candles[candles.length - 1].close,
      volume: candles.reduce((s, c) => s + c.volume, 0),
    });
  }
  return result.sort((a, b) => a.time - b.time);
}

export async function getStockCandles(symbol: string, interval: ChartInterval): Promise<CandleItem[]> {
  const yfInterval = YF_INTERVAL[interval] ?? "1d";
  const period1 = new Date(Date.now() - LOOKBACK_DAYS[interval] * 86_400_000);

  try {
    if (INTRADAY_INTERVALS.has(interval)) {
      // chart() API — 인트라데이
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (yahooFinance as any).chart(
        symbol,
        { period1, interval: yfInterval },
        { validateResult: false }
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items: CandleItem[] = ((result.quotes ?? []) as any[])
        .filter((q) => q.open != null && q.high != null && q.low != null && q.close != null)
        .map((q) => ({
          time: Math.floor(new Date(q.date).getTime() / 1000),
          open: q.open,
          high: q.high,
          low: q.low,
          close: q.close,
          volume: q.volume ?? 0,
        }));
      return interval === "4h" ? aggregateTo4H(items) : items;
    } else {
      // historical() API — 일봉/주봉/월봉/연봉
      const yesterday = new Date(Date.now() - 86_400_000);
      const results = await yahooFinance.historical(
        symbol,
        { period1, period2: yesterday, interval: yfInterval as "1d" | "1wk" | "1mo" },
        { validateResult: false } as never
      );
      const items: CandleItem[] = results
        .filter((r) => r.open != null && r.high != null && r.low != null && r.close != null)
        .map((r) => ({
          time: Math.floor(r.date.getTime() / 1000),
          open: r.open!,
          high: r.high!,
          low: r.low!,
          close: r.close!,
          volume: r.volume ?? 0,
        }));
      return interval === "1y" ? aggregateToYearly(items) : items;
    }
  } catch (error) {
    console.error(`Yahoo Finance candles error [${interval}]:`, error);
    return [];
  }
}

// ── 하위 호환 유지 (기존 API에서 사용 중) ──────────────────────────────

export interface StockHistoryItem {
  date: string;
  open: number; high: number; low: number; close: number; volume: number;
}

export async function getStockHistory(symbol: string, period1: Date): Promise<StockHistoryItem[]> {
  try {
    const yesterday = new Date(Date.now() - 86_400_000);
    const results = await yahooFinance.historical(
      symbol,
      { period1, period2: yesterday, interval: "1d" },
      { validateResult: false } as never
    );
    return results
      .filter((r) => r.open != null && r.high != null && r.low != null && r.close != null)
      .map((r) => ({
        date: r.date.toISOString().split("T")[0],
        open: r.open!, high: r.high!, low: r.low!, close: r.close!, volume: r.volume ?? 0,
      }));
  } catch (error) {
    console.error("Yahoo Finance historical error:", error);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────

function detectMarket(symbol: string): "KR" | "US" {
  return symbol.endsWith(".KS") || symbol.endsWith(".KQ") ? "KR" : "US";
}

function hasKorean(text: string): boolean {
  return /[\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F]/.test(text);
}

export async function searchStocks(query: string): Promise<StockSearchResult[]> {
  if (hasKorean(query)) {
    const krResults = searchKrStocks(query);
    return krResults.map((s) => ({
      symbol: s.symbol, name: s.name, exchange: s.exchange, market: "KR" as const, type: "Equity",
    }));
  }
  try {
    const results = await yahooFinance.search(query, { newsCount: 0, quotesCount: 10 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quotes: any[] = (results as any).quotes || [];
    return quotes
      .filter(
        (q) =>
          q.quoteType === "EQUITY" && q.symbol &&
          (q.symbol.endsWith(".KS") || q.symbol.endsWith(".KQ") ||
            (!q.symbol.includes(".") && q.exchange !== "KSC"))
      )
      .map((q) => ({
        symbol: q.symbol as string,
        name: (q.shortname || q.longname || q.symbol) as string,
        exchange: (q.exchDisp || q.exchange || "") as string,
        market: detectMarket(q.symbol as string),
        type: (q.typeDisp || "Equity") as string,
      }))
      .slice(0, 10);
  } catch (error) {
    console.error("Yahoo Finance search error:", error);
    return [];
  }
}

function resolveKrName(symbol: string, yahooName: string): string {
  if (detectMarket(symbol) === "KR") {
    return getKrStockBySymbol(symbol)?.name ?? yahooName;
  }
  return yahooName;
}

export async function getStockQuote(symbol: string): Promise<StockQuote | null> {
  try {
    const quote = await yahooFinance.quote(symbol);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const q = quote as any;
    const market = detectMarket(q.symbol);
    const yahooName: string = q.displayName || q.shortName || q.symbol;
    return {
      symbol: q.symbol,
      name: resolveKrName(q.symbol, yahooName),
      price: q.regularMarketPrice ?? null,
      change: q.regularMarketChange ?? null,
      changePercent: q.regularMarketChangePercent ?? null,
      currency: q.currency || "USD",
      market,
      marketTime: q.regularMarketTime ? new Date(q.regularMarketTime).toISOString() : null,
    };
  } catch (error) {
    console.error("Yahoo Finance quote error:", error);
    return null;
  }
}

export async function getStockDetail(symbol: string): Promise<StockDetail | null> {
  try {
    const quote = await yahooFinance.quote(symbol);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const q = quote as any;
    const yahooName: string = q.displayName || q.shortName || q.symbol;
    return {
      symbol: q.symbol,
      name: resolveKrName(q.symbol, yahooName),
      price: q.regularMarketPrice ?? null,
      change: q.regularMarketChange ?? null,
      changePercent: q.regularMarketChangePercent ?? null,
      currency: q.currency || "USD",
      market: detectMarket(q.symbol),
      marketTime: q.regularMarketTime ? new Date(q.regularMarketTime).toISOString() : null,
      volume: q.regularMarketVolume ?? null,
      open: q.regularMarketOpen ?? null,
      dayHigh: q.regularMarketDayHigh ?? null,
      dayLow: q.regularMarketDayLow ?? null,
      fiftyTwoWeekHigh: q.fiftyTwoWeekHigh ?? null,
      fiftyTwoWeekLow: q.fiftyTwoWeekLow ?? null,
    };
  } catch (error) {
    console.error("Yahoo Finance detail error:", error);
    return null;
  }
}
