import { prisma } from "@/lib/prisma";
import { getStockDetail } from "@/lib/yahoo-finance";
import { PostCard } from "@/components/posts/PostCard";
import StockChartWrapper from "@/components/stocks/StockChartWrapper";
import StockQuoteCard from "@/components/stocks/StockQuoteCard";
import type { PostWithUser } from "@/types";

function MetricCard({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`text-sm font-semibold text-gray-900 ${valueClass ?? ""}`}>{value}</span>
    </div>
  );
}

function fmtPrice(v: number | null, currency: string): string {
  if (v == null) return "-";
  return currency === "KRW"
    ? v.toLocaleString("ko-KR") + "원"
    : "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtVolume(v: number | null): string {
  if (v == null) return "-";
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(2) + "M";
  if (v >= 1_000) return (v / 1_000).toFixed(0) + "K";
  return v.toLocaleString();
}

export default async function StockPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  const decodedTicker = decodeURIComponent(ticker);

  const [posts, detail] = await Promise.all([
    prisma.post.findMany({
      where: { ticker: decodedTicker },
      include: {
        user: { select: { id: true, username: true, image: true } },
        _count: { select: { comments: true, likes: true, buyCertifications: true, sellCertifications: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    getStockDetail(decodedTicker).catch(() => null),
  ]);

  const currency = detail?.currency ?? "USD";

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* 종목 정보 카드 (실시간 폴링) */}
      <StockQuoteCard ticker={decodedTicker} initialQuote={detail} />

      {/* 주요 지표 그리드 */}
      {detail && (
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-4">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
            <MetricCard label="거래량" value={fmtVolume(detail.volume)} />
            <MetricCard label="시가" value={fmtPrice(detail.open, currency)} />
            <MetricCard
              label="고가"
              value={fmtPrice(detail.dayHigh, currency)}
              valueClass="text-green-600"
            />
            <MetricCard
              label="저가"
              value={fmtPrice(detail.dayLow, currency)}
              valueClass="text-red-500"
            />
            <MetricCard
              label="52주 최고"
              value={fmtPrice(detail.fiftyTwoWeekHigh, currency)}
              valueClass="text-green-600"
            />
            <MetricCard
              label="52주 최저"
              value={fmtPrice(detail.fiftyTwoWeekLow, currency)}
              valueClass="text-red-500"
            />
          </div>
        </div>
      )}

      {/* 차트 */}
      <StockChartWrapper symbol={decodedTicker} market={detail?.market ?? "US"} />

      {/* 관련 게시글 */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          관련 게시글 ({posts.length}개)
        </h2>
        <div className="space-y-3">
          {posts.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <p className="text-gray-500">이 종목에 대한 게시글이 없습니다</p>
            </div>
          ) : (
            (posts as PostWithUser[]).map((post) => <PostCard key={post.id} post={post} />)
          )}
        </div>
      </div>
    </div>
  );
}
