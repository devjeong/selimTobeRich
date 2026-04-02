"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { MarketOverviewResponse, MarketItem } from "@/types/market";
import { MarketSection } from "@/components/market/MarketSection";

interface Props {
  initialData: MarketOverviewResponse;
}

export function MarketOverviewClient({ initialData }: Props) {
  const { data } = useQuery<MarketOverviewResponse>({
    queryKey: ["market-overview"],
    queryFn: () => fetch("/api/market/overview").then((r) => r.json()),
    initialData,
    staleTime: 4_000,
    refetchInterval: 5_000,
    refetchIntervalInBackground: false,
  });

  const [relativeTime, setRelativeTime] = useState("");

  useEffect(() => {
    function update() {
      if (!data?.fetchedAt) return;
      const diff = Math.floor(
        (Date.now() - new Date(data.fetchedAt).getTime()) / 1000
      );
      if (diff < 60) setRelativeTime(`${diff}초 전 업데이트`);
      else setRelativeTime(`${Math.floor(diff / 60)}분 전 업데이트`);
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [data?.fetchedAt]);

  const krItems = data.items.filter((i: MarketItem) => i.group === "KR");
  const usItems = data.items.filter((i: MarketItem) => i.group === "US");
  const fxItems = data.items.filter(
    (i: MarketItem) => i.group === "FX" || i.group === "COMMODITY"
  );

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* 페이지 헤더 */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">시장 현황</h1>
          <p className="text-sm text-gray-500 mt-1">
            국내·해외 주요 지수, 환율, 원자재 가격
          </p>
        </div>
        <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1.5 rounded-full mt-1">
          {relativeTime || "로딩 중..."}
        </span>
      </div>

      {/* 국내 지수 — 현재가 */}
      <MarketSection title="국내 지수" items={krItems} />

      {/* 미국 지수 — 전일 종가 */}
      <MarketSection title="미국 지수" items={usItems} badge="전일 종가" />

      {/* 환율 · 원자재 */}
      <MarketSection title="환율 · 원자재" items={fxItems} />
    </div>
  );
}
