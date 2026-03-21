import { LeaderboardTable } from "@/components/leaderboard/LeaderboardTable";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "수익률 랭킹 | StockShare",
  description: "매수/매도 인증 기반 개인별 수익률 랭킹",
};

export default function LeaderboardPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          🏆 수익률 랭킹
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          매도 인증 데이터를 기반으로 기간별 개인 수익률을 집계합니다. 행을 클릭하면 상세 내역을 확인할 수 있습니다.
        </p>
      </div>

      <LeaderboardTable />

      <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-xs text-yellow-700">
        <p className="font-semibold mb-1">⚠️ 안내</p>
        <p>랭킹은 해당 기간 내 등록된 매도 인증 기록 기준으로 산출됩니다. 평균 수익률 = 해당 기간 내 매도 인증 수익률 합계 / 건수</p>
      </div>
    </div>
  );
}
