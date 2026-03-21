import stockData from "./kr-stocks-data.json";

export interface KrStock {
  symbol: string;
  name: string;
  market: "KR";
  exchange: "KOSPI" | "KOSDAQ";
}

const KR_STOCKS: KrStock[] = stockData.stocks as KrStock[];

/** 심볼로 한국어 종목명 조회 (예: "090710.KQ" → "휴림로봇") */
export function getKrStockName(symbol: string): string | null {
  const stock = KR_STOCKS.find((s) => s.symbol === symbol);
  return stock?.name ?? null;
}

export function searchKrStocks(query: string): KrStock[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const results = KR_STOCKS.filter((s) => {
    const nameMatch = s.name.toLowerCase().includes(q);
    const symbolMatch = s.symbol.toLowerCase().includes(q);
    return nameMatch || symbolMatch;
  });

  // 이름이 쿼리로 시작하는 것을 앞으로 정렬
  results.sort((a, b) => {
    const aStarts = a.name.toLowerCase().startsWith(q) ? 0 : 1;
    const bStarts = b.name.toLowerCase().startsWith(q) ? 0 : 1;
    return aStarts - bStarts;
  });

  return results.slice(0, 10);
}
