import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PostCard } from "@/components/posts/PostCard";
import { formatDate } from "@/lib/utils";
import type { PostWithUser } from "@/types";

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true, username: true, image: true, bio: true, createdAt: true,
      _count: { select: { posts: true, comments: true, buyCertifications: true, sellCertifications: true } },
    },
  });

  if (!user) notFound();

  const posts = await prisma.post.findMany({
    where: { userId: user.id },
    include: {
      user: { select: { id: true, username: true, image: true } },
      _count: { select: { comments: true, likes: true, buyCertifications: true, sellCertifications: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  }) as PostWithUser[];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* 프로필 카드 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-2xl font-bold text-blue-700 shrink-0">
            {user.username[0].toUpperCase()}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">{user.username}</h1>
            {user.bio && <p className="text-gray-600 text-sm mt-1">{user.bio}</p>}
            <p className="text-xs text-gray-400 mt-2">가입일: {formatDate(user.createdAt)}</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 mt-5 pt-5 border-t border-gray-100">
          {[
            { label: "게시글", value: user._count.posts },
            { label: "댓글", value: user._count.comments },
            { label: "매수인증", value: user._count.buyCertifications },
            { label: "매도인증", value: user._count.sellCertifications },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <p className="text-xl font-bold text-gray-900">{value.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 게시글 목록 */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">작성한 게시글</h2>
        <div className="space-y-3">
          {posts.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500 text-sm">
              작성한 게시글이 없습니다
            </div>
          ) : (
            posts.map((post) => <PostCard key={post.id} post={post} />)
          )}
        </div>
      </div>
    </div>
  );
}
