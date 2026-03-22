"use client";

import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  useXAxisScale,
  useYAxisScale,
  usePlotArea,
} from "recharts";
import type { ChartDataPoint } from "@/app/api/stocks/chart/route";

type Period = "1d" | "1w" | "1mo" | "3mo" | "1y";
type ChartType = "line" | "candle";

const PERIODS: { label: string; value: Period }[] = [
  { label: "1일", value: "1d" },
  { label: "1주", value: "1w" },
  { label: "1개월", value: "1mo" },
  { label: "3개월", value: "3mo" },
  { label: "1년", value: "1y" },
];

function formatVolume(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
}

function formatPrice(v: number, currency: string): string {
  if (currency === "KRW") return v.toLocaleString("ko-KR") + "원";
  return "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface TooltipPayloadItem {
  payload: ChartDataPoint;
  value: number;
}

function CustomTooltip({
  active,
  payload,
  currency,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
  currency: string;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-700 mb-1">{d.date}</p>
      <p className="text-gray-600">시가: <span className="font-medium text-gray-900">{formatPrice(d.open, currency)}</span></p>
      <p className="text-gray-600">고가: <span className="font-medium text-green-600">{formatPrice(d.high, currency)}</span></p>
      <p className="text-gray-600">저가: <span className="font-medium text-red-500">{formatPrice(d.low, currency)}</span></p>
      <p className="text-gray-600">종가: <span className="font-medium text-gray-900">{formatPrice(d.close, currency)}</span></p>
      <p className="text-gray-600 mt-1">거래량: <span className="font-medium text-gray-900">{d.volume.toLocaleString()}</span></p>
    </div>
  );
}

// 캔들스틱 레이어 — recharts v3 hooks 사용
function CandlestickLayer({ data }: { data: ChartDataPoint[] }) {
  const xScale = useXAxisScale();
  const yScale = useYAxisScale();
  const plotArea = usePlotArea();

  if (!xScale || !yScale || !plotArea || !data.length) return null;

  // 밴드 스케일이면 bandwidth 사용, 아니면 균등 분할
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bandwidth = (xScale as any).bandwidth?.() ?? 0;
  const effectiveWidth = bandwidth > 0 ? bandwidth : plotArea.width / data.length;
  const cw = Math.max(2, effectiveWidth * 0.6);

  return (
    <>
      {data.map((entry, i) => {
        const x = xScale(entry.date);
        if (x == null) return null;

        const openY  = yScale(entry.open);
        const closeY = yScale(entry.close);
        const highY  = yScale(entry.high);
        const lowY   = yScale(entry.low);

        if (openY == null || closeY == null || highY == null || lowY == null) return null;

        const isUp = entry.close >= entry.open;
        const color = isUp ? "#26a69a" : "#ef5350";
        const cx = x + effectiveWidth / 2;
        const bodyTop = Math.min(openY, closeY);
        const bodyHeight = Math.max(1, Math.abs(closeY - openY));

        return (
          <g key={i}>
            {/* 꼬리(wick): high → low */}
            <line x1={cx} y1={highY} x2={cx} y2={lowY} stroke={color} strokeWidth={1} />
            {/* 몸통(body): open → close */}
            <rect x={cx - cw / 2} y={bodyTop} width={cw} height={bodyHeight} fill={color} />
          </g>
        );
      })}
    </>
  );
}

interface StockChartProps {
  ticker: string;
  currency: string;
  isPositive: boolean;
}

export function StockChart({ ticker, currency, isPositive }: StockChartProps) {
  const [period, setPeriod] = useState<Period>("1mo");
  const [chartType, setChartType] = useState<ChartType>("line");
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    fetch(`/api/stocks/chart?ticker=${encodeURIComponent(ticker)}&period=${period}`)
      .then((r) => r.json())
      .then((json) => {
        if (Array.isArray(json)) {
          setData(json);
        } else {
          setError(true);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [ticker, period]);

  const color = isPositive ? "#16a34a" : "#dc2626";
  const fillColor = isPositive ? "#dcfce7" : "#fee2e2";

  // 라인 차트: close 기준 도메인
  const lineDomain: [(v: number) => number, (v: number) => number] = [
    (dataMin: number) => Math.floor(dataMin * 0.995),
    (dataMax: number) => Math.ceil(dataMax * 1.005),
  ];

  // 캔들 차트: high/low 전체 범위 도메인
  const candleYMin = data.length ? Math.floor(Math.min(...data.map((d) => d.low))  * 0.995) : 0;
  const candleYMax = data.length ? Math.ceil( Math.max(...data.map((d) => d.high)) * 1.005) : 1;

  // XAxis tick 포맷 — 1일(분봉)은 그대로, 나머지는 "MM-DD"
  const tickFormatter = (v: string) => (period === "1d" ? v : v.slice(5));

  const yAxisWidth = currency === "KRW" ? 64 : 56;
  const yAxisTickFormatter = (v: number) =>
    currency === "KRW"
      ? v.toLocaleString("ko-KR")
      : v.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      {/* 헤더: 기간 버튼 + 차트 유형 토글 */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900">차트</h2>
        <div className="flex items-center gap-2">
          {/* 기간 버튼 */}
          <div className="flex gap-1">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  period === p.value
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {/* 구분선 */}
          <div className="w-px h-5 bg-gray-200" />
          {/* 차트 유형 토글 */}
          <div className="flex gap-1">
            <button
              onClick={() => setChartType("line")}
              title="라인 차트"
              className={`px-2 py-1 rounded-md text-sm font-medium transition-colors ${
                chartType === "line"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              📈
            </button>
            <button
              onClick={() => setChartType("candle")}
              title="캔들스틱 차트"
              className={`px-2 py-1 rounded-md text-sm font-medium transition-colors ${
                chartType === "candle"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              🕯️
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-52 text-gray-400 text-sm">
          차트 데이터 로딩 중...
        </div>
      )}

      {!loading && error && (
        <div className="flex items-center justify-center h-52 text-gray-400 text-sm">
          차트 데이터를 불러올 수 없습니다
        </div>
      )}

      {!loading && !error && data.length > 0 && (
        <>
          {/* 가격 차트 */}
          {chartType === "line" ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.18} />
                    <stop offset="95%" stopColor={color} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={tickFormatter}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={lineDomain}
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  tickLine={false}
                  axisLine={false}
                  width={yAxisWidth}
                  tickFormatter={yAxisTickFormatter}
                />
                <Tooltip content={<CustomTooltip currency={currency} />} />
                <Area
                  type="monotone"
                  dataKey="close"
                  stroke={color}
                  strokeWidth={2}
                  fill="url(#priceGradient)"
                  dot={false}
                  activeDot={{ r: 4, fill: color }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={tickFormatter}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={[candleYMin, candleYMax]}
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  tickLine={false}
                  axisLine={false}
                  width={yAxisWidth}
                  tickFormatter={yAxisTickFormatter}
                />
                <Tooltip content={<CustomTooltip currency={currency} />} />
                <CandlestickLayer data={data} />
              </ComposedChart>
            </ResponsiveContainer>
          )}

          {/* 거래량 차트 */}
          <div className="mt-2">
            <p className="text-xs text-gray-400 mb-1 pl-1">거래량</p>
            <ResponsiveContainer width="100%" height={60}>
              <BarChart data={data} margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
                <XAxis dataKey="date" hide />
                <YAxis hide />
                <Tooltip
                  formatter={(v) => [typeof v === "number" ? v.toLocaleString() : v, "거래량"]}
                  contentStyle={{ fontSize: 12 }}
                  cursor={{ fill: "rgba(0,0,0,0.04)" }}
                />
                <Bar dataKey="volume" fill={fillColor} stroke={color} strokeWidth={0.5} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
