import YahooFinanceClass from "yahoo-finance2";
import { searchKrStocks, getKrStockName } from "./kr-stocks";

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
}

export interface StockDetail extends StockQuote {
  volume: number | null;
  open: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
}

function detectMarket(symbol: string): "KR" | "US" {
  return symbol.endsWith(".KS") || symbol.endsWith(".KQ") ? "KR" : "US";
}

/** 쿼리에 한글 포함 여부 */
function hasKorean(text: string): boolean {
  return /[\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F]/.test(text);
}

export async function searchStocks(query: string): Promise<StockSearchResult[]> {
  // 한글 포함 → 번들된 국내 종목 정적 리스트 검색
  if (hasKorean(query)) {
    const krResults = searchKrStocks(query);
    return krResults.map((s) => ({
      symbol: s.symbol,
      name: s.name,
      exchange: s.exchange,
      market: "KR" as const,
      type: "Equity",
    }));
  }

  // 영문/티커 → Yahoo Finance
  try {
    const results = await yahooFinance.search(query, {
      newsCount: 0,
      quotesCount: 10,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quotes: any[] = (results as any).quotes || [];

    return quotes
      .filter(
        (q) =>
          q.quoteType === "EQUITY" &&
          q.symbol &&
          (q.symbol.endsWith(".KS") ||
            q.symbol.endsWith(".KQ") ||
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
  // KR 종목은 로컬 DB에서 한국어 이름 우선 사용
  if (detectMarket(symbol) === "KR") {
    return getKrStockName(symbol) ?? yahooName;
  }
  return yahooName;
}

export async function getStockQuote(symbol: string): Promise<StockQuote | null> {
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
