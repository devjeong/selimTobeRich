import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Header } from "@/components/layout/Header";
import ChatPopup from "@/components/chat/ChatPopup";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <>
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
      <footer className="border-t border-gray-200 mt-12 py-6 text-center text-sm text-gray-400">
        © 2025 StockShare. 본 서비스는 투자 참고용이며 투자 판단의 책임은 본인에게 있습니다.
      </footer>
      <ChatPopup />
    </>
  );
}
