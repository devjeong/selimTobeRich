import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PostForm } from "@/components/posts/PostForm";

export default async function NewPostPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">새 게시글 작성</h1>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <PostForm />
      </div>
    </div>
  );
}
