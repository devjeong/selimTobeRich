"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";

export function Header() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl text-blue-600 flex items-center gap-1">
          📈 StockShare
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link href="/posts" className="text-gray-600 hover:text-blue-600 transition-colors">
            게시판
          </Link>
          <Link href="/posts?type=STOCK" className="text-gray-600 hover:text-blue-600 transition-colors">
            종목 분석
          </Link>
          <Link href="/posts?type=SECTOR" className="text-gray-600 hover:text-blue-600 transition-colors">
            업종·테마
          </Link>
          <Link href="/posts?recommendation=BUY" className="text-green-600 hover:text-green-700 transition-colors">
            매수 추천
          </Link>
          <Link href="/posts?recommendation=SELL" className="text-red-600 hover:text-red-700 transition-colors">
            매도 추천
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          {session ? (
            <>
              <Link
                href="/posts/new"
                className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                글쓰기
              </Link>
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
                >
                  <span className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center font-medium text-blue-700">
                    {session.user?.name?.[0]?.toUpperCase() || "U"}
                  </span>
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50">
                    <Link
                      href={`/profile/${session.user?.name}`}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setMenuOpen(false)}
                    >
                      내 프로필
                    </Link>
                    <hr className="my-1" />
                    <button
                      onClick={() => { signOut(); setMenuOpen(false); }}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                    >
                      로그아웃
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">로그인</Link>
              <Link
                href="/register"
                className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                회원가입
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
