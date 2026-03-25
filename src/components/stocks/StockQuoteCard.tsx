"use client";

import { useEffect, useRef, useState } from "react";
import type { StockQuote } from "@/lib/yahoo-finance";

const POLL_INTERVAL = 20_000; // 20초

interface StockQuoteCardProps {
  ticker: string;
  initialQuote: StockQuote | null;
}

function formatTime(date: Date, market: "KR" | "US") {
  return date.toLocaleTimeString(market === "KR" ? "ko-KR" : "en-US", {
    timeZone: market === "KR" ? "Asia/Seoul" : "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function StockQuoteCard({ ticker, initialQuote }: StockQuoteCardProps) {
  const [quote, setQuote] = useState<StockQuote | null>(initialQuote);
  const [refreshing, setRefreshing] = useState(false);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchQuote() {
      setRefreshing(true);
      try {
        const res = await fetch(`/api/stocks/search?symbol=${encodeURIComponent(ticker)}`);
        if (!res.ok) return;
        const data: StockQuote = await res.json();
        if (!cancelled) {
          setQuote(data);
          setLastFetched(new Date());
        }
      } finally {
        if (!cancelled) setRefreshing(false);
      }
    }

    fetchQuote();
    timerRef.current = setInterval(fetchQuote, POLL_INTERVAL);

    return () => {
      cancelled = true;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [ticker]);

  const isUp = (quote?.changePercent ?? 0) >= 0;
  const priceColor = isUp ? "text-green-600" : "text-red-600";

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{quote?.name || ticker}</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {ticker} · {quote?.market === "KR" ? "국내" : "미국"}
          </p>
        </div>

        {quote && (
          <div className="text-right">
            <div className="flex items-center justify-end gap-1.5">
              <p className="text-2xl font-bold text-gray-900">
                {quote.price?.toLocaleString()} {quote.currency}
              </p>
              {refreshing && (
                <div className="w-3.5 h-3.5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
              )}
            </div>

            {quote.changePercent != null && (
              <p className={`text-sm font-medium mt-0.5 ${priceColor}`}>
                {isUp ? "▲" : "▼"} {Math.abs(quote.changePercent).toFixed(2)}%
                {quote.change != null &&
                  ` (${quote.change >= 0 ? "+" : ""}${quote.change.toFixed(2)})`}
              </p>
            )}

            <p className="text-xs text-gray-400 mt-1">
              {lastFetched
                ? `${formatTime(lastFetched, quote.market)} 업데이트`
                : quote.marketTime
                  ? `${formatTime(new Date(quote.marketTime), quote.market)} 기준`
                  : ""}
              {" · "}
              <span className="text-gray-300">15분 지연</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
