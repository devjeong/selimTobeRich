"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";

interface ChatUser {
  id: string;
  username: string;
  image: string | null;
}

interface ChatMessage {
  id: string;
  content: string;
  createdAt: string;
  user: ChatUser;
  isSystem?: boolean; // 로컬 시스템 메시지 (서버에 저장 안 됨)
}

export default function ChatPopup() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);
  const lastIdRef = useRef<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // 메시지 로드 (초기 또는 폴링)
  const fetchMessages = useCallback(async (initial = false) => {
    try {
      const url = initial || !lastIdRef.current
        ? "/api/chat"
        : `/api/chat?after=${lastIdRef.current}`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data: ChatMessage[] = await res.json();
      if (data.length === 0) return;

      if (initial) {
        setMessages(data);
        lastIdRef.current = data[data.length - 1]?.id ?? null;
      } else {
        setMessages((prev) => [...prev, ...data]);
        lastIdRef.current = data[data.length - 1]?.id ?? lastIdRef.current;
        if (!open) setUnread((n) => n + data.length);
      }
    } catch {
      // 네트워크 오류 무시
    }
  }, [open]);

  // 팝업 열릴 때 초기 로드 + 스크롤
  useEffect(() => {
    if (open) {
      setUnread(0);
      fetchMessages(true).then(() => {
        setTimeout(scrollToBottom, 100);
      });
      inputRef.current?.focus();
    }
  }, [open, fetchMessages, scrollToBottom]);

  // 3초마다 폴링
  useEffect(() => {
    pollingRef.current = setInterval(() => fetchMessages(false), 3000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchMessages]);

  // 새 메시지 오면 스크롤 (팝업 열린 경우)
  useEffect(() => {
    if (open) scrollToBottom();
  }, [messages, open, scrollToBottom]);

  // /tel 명령어 안내 메시지 생성
  const buildTelGuideMessage = (): ChatMessage => ({
    id: `system-tel-${Date.now()}`,
    isSystem: true,
    createdAt: new Date().toISOString(),
    content: [
      "📲 텔레그램 알림 봇 안내",
      "─────────────────────",
      "봇 검색: @SelimTobeRichBot",
      "",
      "📌 명령어",
      "• /start  → 알림 구독 시작",
      "• /stop   → 알림 구독 취소",
      "• /status → 현재 구독 상태 확인",
      "",
      "✅ 구독하면 매수/매도 추천 게시글이",
      "   올라올 때마다 알림을 받을 수 있어요!",
    ].join("\n"),
    user: {
      id: "system",
      username: "StockShare Bot",
      image: null,
    },
  });

  const handleSend = async () => {
    if (!input.trim() || sending || !session) return;

    const content = input.trim();

    // /tel 명령어 로컬 처리
    if (content.toLowerCase() === "/tel") {
      setInput("");
      setMessages((prev) => [...prev, buildTelGuideMessage()]);
      setTimeout(scrollToBottom, 50);
      inputRef.current?.focus();
      return;
    }

    setSending(true);
    setInput("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const msg: ChatMessage = await res.json();
        setMessages((prev) => [...prev, msg]);
        lastIdRef.current = msg.id;
        setTimeout(scrollToBottom, 50);
      }
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
  };

  if (!session) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {/* 채팅 팝업 */}
      {open && (
        <div className="w-80 h-[480px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          {/* 헤더 */}
          <div className="bg-blue-600 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-white font-semibold text-sm">💬 오픈채팅</span>
              <span className="bg-blue-500 text-blue-100 text-xs px-2 py-0.5 rounded-full">
                실시간
              </span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-blue-200 hover:text-white transition-colors text-lg leading-none"
            >
              ✕
            </button>
          </div>

          {/* 메시지 목록 */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
            {messages.length === 0 && (
              <p className="text-center text-gray-400 text-xs mt-8">
                첫 번째 메시지를 남겨보세요!
              </p>
            )}
            {messages.map((msg) => {
              // ── 시스템 메시지 ──────────────────────────
              if (msg.isSystem) {
                return (
                  <div key={msg.id} className="flex justify-center my-1">
                    <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2.5 max-w-[90%]">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-blue-500 text-xs font-bold">🤖 StockShare Bot</span>
                      </div>
                      <pre className="text-xs text-blue-900 whitespace-pre-wrap font-sans leading-relaxed">
                        {msg.content}
                      </pre>
                    </div>
                  </div>
                );
              }

              // ── 일반 메시지 ────────────────────────────
              const isMe = msg.user.id === session.user?.id;
              return (
                <div
                  key={msg.id}
                  className={`flex gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}
                >
                  {/* 아바타 */}
                  {!isMe && (
                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600 shrink-0">
                      {msg.user.image ? (
                        <img
                          src={msg.user.image}
                          alt={msg.user.username}
                          className="w-7 h-7 rounded-full object-cover"
                        />
                      ) : (
                        msg.user.username[0].toUpperCase()
                      )}
                    </div>
                  )}
                  <div className={`flex flex-col gap-0.5 max-w-[75%] ${isMe ? "items-end" : "items-start"}`}>
                    {!isMe && (
                      <span className="text-xs text-gray-500 font-medium px-1">
                        {msg.user.username}
                      </span>
                    )}
                    <div
                      className={`px-3 py-2 rounded-2xl text-sm leading-snug break-words ${
                        isMe
                          ? "bg-blue-600 text-white rounded-tr-sm"
                          : "bg-white text-gray-900 border border-gray-200 rounded-tl-sm"
                      }`}
                    >
                      {msg.content}
                    </div>
                    <span className="text-[10px] text-gray-400 px-1">
                      {formatTime(msg.createdAt)}
                    </span>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* 입력창 */}
          <div className="border-t border-gray-200 p-2 bg-white flex gap-2 items-center">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="메시지 입력... (/tel 텔레그램 안내)"
              maxLength={500}
              className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="bg-blue-600 text-white rounded-xl px-3 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors shrink-0"
            >
              전송
            </button>
          </div>
        </div>
      )}

      {/* 플로팅 버튼 */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95 relative"
        aria-label="오픈채팅"
      >
        <span className="text-2xl">{open ? "✕" : "💬"}</span>
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
    </div>
  );
}
