import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  // 이미 로그인된 경우 메인으로 리다이렉트
  if (session?.user) {
    redirect("/");
  }

  return <>{children}</>;
}
