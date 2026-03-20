import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { RecommendationBadge, PostTypeBadge } from "@/components/posts/RecommendationBadge";
import { CommentSection } from "@/components/comments/CommentSection";
import { CertificationSection } from "@/components/certifications/CertificationSection";
import { LikeButton } from "@/components/posts/LikeButton";
import { MarkdownViewer } from "@/components/MarkdownViewer";
import { DeleteButton } from "@/components/posts/DeleteButton";
import type { PostWithDetails } from "@/types";

async function getPost(id: string): Promise<PostWithDetails | null> {
  return prisma.post.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, username: true, image: true, bio: true } },
      comments: {
        where: { parentId: null },
        include: {
          user: { select: { id: true, username: true, image: true } },
          replies: {
            include: { user: { select: { id: true, username: true, image: true } } },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      buyCertifications: {
        include: { user: { select: { id: true, username: true, image: true } } },
        orderBy: { createdAt: "desc" },
      },
      sellCertifications: {
        include: { user: { select: { id: true, username: true, image: true } } },
        orderBy: { createdAt: "desc" },
      },
      likes: true,
      _count: { select: { comments: true, likes: true } },
    },
  }) as Promise<PostWithDetails | null>;
}

export default async function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [post, session] = await Promise.all([getPost(id), auth()]);

  if (!post) notFound();

  // 조회수 증가
  await prisma.post.update({ where: { id }, data: { viewCount: { increment: 1 } } });

  const isOwner = session?.user?.id === post.userId;
  const isLiked = session ? post.likes.some((l) => l.userId === session.user?.id) : false;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* 게시글 헤더 */}
      <article className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <PostTypeBadge type={post.type} />
          <RecommendationBadge recommendation={post.recommendation} size="md" />
          {post.ticker && (
            <Link href={`/stocks/${post.ticker}`} className="text-sm bg-blue-50 text-blue-600 border border-blue-100 rounded-full px-3 py-1 hover:bg-blue-100">
              {post.tickerName || post.ticker} ({post.ticker})
            </Link>
          )}
          {post.sectorName && (
            <span className="text-sm bg-purple-50 text-purple-600 border border-purple-100 rounded-full px-3 py-1">
              {post.sectorName}
            </span>
          )}
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-3">{post.title}</h1>

        {/* 추천 가격 */}
        {post.recommendedPrice != null && post.recommendation !== "NONE" && (
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold mb-4 ${
            post.recommendation === "BUY"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}>
            <span>{post.recommendation === "BUY" ? "▲ 매수 추천가" : "▼ 매도 추천가"}</span>
            <span className="text-base">
              {post.market === "US"
                ? `$${post.recommendedPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : `${post.recommendedPrice.toLocaleString("ko-KR")}원`
              }
            </span>
          </div>
        )}

        <div className="flex items-center justify-between text-sm text-gray-500 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <Link href={`/profile/${post.user.username}`} className="font-medium text-gray-700 hover:text-blue-600">
              {post.user.username}
            </Link>
            <span>{formatDate(post.createdAt)}</span>
            <span>조회 {post.viewCount}</span>
          </div>
          {isOwner && (
            <div className="flex gap-3">
              <Link href={`/posts/${id}/edit`} className="text-blue-600 hover:underline">수정</Link>
              <DeleteButton postId={id} />
            </div>
          )}
        </div>

        <div className="py-6">
          <MarkdownViewer content={post.content} />
        </div>

        <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
          <LikeButton postId={id} initialLiked={isLiked} initialCount={post._count.likes} />
          <span className="text-sm text-gray-500">💬 댓글 {post._count.comments}</span>
        </div>
      </article>

      {/* 매수/매도 인증 */}
      <CertificationSection
        postId={id}
        ticker={post.ticker}
        initialBuyCerts={post.buyCertifications}
        initialSellCerts={post.sellCertifications}
      />

      {/* 댓글 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <CommentSection postId={id} initialComments={post.comments} />
      </div>
    </div>
  );
}

