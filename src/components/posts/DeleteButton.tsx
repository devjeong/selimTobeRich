"use client";

import { useRouter } from "next/navigation";

interface Props {
  postId: string;
}

export function DeleteButton({ postId }: Props) {
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm("게시글을 삭제하시겠습니까?")) return;

    const res = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      className="text-red-500 hover:underline"
    >
      삭제
    </button>
  );
}
