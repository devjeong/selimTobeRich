"use client";

import Link from "next/link";
import type { MarketItem } from "@/types/market";
import { MarketSparkline } from "./MarketSparkline";

interface Props {
  item: MarketItem;
}

/** 가격 표시 포맷 */
function formatPrice(item: MarketItem): string {
  if (item.price == null) return "-";
  if (item.currency === "KRW") {
    return item.price.toLocaleString("ko-KR", { maximumFractionDigits: 2 });
  }
  // 은(SI=F)은 소수 4자리까지
  if (item.symbol === "SI=F") {
    return item.price.toLocaleString("en-US", {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    });
  }
  return item.price.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** 등락 절댓값 포맷 */
function formatChange(item: MarketItem): string {
  if (item.change == null) return "-";
  const abs = Math.abs(item.change);
  const sign = item.change >= 0 ? "+" : "-";
  if (item.currency === "KRW") {
    return `${sign}${abs.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}`;
  }
  if (item.symbol === "SI=F") {
    return `${sign}${abs.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`;
  }
  return `${sign}${abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** 등락률 포맷 */
function formatChangePercent(pct: number): string {
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

/** 통화 단위 접미사 */
function currencySuffix(item: MarketItem): string {
  if (item.symbol === "USDKRW=X") return "원";
  if (item.currency === "KRW") return "원";
  if (item.group === "COMMODITY") {
    if (item.symbol === "CL=F") return "$/배럴";
    if (item.symbol === "GC=F") return "$/oz";
    if (item.symbol === "SI=F") return "$/oz";
  }
  return "";
}

export function MarketCard({ item }: Props) {
  const pct = item.changePercent ?? 0;
  const isPositive = pct >= 0;
  const hasData = item.price != null;

  const changeColor = !hasData
    ? "text-gray-400"
    : isPositive
    ? "text-green-600"
    : "text-red-600";

  const arrow = isPositive ? "▲" : "▼";
  const suffix = currencySuffix(item);

  // 종목 상세 페이지로 이동
  const href = `/stocks/${encodeURIComponent(item.symbol)}`;

  return (
    <Link href={href}>
      <div className="bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer h-full flex flex-col gap-2">
        {/* 상단: 라벨 + 실시간/전일 뱃지 */}
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-gray-800">{item.label}</span>
            {suffix && (
              <span className="text-xs text-gray-400 mt-0.5">{suffix}</span>
            )}
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            {item.isLive ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
                <span className="text-xs text-green-600 font-medium">실시간</span>
              </>
            ) : (
              <>
                <span className="inline-flex h-2 w-2 rounded-full bg-gray-300" />
                <span className="text-xs text-gray-400">전일</span>
              </>
            )}
          </div>
        </div>

        {/* Sparkline 차트 */}
        <div className="flex-1">
          <MarketSparkline data={item.sparkline} isPositive={isPositive} />
        </div>

        {/* 현재가 */}
        <div className={`text-lg font-bold ${changeColor}`}>
          {formatPrice(item)}
        </div>

        {/* 등락 */}
        {item.change != null && item.changePercent != null ? (
          <div className={`text-xs font-medium ${changeColor}`}>
            <span>{arrow}</span>
            <span className="ml-1">{formatChange(item)}</span>
            <span className="ml-1 opacity-80">
              {formatChangePercent(item.changePercent)}
            </span>
          </div>
        ) : (
          <div className="text-xs text-gray-400">데이터 없음</div>
        )}
      </div>
    </Link>
  );
}
