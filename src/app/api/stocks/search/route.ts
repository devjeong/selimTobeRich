import { NextRequest, NextResponse } from "next/server";
import { searchStocks, getStockQuote } from "@/lib/yahoo-finance";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");
  const symbol = searchParams.get("symbol");

  if (symbol) {
    const quote = await getStockQuote(symbol);
    if (!quote) return NextResponse.json({ error: "종목을 찾을 수 없습니다" }, { status: 404 });
    return NextResponse.json(quote);
  }

  if (!query || query.trim().length < 1) {
    return NextResponse.json({ error: "검색어를 입력해주세요" }, { status: 400 });
  }

  const results = await searchStocks(query.trim());
  return NextResponse.json(results);
}
