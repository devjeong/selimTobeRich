import { prisma } from "@/lib/prisma";
import { PostCard } from "@/components/posts/PostCard";
import Link from "next/link";
import type { PostWithUser } from "@/types";
import type { PostType, Recommendation } from "@prisma/client";

interface SearchParams {
  type?: PostType;
  recommendation?: Recommendation;
  search?: string;
  page?: string;
}

async function getPosts(searchParams: SearchParams): Promise<{ posts: PostWithUser[]; total: number }> {
  const page = parseInt(searchParams.page || "1");
  const limit = 20;
  const where = {
    ...(searchParams.type && { type: searchParams.type }),
    ...(searchParams.recommendation && { recommendation: searchParams.recommendation }),
    ...(searchParams.search && {
      OR: [
        { title: { contains: searchParams.search, mode: "insensitive" as const } },
      ],
    }),
  };

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      include: {
        user: { select: { id: true, username: true, image: true } },
        _count: { select: { comments: true, likes: true, buyCertifications: true, sellCertifications: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.post.count({ where }),
  ]);

  return { posts: posts as PostWithUser[], total };
}

const typeLabels: Record<string, string> = {
  STOCK: "📊 종목 분석",
  SECTOR: "🏭 업종·테마",
  GENERAL: "📰 일반 정보",
};

const recLabels: Record<string, string> = {
  BUY: "▲ 매수 추천",
  SELL: "▼ 매도 추천",
};

export default async function PostsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const { posts, total } = await getPosts(params);
  const page = parseInt(params.page || "1");
  const totalPages = Math.ceil(total / 20);

  const buildUrl = (newParams: Record<string, string | undefined>) => {
    const merged = { ...params, ...newParams };
    const qs = Object.entries(merged)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}=${encodeURIComponent(v!)}`)
      .join("&");
    return `/posts${qs ? "?" + qs : ""}`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="lg:col-span-3">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {params.type ? typeLabels[params.type] : params.recommendation ? recLabels[params.recommendation] : "전체 게시판"}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">총 {total.toLocaleString()}개</p>
          </div>
          <Link href="/posts/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            글쓰기
          </Link>
        </div>

        <div className="space-y-3">
          {posts.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <p className="text-gray-500">게시글이 없습니다</p>
            </div>
          ) : (
            posts.map((post) => <PostCard key={post.id} post={post} />)
          )}
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            {page > 1 && (
              <Link href={buildUrl({ page: String(page - 1) })} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">이전</Link>
            )}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
              return (
                <Link key={p} href={buildUrl({ page: String(p) })}
                  className={`px-4 py-2 text-sm border rounded-lg ${p === page ? "bg-blue-600 text-white border-blue-600" : "hover:bg-gray-50"}`}
                >{p}</Link>
              );
            })}
            {page < totalPages && (
              <Link href={buildUrl({ page: String(page + 1) })} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">다음</Link>
            )}
          </div>
        )}
      </div>

      {/* 필터 사이드바 */}
      <aside className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">유형별</h2>
          <nav className="space-y-1">
            <Link href="/posts" className={`block text-sm px-3 py-2 rounded-lg transition-colors ${!params.type && !params.recommendation ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}>
              전체
            </Link>
            {(["STOCK", "SECTOR", "GENERAL"] as PostType[]).map((t) => (
              <Link key={t} href={buildUrl({ type: t, recommendation: undefined, page: undefined })}
                className={`block text-sm px-3 py-2 rounded-lg transition-colors ${params.type === t ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}
              >
                {typeLabels[t]}
              </Link>
            ))}
          </nav>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">투자 의견</h2>
          <nav className="space-y-1">
            {(["BUY", "SELL"] as Recommendation[]).map((r) => (
              <Link key={r} href={buildUrl({ recommendation: r, type: undefined, page: undefined })}
                className={`block text-sm px-3 py-2 rounded-lg transition-colors ${params.recommendation === r ? (r === "BUY" ? "bg-green-600 text-white" : "bg-red-600 text-white") : (r === "BUY" ? "text-green-600 hover:bg-green-50" : "text-red-600 hover:bg-red-50")}`}
              >
                {recLabels[r]}
              </Link>
            ))}
          </nav>
        </div>
      </aside>
    </div>
  );
}
