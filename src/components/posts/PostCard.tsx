"use client";

import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { RecommendationBadge, PostTypeBadge } from "./RecommendationBadge";
import type { PostWithUser } from "@/types";

interface Props {
  post: PostWithUser;
}

export function PostCard({ post }: Props) {
  return (
    <article className="bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <PostTypeBadge type={post.type} />
            <RecommendationBadge recommendation={post.recommendation} />
            {post.ticker && (
              <Link
                href={`/stocks/${post.ticker}`}
                className="text-xs bg-blue-50 text-blue-600 border border-blue-100 rounded-full px-2 py-0.5 hover:bg-blue-100"
                onClick={(e) => e.stopPropagation()}
              >
                {post.tickerName || post.ticker} ({post.ticker})
              </Link>
            )}
            {post.sectorName && (
              <span className="text-xs bg-purple-50 text-purple-600 border border-purple-100 rounded-full px-2 py-0.5">
                {post.sectorName}
              </span>
            )}
          </div>

          <Link href={`/posts/${post.id}`}>
            <h2 className="text-base font-semibold text-gray-900 hover:text-blue-600 truncate transition-colors">
              {post.title}
            </h2>
          </Link>

          {/* 추천 가격 */}
          {post.recommendedPrice != null && post.recommendation !== "NONE" && (
            <p className={`mt-1 text-xs font-medium ${
              post.recommendation === "BUY" ? "text-green-600" : "text-red-600"
            }`}>
              {post.recommendation === "BUY" ? "▲ 매수 추천가" : "▼ 매도 추천가"}
              {" "}
              {post.market === "US"
                ? `$${post.recommendedPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : `${post.recommendedPrice.toLocaleString("ko-KR")}원`
              }
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
        <div className="flex items-center gap-3">
          <Link href={`/profile/${post.user.username}`} className="hover:text-gray-700 font-medium">
            {post.user.username}
          </Link>
          <span>{formatDate(post.createdAt)}</span>
          <span>조회 {post.viewCount}</span>
        </div>
        <div className="flex items-center gap-3">
          <span>💬 {post._count.comments}</span>
          <span>❤️ {post._count.likes}</span>
          {post._count.buyCertifications > 0 && (
            <span className="text-green-600">📈 매수인증 {post._count.buyCertifications}</span>
          )}
          {post._count.sellCertifications > 0 && (
            <span className="text-red-600">📉 매도인증 {post._count.sellCertifications}</span>
          )}
        </div>
      </div>
    </article>
  );
}
