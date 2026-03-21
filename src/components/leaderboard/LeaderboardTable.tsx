"use client";

import { useState } from "react";
import { formatProfitRate, formatDate } from "@/lib/utils";

type Trade = {
  id: string;
  ticker: string;
  buyPrice: number;
  sellPrice: number;
  profitRate: number;
  shares: number | null;
  note: string | null;
  createdAt: string;
};

type LeaderboardEntry = {
  user: { id: string; username: string; image: string | null };
  tradeCount: number;
  avgProfitRate: number;
  totalProfitRate: number;
  winRate: number;
  bestTrade: { ticker: string; profitRate: number };
  trades: Trade[];
};

type Period = "today" | "week" | "month" | "year";

const PERIOD_LABELS: Record<Period, string> = {
  today: "오늘",
  week: "이번 주",
  month: "이번 달",
  year: "올해",
};

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-2xl leading-none">🥇</span>;
  if (rank === 2) return <span className="text-2xl leading-none">🥈</span>;
  if (rank === 3) return <span className="text-2xl leading-none">🥉</span>;
  return (
    <span className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-500">
      {rank}
    </span>
  );
}

function ProfitBadge({ rate }: { rate: number }) {
  const isPositive = rate >= 0;
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-md text-xs font-bold ${
        isPositive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
      }`}
    >
      {formatProfitRate(rate)}
    </span>
  );
}

export function LeaderboardTable() {
  const [period, setPeriod] = useState<Period>("month");
  const [data, setData] = useState<LeaderboardEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [fetched, setFetched] = useState<Set<Period>>(new Set());

  const fetchData = async (p: Period) => {
    if (fetched.has(p)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/leaderboard?period=${p}`);
      const json = await res.json();
      setData(json.leaderboard);
      setFetched((prev) => new Set(prev).add(p));
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodChange = async (p: Period) => {
    setPeriod(p);
    setExpandedUser(null);
    setData(null);
    await fetchData(p);
  };

  // Initial load
  if (data === null && !loading && !fetched.has(period)) {
    fetchData(period);
  }

  const toggleExpand = (userId: string) => {
    setExpandedUser((prev) => (prev === userId ? null : userId));
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Period tabs */}
      <div className="flex border-b border-gray-200 bg-gray-50">
        {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => handlePeriodChange(p)}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              period === p
                ? "bg-white border-b-2 border-blue-600 text-blue-600"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            }`}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Table header */}
      <div className="grid grid-cols-12 gap-2 px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100">
        <div className="col-span-1 text-center">순위</div>
        <div className="col-span-3">사용자</div>
        <div className="col-span-2 text-right">종목 수</div>
        <div className="col-span-2 text-right">승률</div>
        <div className="col-span-2 text-right">평균 수익률</div>
        <div className="col-span-2 text-right">합산 수익률</div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-16 text-center text-gray-400 text-sm">
          <div className="inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2" />
          <p>로딩 중...</p>
        </div>
      ) : data && data.length === 0 ? (
        <div className="py-16 text-center text-gray-400 text-sm">
          <p className="text-3xl mb-3">📊</p>
          <p>{PERIOD_LABELS[period]} 매도 인증 데이터가 없습니다</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {(data ?? []).map((entry, index) => {
            const rank = index + 1;
            const isExpanded = expandedUser === entry.user.id;

            return (
              <div key={entry.user.id}>
                {/* Row */}
                <button
                  onClick={() => toggleExpand(entry.user.id)}
                  className={`w-full grid grid-cols-12 gap-2 px-4 py-3.5 text-sm text-left transition-colors ${
                    rank <= 3
                      ? "hover:bg-yellow-50"
                      : "hover:bg-gray-50"
                  } ${isExpanded ? (rank <= 3 ? "bg-yellow-50" : "bg-gray-50") : ""}`}
                >
                  <div className="col-span-1 flex items-center justify-center">
                    <RankBadge rank={rank} />
                  </div>

                  <div className="col-span-3 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm flex-shrink-0">
                      {entry.user.username[0]?.toUpperCase() ?? "U"}
                    </div>
                    <span className="font-medium text-gray-900 truncate">{entry.user.username}</span>
                  </div>

                  <div className="col-span-2 flex items-center justify-end">
                    <span className="text-gray-600">{entry.tradeCount}건</span>
                  </div>

                  <div className="col-span-2 flex items-center justify-end">
                    <span className={`text-sm font-medium ${entry.winRate >= 50 ? "text-green-600" : "text-red-500"}`}>
                      {entry.winRate.toFixed(0)}%
                    </span>
                  </div>

                  <div className="col-span-2 flex items-center justify-end">
                    <ProfitBadge rate={entry.avgProfitRate} />
                  </div>

                  <div className="col-span-2 flex items-center justify-end gap-1">
                    <ProfitBadge rate={entry.totalProfitRate} />
                    <span className="text-gray-300 text-xs ml-1">{isExpanded ? "▲" : "▼"}</span>
                  </div>
                </button>

                {/* Expanded trade details */}
                {isExpanded && (
                  <div className="bg-gray-50 border-t border-gray-100 px-4 py-3">
                    <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                      매도 인증 내역 ({entry.tradeCount}건)
                    </p>
                    <div className="space-y-1.5">
                      {entry.trades.map((trade) => (
                        <div
                          key={trade.id}
                          className="flex items-center justify-between bg-white rounded-lg px-3 py-2 text-xs border border-gray-100"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-gray-800 w-24 truncate">{trade.ticker}</span>
                            <span className="text-gray-400">
                              매수 {trade.buyPrice.toLocaleString()} → 매도 {trade.sellPrice.toLocaleString()}
                            </span>
                            {trade.shares && (
                              <span className="text-gray-400">{trade.shares.toLocaleString()}주</span>
                            )}
                            {trade.note && <span className="text-gray-400 italic truncate max-w-[100px]">{trade.note}</span>}
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <ProfitBadge rate={trade.profitRate} />
                            <span className="text-gray-300">{formatDate(trade.createdAt)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
