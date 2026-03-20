"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { formatDate } from "@/lib/utils";
import type { CommentWithUser } from "@/types";

interface Props {
  comment: CommentWithUser;
  postId: string;
  onDelete: (id: string) => void;
  onReply: (comment: CommentWithUser) => void;
}

export function CommentItem({ comment, postId, onDelete, onReply }: Props) {
  const { data: session } = useSession();
  const isOwner = session?.user?.id === comment.userId;

  return (
    <div className={`${comment.parentId ? "ml-8 border-l-2 border-gray-100 pl-4" : ""}`}>
      <div className="flex items-start gap-3 py-3">
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600 shrink-0">
          {comment.user.username[0].toUpperCase()}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-gray-900">{comment.user.username}</span>
            <span className="text-xs text-gray-400">{formatDate(comment.createdAt)}</span>
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
          <div className="flex items-center gap-3 mt-1.5">
            {session && !comment.parentId && (
              <button
                onClick={() => onReply(comment)}
                className="text-xs text-gray-400 hover:text-blue-600 transition-colors"
              >
                답글
              </button>
            )}
            {isOwner && (
              <button
                onClick={() => onDelete(comment.id)}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                삭제
              </button>
            )}
          </div>
        </div>
      </div>
      {comment.replies?.map((reply) => (
        <CommentItem key={reply.id} comment={reply} postId={postId} onDelete={onDelete} onReply={onReply} />
      ))}
    </div>
  );
}
