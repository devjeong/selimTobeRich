import { prisma } from "@/lib/prisma";
import { getStockQuote } from "@/lib/yahoo-finance";
import { PostCard } from "@/components/posts/PostCard";
import type { PostWithUser } from "@/types";

export default async function StockPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  const decodedTicker = decodeURIComponent(ticker);

  const [posts, quote] = await Promise.all([
    prisma.post.findMany({
      where: { ticker: decodedTicker },
      include: {
        user: { select: { id: true, username: true, image: true } },
        _count: { select: { comments: true, likes: true, buyCertifications: true, sellCertifications: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    getStockQuote(decodedTicker).catch(() => null),
  ]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* 종목 정보 카드 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{quote?.name || decodedTicker}</h1>
            <p className="text-gray-500 text-sm mt-0.5">{decodedTicker} · {quote?.market === "KR" ? "국내" : "미국"}</p>
          </div>
          {quote && (
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">
                {quote.price?.toLocaleString()} {quote.currency}
              </p>
              {quote.changePercent != null && (
                <p className={`text-sm font-medium mt-0.5 ${quote.changePercent >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {quote.changePercent >= 0 ? "▲" : "▼"} {Math.abs(quote.changePercent).toFixed(2)}%
                  {quote.change != null && ` (${quote.change >= 0 ? "+" : ""}${quote.change?.toFixed(2)})`}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

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
