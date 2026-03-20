import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { PostForm } from "@/components/posts/PostForm";

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [session, post] = await Promise.all([auth(), prisma.post.findUnique({ where: { id } })]);

  if (!session) redirect("/login");
  if (!post) notFound();
  if (post.userId !== session.user?.id) redirect(`/posts/${id}`);

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">게시글 수정</h1>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <PostForm initialData={{
          id: post.id,
          title: post.title,
          content: post.content,
          type: post.type,
          recommendation: post.recommendation,
          recommendedPrice: post.recommendedPrice,
          ticker: post.ticker,
          tickerName: post.tickerName,
          market: post.market as "KR" | "US" | null,
          sectorName: post.sectorName,
        }} />
      </div>
    </div>
  );
}
