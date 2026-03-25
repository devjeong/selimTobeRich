"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";

interface ProfileSettingsProps {
  currentUsername: string;
}

type Section = "username" | "password" | null;

export default function ProfileSettings({ currentUsername }: ProfileSettingsProps) {
  const [open, setOpen] = useState<Section>(null);

  // 이름 변경 상태
  const [newUsername, setNewUsername] = useState(currentUsername);
  const [usernameMsg, setUsernameMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [usernameLoading, setUsernameLoading] = useState(false);

  // 비밀번호 변경 상태
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwMsg, setPwMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [pwLoading, setPwLoading] = useState(false);

  // 비밀번호 초기화 상태
  const [resetMsg, setResetMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  function toggle(section: Section) {
    setOpen((prev) => (prev === section ? null : section));
    setUsernameMsg(null);
    setPwMsg(null);
    setResetMsg(null);
  }

  async function handleUsernameChange(e: React.FormEvent) {
    e.preventDefault();
    if (!newUsername.trim() || newUsername === currentUsername) return;
    setUsernameLoading(true);
    setUsernameMsg(null);
    try {
      const res = await fetch("/api/profile/me/username", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newUsername.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setUsernameMsg({ type: "error", text: data.error });
      } else {
        setUsernameMsg({ type: "success", text: `사용자명이 "${data.username}"으로 변경되었습니다. 페이지를 새로고침합니다.` });
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch {
      setUsernameMsg({ type: "error", text: "오류가 발생했습니다" });
    } finally {
      setUsernameLoading(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (newPw !== confirmPw) {
      setPwMsg({ type: "error", text: "새 비밀번호가 일치하지 않습니다" });
      return;
    }
    setPwLoading(true);
    setPwMsg(null);
    try {
      const res = await fetch("/api/profile/me/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPwMsg({ type: "error", text: data.error });
      } else {
        setPwMsg({ type: "success", text: "비밀번호가 변경되었습니다. 다시 로그인해주세요." });
        setCurrentPw(""); setNewPw(""); setConfirmPw("");
        setTimeout(() => signOut({ callbackUrl: "/login" }), 1500);
      }
    } catch {
      setPwMsg({ type: "error", text: "오류가 발생했습니다" });
    } finally {
      setPwLoading(false);
    }
  }

  async function handleResetPassword() {
    if (!confirm("비밀번호를 초기 비밀번호로 초기화하시겠습니까?\n초기화 후 재로그인이 필요합니다.")) return;
    setResetLoading(true);
    setResetMsg(null);
    try {
      const res = await fetch("/api/profile/me/reset-password", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setResetMsg({ type: "error", text: data.error });
      } else {
        setResetMsg({ type: "success", text: data.message });
        setTimeout(() => signOut({ callbackUrl: "/login" }), 2000);
      }
    } catch {
      setResetMsg({ type: "error", text: "오류가 발생했습니다" });
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <h2 className="text-base font-semibold text-gray-900">계정 설정</h2>

      {/* ── 이름 변경 ── */}
      <div className="border border-gray-100 rounded-lg overflow-hidden">
        <button
          onClick={() => toggle("username")}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <span>이름 변경</span>
          <span className="text-gray-400 text-xs">{open === "username" ? "▲" : "▼"}</span>
        </button>

        {open === "username" && (
          <form onSubmit={handleUsernameChange} className="px-4 pb-4 space-y-3 border-t border-gray-100">
            <div className="pt-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">새 사용자명</label>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="2~20자, 영문·숫자·한글·밑줄"
                maxLength={20}
              />
            </div>
            {usernameMsg && (
              <p className={`text-xs ${usernameMsg.type === "success" ? "text-green-600" : "text-red-500"}`}>
                {usernameMsg.text}
              </p>
            )}
            <button
              type="submit"
              disabled={usernameLoading || newUsername.trim() === currentUsername}
              className="w-full bg-blue-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {usernameLoading ? "변경 중..." : "변경"}
            </button>
          </form>
        )}
      </div>

      {/* ── 비밀번호 변경 ── */}
      <div className="border border-gray-100 rounded-lg overflow-hidden">
        <button
          onClick={() => toggle("password")}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <span>비밀번호 변경</span>
          <span className="text-gray-400 text-xs">{open === "password" ? "▲" : "▼"}</span>
        </button>

        {open === "password" && (
          <form onSubmit={handlePasswordChange} className="px-4 pb-4 space-y-3 border-t border-gray-100">
            {[
              { label: "현재 비밀번호", value: currentPw, setter: setCurrentPw, placeholder: "현재 비밀번호 입력" },
              { label: "새 비밀번호", value: newPw, setter: setNewPw, placeholder: "6자 이상" },
              { label: "새 비밀번호 확인", value: confirmPw, setter: setConfirmPw, placeholder: "새 비밀번호 재입력" },
            ].map(({ label, value, setter, placeholder }) => (
              <div key={label} className="pt-2 first:pt-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                <input
                  type="password"
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={placeholder}
                />
              </div>
            ))}
            {pwMsg && (
              <p className={`text-xs ${pwMsg.type === "success" ? "text-green-600" : "text-red-500"}`}>
                {pwMsg.text}
              </p>
            )}
            <button
              type="submit"
              disabled={pwLoading || !currentPw || !newPw || !confirmPw}
              className="w-full bg-blue-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {pwLoading ? "변경 중..." : "변경"}
            </button>
          </form>
        )}
      </div>

      {/* ── 비밀번호 초기화 ── */}
      <div className="border border-red-100 rounded-lg p-4 space-y-2">
        <p className="text-sm font-medium text-gray-700">비밀번호 초기화</p>
        <p className="text-xs text-gray-500">
          비밀번호를 초기 비밀번호로 초기화합니다. 초기화 후 재로그인이 필요합니다.
        </p>
        {resetMsg && (
          <p className={`text-xs font-medium ${resetMsg.type === "success" ? "text-green-600" : "text-red-500"}`}>
            {resetMsg.text}
          </p>
        )}
        <button
          onClick={handleResetPassword}
          disabled={resetLoading}
          className="w-full border border-red-300 text-red-600 text-sm font-medium py-2 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {resetLoading ? "초기화 중..." : "비밀번호 초기화"}
        </button>
      </div>
    </div>
  );
}
