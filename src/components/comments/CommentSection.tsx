"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { CommentItem } from "./CommentItem";
import type { CommentWithUser } from "@/types";

interface Props {
  postId: string;
  initialComments: CommentWithUser[];
}

export function CommentSection({ postId, initialComments }: Props) {
  const { data: session } = useSession();
  const router = useRouter();
  const [comments, setComments] = useState(initialComments);
  const [content, setContent] = useState("");
  const [replyTo, setReplyTo] = useState<CommentWithUser | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || loading) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, parentId: replyTo?.id }),
      });
      const data = await res.json();
      if (!res.ok) return alert(data.error);

      if (replyTo) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === replyTo.id
              ? { ...c, replies: [...(c.replies || []), data] }
              : c
          )
        );
      } else {
        setComments((prev) => [data, ...prev]);
      }
      setContent("");
      setReplyTo(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm("댓글을 삭제하시겠습니까?")) return;
    const res = await fetch(`/api/posts/${postId}/comments?commentId=${commentId}`, { method: "DELETE" });
    if (res.ok) {
      router.refresh();
      setComments((prev) => prev.filter((c) => c.id !== commentId).map((c) => ({
        ...c,
        replies: c.replies?.filter((r) => r.id !== commentId) || [],
      })));
    }
  };

  return (
    <div>
      <h3 className="text-base font-semibold text-gray-900 mb-4">댓글 {comments.length}개</h3>

      {session ? (
        <form onSubmit={handleSubmit} className="mb-6">
          {replyTo && (
            <div className="flex items-center gap-2 mb-2 text-sm text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg">
              <span>@{replyTo.user.username}에게 답글</span>
              <button type="button" onClick={() => setReplyTo(null)} className="ml-auto text-gray-400 hover:text-gray-600">✕</button>
            </div>
          )}
          <div className="flex gap-3">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="댓글을 입력해주세요"
              rows={2}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              maxLength={1000}
            />
            <button
              type="submit"
              disabled={loading || !content.trim()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 self-end transition-colors"
            >
              등록
            </button>
          </div>
        </form>
      ) : (
        <p className="text-sm text-gray-500 mb-4 bg-gray-50 px-4 py-3 rounded-lg">
          댓글을 작성하려면 <a href="/login" className="text-blue-600 hover:underline">로그인</a>이 필요합니다.
        </p>
      )}

      <div className="divide-y divide-gray-100">
        {comments.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">첫 번째 댓글을 작성해보세요!</p>
        ) : (
          comments.map((c) => (
            <CommentItem key={c.id} comment={c} postId={postId} onDelete={handleDelete} onReply={setReplyTo} />
          ))
        )}
      </div>
    </div>
  );
}
