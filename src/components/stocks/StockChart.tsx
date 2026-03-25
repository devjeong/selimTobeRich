"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type HistogramData,
  type LineData,
  type UTCTimestamp,
  type Time,
} from "lightweight-charts";
import type { ChartInterval, CandleItem } from "@/lib/yahoo-finance";

// ── 인터벌 정의 ────────────────────────────────────────────────────────────

const INTERVALS: { label: string; value: ChartInterval }[] = [
  { label: "1분",   value: "1m"  },
  { label: "5분",   value: "5m"  },
  { label: "15분",  value: "15m" },
  { label: "30분",  value: "30m" },
  { label: "1시간", value: "1h"  },
  { label: "4시간", value: "4h"  },
  { label: "일",    value: "1d"  },
  { label: "주",    value: "1wk" },
  { label: "월",    value: "1mo" },
  { label: "년",    value: "1y"  },
];

const INTRADAY = new Set<ChartInterval>(["1m", "5m", "15m", "30m", "1h", "4h"]);

// ── 시간 포맷터 팩토리 ────────────────────────────────────────────────────

function makeTimeFormatter(interval: ChartInterval, tz: string) {
  return (time: UTCTimestamp | { year: number; month: number; day: number }) => {
    if (typeof time !== "number") {
      return `${time.year}.${String(time.month).padStart(2, "0")}.${String(time.day).padStart(2, "0")}`;
    }
    const d = new Date(time * 1000);
    const pad = (n: number) => String(n).padStart(2, "0");

    if (interval === "1m" || interval === "5m" || interval === "15m" || interval === "30m") {
      return d.toLocaleString("ko-KR", {
        timeZone: tz, month: "numeric", day: "numeric",
        hour: "2-digit", minute: "2-digit", hour12: false,
      });
    }
    if (interval === "1h" || interval === "4h") {
      return d.toLocaleString("ko-KR", {
        timeZone: tz, month: "numeric", day: "numeric",
        hour: "2-digit", minute: "2-digit", hour12: false,
      });
    }
    if (interval === "1d" || interval === "1wk") {
      const y = d.getUTCFullYear();
      const m = pad(d.getUTCMonth() + 1);
      const dd = pad(d.getUTCDate());
      return `${y}.${m}.${dd}`;
    }
    if (interval === "1mo") {
      const y = d.getUTCFullYear();
      const m = pad(d.getUTCMonth() + 1);
      return `${y}.${m}`;
    }
    // 1y
    return `${d.getUTCFullYear()}`;
  };
}

// ── MA 계산 ───────────────────────────────────────────────────────────────

function calcMA(data: CandleItem[], period: number): LineData<Time>[] {
  return data
    .map((_, i) => {
      if (i < period - 1) return null;
      const slice = data.slice(i - period + 1, i + 1);
      const avg = slice.reduce((s, d) => s + d.close, 0) / period;
      return { time: data[i].time as UTCTimestamp, value: parseFloat(avg.toFixed(4)) };
    })
    .filter((d): d is LineData<Time> => d !== null);
}

// ── 컴포넌트 ─────────────────────────────────────────────────────────────

interface StockChartProps {
  symbol: string;
  market: "KR" | "US";
}

interface ChartResponse {
  interval: ChartInterval;
  type: "intraday" | "daily";
  data: CandleItem[];
}

export default function StockChart({ symbol, market }: StockChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef     = useRef<IChartApi | null>(null);
  const candleRef    = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeRef    = useRef<ISeriesApi<"Histogram"> | null>(null);
  const ma5Ref       = useRef<ISeriesApi<"Line"> | null>(null);
  const ma20Ref      = useRef<ISeriesApi<"Line"> | null>(null);
  const marketRef    = useRef(market);

  const [interval, setIntervalVal] = useState<ChartInterval>("1d");
  const [chartReady, setChartReady] = useState(false);
  const [showMA5,  setShowMA5]  = useState(true);
  const [showMA20, setShowMA20] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  const isIntraday = INTRADAY.has(interval);
  const showMA = !isIntraday;
  const tz = marketRef.current === "KR" ? "Asia/Seoul" : "America/New_York";

  const priceFormat =
    marketRef.current === "KR"
      ? { type: "price" as const, precision: 0, minMove: 1 }
      : { type: "price" as const, precision: 2, minMove: 0.01 };

  // ── 차트 초기화 ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: { background: { color: "#ffffff" }, textColor: "#374151" },
      grid: { vertLines: { color: "#f3f4f6" }, horzLines: { color: "#f3f4f6" } },
      rightPriceScale: { borderColor: "#e5e7eb" },
      timeScale: { borderColor: "#e5e7eb", timeVisible: false, secondsVisible: false },
      height: 340,
    });

    candleRef.current = chart.addSeries(CandlestickSeries, {
      upColor: "#16a34a", downColor: "#dc2626",
      borderUpColor: "#16a34a", borderDownColor: "#dc2626",
      wickUpColor: "#16a34a", wickDownColor: "#dc2626",
      priceScaleId: "right", priceFormat,
    });

    volumeRef.current = chart.addSeries(HistogramSeries, {
      color: "#93c5fd", priceFormat: { type: "volume" }, priceScaleId: "volume",
    });
    chart.priceScale("volume").applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });

    ma5Ref.current = chart.addSeries(LineSeries, {
      color: "#f59e0b", lineWidth: 1,
      priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
      priceScaleId: "right", priceFormat,
    });

    ma20Ref.current = chart.addSeries(LineSeries, {
      color: "#3b82f6", lineWidth: 1,
      priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
      priceScaleId: "right", priceFormat,
    });

    chartRef.current = chart;
    setChartReady(true);

    return () => {
      chart.remove();
      chartRef.current = null;
      candleRef.current = null;
      volumeRef.current = null;
      ma5Ref.current = null;
      ma20Ref.current = null;
      setChartReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 인터벌 변경 → timeScale + localization 갱신 ────────────────────────
  useEffect(() => {
    if (!chartRef.current) return;
    const intraday = INTRADAY.has(interval);
    chartRef.current.applyOptions({
      localization: { timeFormatter: makeTimeFormatter(interval, tz) },
      timeScale: {
        borderColor: "#e5e7eb",
        timeVisible: intraday,
        secondsVisible: false,
      },
    });
  }, [interval, tz]);

  // ── MA 토글 ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!ma5Ref.current || !ma20Ref.current) return;
    ma5Ref.current.applyOptions({ visible: showMA5 });
    ma20Ref.current.applyOptions({ visible: showMA20 });
  }, [showMA5, showMA20]);

  // ── 데이터 fetch ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!chartReady || !candleRef.current || !volumeRef.current || !ma5Ref.current || !ma20Ref.current || !chartRef.current) return;

    let cancelled = false;
    setLoading(true);
    setError(false);

    fetch(`/api/stocks/${encodeURIComponent(symbol)}/history?interval=${interval}`)
      .then((res) => {
        if (!res.ok) throw new Error("fetch failed");
        return res.json() as Promise<ChartResponse>;
      })
      .then(({ data }) => {
        if (cancelled) return;

        const candles: CandlestickData<Time>[] = data.map((d) => ({
          time: d.time as UTCTimestamp,
          open: d.open, high: d.high, low: d.low, close: d.close,
        }));
        const volumes: HistogramData<Time>[] = data.map((d) => ({
          time: d.time as UTCTimestamp,
          value: d.volume,
          color: d.close >= d.open ? "#bbf7d0" : "#fecaca",
        }));

        candleRef.current!.setData(candles);
        volumeRef.current!.setData(volumes);

        if (INTRADAY.has(interval)) {
          ma5Ref.current!.setData([]);
          ma20Ref.current!.setData([]);
        } else {
          ma5Ref.current!.setData(calcMA(data, 5));
          ma20Ref.current!.setData(calcMA(data, 20));
        }

        chartRef.current!.timeScale().fitContent();
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) { setError(true); setLoading(false); }
      });

    return () => { cancelled = true; };
  }, [chartReady, symbol, interval]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        {/* MA 토글 (일봉 이상에서만) */}
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-gray-700 mr-1">차트</span>
          {showMA && (
            <>
              <button
                onClick={() => setShowMA5((v) => !v)}
                className={`px-2 py-0.5 text-xs rounded font-medium border transition-colors ${
                  showMA5 ? "bg-amber-400 border-amber-400 text-white" : "bg-white border-gray-300 text-gray-400"
                }`}
              >
                MA5
              </button>
              <button
                onClick={() => setShowMA20((v) => !v)}
                className={`px-2 py-0.5 text-xs rounded font-medium border transition-colors ${
                  showMA20 ? "bg-blue-500 border-blue-500 text-white" : "bg-white border-gray-300 text-gray-400"
                }`}
              >
                MA20
              </button>
            </>
          )}
        </div>

        {/* 인터벌 버튼 */}
        <div className="flex gap-1 flex-wrap">
          {INTERVALS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setIntervalVal(value)}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                interval === value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 차트 영역 */}
      <div className="relative">
        <div ref={containerRef} className="w-full" style={{ height: 340 }} />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {error && !loading && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400">
            차트 데이터를 불러올 수 없습니다
          </div>
        )}
      </div>
    </div>
  );
}
