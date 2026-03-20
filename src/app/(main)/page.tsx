import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PostCard } from "@/components/posts/PostCard";
import type { PostWithUser } from "@/types";

async function getLatestPosts(): Promise<PostWithUser[]> {
  return prisma.post.findMany({
    include: {
      user: { select: { id: true, username: true, image: true } },
      _count: { select: { comments: true, likes: true, buyCertifications: true, sellCertifications: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  }) as Promise<PostWithUser[]>;
}

async function getStats() {
  const [totalPosts, totalUsers, buyPosts, sellPosts] = await Promise.all([
    prisma.post.count(),
    prisma.user.count(),
    prisma.post.count({ where: { recommendation: "BUY" } }),
    prisma.post.count({ where: { recommendation: "SELL" } }),
  ]);
  return { totalPosts, totalUsers, buyPosts, sellPosts };
}

export default async function HomePage() {
  const [posts, stats] = await Promise.all([getLatestPosts(), getStats()]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* 메인 피드 */}
      <div className="lg:col-span-3">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-900">최신 게시글</h1>
          <Link href="/posts" className="text-sm text-blue-600 hover:underline">전체보기 →</Link>
        </div>
        <div className="space-y-3">
          {posts.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <p className="text-gray-500 mb-4">아직 게시글이 없습니다</p>
              <Link href="/posts/new" className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                첫 게시글 작성하기
              </Link>
            </div>
          ) : (
            posts.map((post) => <PostCard key={post.id} post={post} />)
          )}
        </div>
      </div>

      {/* 사이드바 */}
      <aside className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">커뮤니티 현황</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-blue-700">{stats.totalPosts.toLocaleString()}</p>
              <p className="text-xs text-blue-500 mt-0.5">총 게시글</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-gray-700">{stats.totalUsers.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-0.5">회원 수</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-700">{stats.buyPosts.toLocaleString()}</p>
              <p className="text-xs text-green-500 mt-0.5">매수 추천</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-red-700">{stats.sellPosts.toLocaleString()}</p>
              <p className="text-xs text-red-500 mt-0.5">매도 추천</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">빠른 이동</h2>
          <nav className="space-y-1">
            <Link href="/posts?type=STOCK" className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors">
              📊 종목 분석
            </Link>
            <Link href="/posts?type=SECTOR" className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors">
              🏭 업종·테마
            </Link>
            <Link href="/posts?type=GENERAL" className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors">
              📰 일반 정보
            </Link>
            <Link href="/posts?recommendation=BUY" className="flex items-center gap-2 text-sm text-green-600 hover:bg-green-50 px-3 py-2 rounded-lg transition-colors">
              ▲ 매수 추천
            </Link>
            <Link href="/posts?recommendation=SELL" className="flex items-center gap-2 text-sm text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors">
              ▼ 매도 추천
            </Link>
          </nav>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-xs text-yellow-700">
          <p className="font-semibold mb-1">⚠️ 투자 주의사항</p>
          <p>본 서비스의 모든 내용은 투자 참고용이며, 투자 판단의 최종 책임은 본인에게 있습니다.</p>
        </div>
      </aside>
    </div>
  );
}
