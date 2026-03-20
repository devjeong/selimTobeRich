"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { formatDate, formatProfitRate } from "@/lib/utils";
import type { BuyCertification, SellCertification, User } from "@prisma/client";

type BuyCert = BuyCertification & { user: Pick<User, "id" | "username" | "image"> };
type SellCert = SellCertification & { user: Pick<User, "id" | "username" | "image"> };

interface Props {
  postId: string;
  ticker?: string | null;
  initialBuyCerts: BuyCert[];
  initialSellCerts: SellCert[];
}

export function CertificationSection({ postId, ticker, initialBuyCerts, initialSellCerts }: Props) {
  const { data: session } = useSession();
  const [buyCerts, setBuyCerts] = useState(initialBuyCerts);
  const [sellCerts, setSellCerts] = useState(initialSellCerts);
  const [activeTab, setActiveTab] = useState<"buy" | "sell">("buy");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Buy form
  const [buyTicker, setBuyTicker] = useState(ticker || "");
  const [avgBuyPrice, setAvgBuyPrice] = useState("");
  const [buyShares, setBuyShares] = useState("");
  const [buyNote, setBuyNote] = useState("");

  // Sell form
  const [sellTicker, setSellTicker] = useState(ticker || "");
  const [sellPrice, setSellPrice] = useState("");
  const [buyPrice, setBuyPrice] = useState("");
  const [sellShares, setSellShares] = useState("");
  const [sellNote, setSellNote] = useState("");

  const profitPreview =
    sellPrice && buyPrice
      ? (((parseFloat(sellPrice) - parseFloat(buyPrice)) / parseFloat(buyPrice)) * 100).toFixed(2)
      : null;

  const submitBuy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!avgBuyPrice || !buyTicker) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/posts/${postId}/buy-cert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker: buyTicker,
          avgBuyPrice: parseFloat(avgBuyPrice),
          shares: buyShares ? parseFloat(buyShares) : undefined,
          note: buyNote || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) return alert(data.error);
      setBuyCerts((prev) => [data, ...prev]);
      setShowForm(false);
      setAvgBuyPrice(""); setBuyShares(""); setBuyNote("");
    } finally {
      setLoading(false);
    }
  };

  const submitSell = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellPrice || !buyPrice || !sellTicker) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/posts/${postId}/sell-cert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker: sellTicker,
          sellPrice: parseFloat(sellPrice),
          buyPrice: parseFloat(buyPrice),
          shares: sellShares ? parseFloat(sellShares) : undefined,
          note: sellNote || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) return alert(data.error);
      setSellCerts((prev) => [data, ...prev]);
      setShowForm(false);
      setSellPrice(""); setBuyPrice(""); setSellShares(""); setSellNote("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("buy")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "buy" ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            📈 매수 인증 ({buyCerts.length})
          </button>
          <button
            onClick={() => setActiveTab("sell")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "sell" ? "bg-red-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            📉 매도 인증 ({sellCerts.length})
          </button>
        </div>
        {session && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {showForm ? "닫기" : `+ ${activeTab === "buy" ? "매수" : "매도"} 인증하기`}
          </button>
        )}
      </div>

      {/* 매수 인증 폼 */}
      {showForm && session && activeTab === "buy" && (
        <form onSubmit={submitBuy} className="bg-green-50 rounded-lg p-4 mb-4 space-y-3">
          <h4 className="text-sm font-semibold text-green-800">📈 매수 인증</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">종목 코드</label>
              <input value={buyTicker} onChange={(e) => setBuyTicker(e.target.value)} placeholder="예: 005930.KS"
                className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">평균 매수가 *</label>
              <input type="number" value={avgBuyPrice} onChange={(e) => setAvgBuyPrice(e.target.value)} placeholder="0"
                className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">수량 (선택)</label>
              <input type="number" value={buyShares} onChange={(e) => setBuyShares(e.target.value)} placeholder="0"
                className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">메모 (선택)</label>
              <input value={buyNote} onChange={(e) => setBuyNote(e.target.value)} placeholder="간단한 메모"
                className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
          </div>
          <button type="submit" disabled={loading} className="bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
            인증 등록
          </button>
        </form>
      )}

      {/* 매도 인증 폼 */}
      {showForm && session && activeTab === "sell" && (
        <form onSubmit={submitSell} className="bg-red-50 rounded-lg p-4 mb-4 space-y-3">
          <h4 className="text-sm font-semibold text-red-800">📉 매도 인증</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">종목 코드</label>
              <input value={sellTicker} onChange={(e) => setSellTicker(e.target.value)} placeholder="예: AAPL"
                className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">매수가 *</label>
              <input type="number" value={buyPrice} onChange={(e) => setBuyPrice(e.target.value)} placeholder="0"
                className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">매도가 *</label>
              <input type="number" value={sellPrice} onChange={(e) => setSellPrice(e.target.value)} placeholder="0"
                className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                수익률
                {profitPreview !== null && (
                  <span className={`ml-2 font-semibold ${parseFloat(profitPreview) >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {formatProfitRate(parseFloat(profitPreview))}
                  </span>
                )}
              </label>
              <input type="number" value={sellShares} onChange={(e) => setSellShares(e.target.value)} placeholder="수량 (선택)"
                className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
            </div>
          </div>
          <button type="submit" disabled={loading} className="bg-red-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
            인증 등록
          </button>
        </form>
      )}

      {/* 매수 인증 목록 */}
      {activeTab === "buy" && (
        <div className="space-y-2">
          {buyCerts.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">아직 매수 인증이 없습니다</p>
          ) : buyCerts.map((cert) => (
            <div key={cert.id} className="flex items-center justify-between bg-green-50 rounded-lg px-4 py-2.5 text-sm">
              <div className="flex items-center gap-3">
                <span className="text-green-700 font-medium">📈 {cert.user.username}</span>
                <span className="text-gray-600">{cert.ticker}</span>
              </div>
              <div className="flex items-center gap-3 text-right">
                <span className="font-semibold text-gray-900">{cert.avgBuyPrice.toLocaleString()}원</span>
                {cert.shares && <span className="text-gray-500">{cert.shares.toLocaleString()}주</span>}
                {cert.note && <span className="text-gray-400">{cert.note}</span>}
                <span className="text-xs text-gray-400">{formatDate(cert.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 매도 인증 목록 */}
      {activeTab === "sell" && (
        <div className="space-y-2">
          {sellCerts.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">아직 매도 인증이 없습니다</p>
          ) : sellCerts.map((cert) => (
            <div key={cert.id} className="flex items-center justify-between bg-red-50 rounded-lg px-4 py-2.5 text-sm">
              <div className="flex items-center gap-3">
                <span className="text-red-700 font-medium">📉 {cert.user.username}</span>
                <span className="text-gray-600">{cert.ticker}</span>
              </div>
              <div className="flex items-center gap-4 text-right">
                <div>
                  <span className="text-gray-500 text-xs">매수</span>
                  <span className="ml-1 font-medium">{cert.buyPrice.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-500 text-xs">매도</span>
                  <span className="ml-1 font-medium">{cert.sellPrice.toLocaleString()}</span>
                </div>
                <span className={`font-bold text-base ${cert.profitRate >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatProfitRate(cert.profitRate)}
                </span>
                <span className="text-xs text-gray-400">{formatDate(cert.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
