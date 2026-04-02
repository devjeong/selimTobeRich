import { getMarketOverview } from "@/lib/market-overview";
import { MarketOverviewClient } from "./MarketOverviewClient";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "시장 현황 - StockShare",
  description: "KOSPI, KOSDAQ, 나스닥, S&P500, 다우존스, 달러/원 환율, WTI 원유, 금, 은 실시간 현황",
};

export default async function MarketPage() {
  const initialData = await getMarketOverview();

  return (
    <div className="py-6 px-4">
      <MarketOverviewClient initialData={initialData} />
    </div>
  );
}
