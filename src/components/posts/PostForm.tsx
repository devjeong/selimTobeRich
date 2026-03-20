"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { TickerSearch } from "@/components/stocks/TickerSearch";
import type { StockSearchResult } from "@/lib/yahoo-finance";
import type { PostType, Recommendation } from "@prisma/client";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

interface Props {
  initialData?: {
    id: string;
    title: string;
    content: string;
    type: PostType;
    recommendation: Recommendation;
    recommendedPrice?: number | null;
    ticker?: string | null;
    tickerName?: string | null;
    market?: "KR" | "US" | null;
    sectorName?: string | null;
  };
}

export function PostForm({ initialData }: Props) {
  const router = useRouter();
  const isEdit = !!initialData;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(initialData?.title || "");
  const [content, setContent] = useState(initialData?.content || "");
  const [type, setType] = useState<PostType>(initialData?.type || "GENERAL");
  const [recommendation, setRecommendation] = useState<Recommendation>(initialData?.recommendation || "NONE");
  const [ticker, setTicker] = useState(initialData?.ticker || "");
  const [tickerName, setTickerName] = useState(initialData?.tickerName || "");
  const [market, setMarket] = useState<"KR" | "US" | "">(initialData?.market || "");
  const [sectorName, setSectorName] = useState(initialData?.sectorName || "");
  const [recommendedPrice, setRecommendedPrice] = useState<string>(
    initialData?.recommendedPrice != null ? String(initialData.recommendedPrice) : ""
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleTickerSelect = (result: StockSearchResult) => {
    setTicker(result.symbol);
    setTickerName(result.name);
    setMarket(result.market);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const inserted: string[] = [];

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (res.ok && data.url) {
          inserted.push(`![${file.name}](${data.url})`);
        } else {
          setError(data.error || "이미지 업로드 실패");
        }
      } catch {
        setError("이미지 업로드 중 오류가 발생했습니다");
      }
    }

    if (inserted.length > 0) {
      setContent((prev) => prev + (prev ? "\n\n" : "") + inserted.join("\n\n"));
    }

    setUploading(false);
    // 같은 파일 재업로드 가능하도록 초기화
    e.target.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setError("제목을 입력해주세요");
    if (!content.trim()) return setError("내용을 입력해주세요");
    if (type === "STOCK" && !ticker) return setError("종목을 선택해주세요");

    setError("");
    setLoading(true);

    try {
      const url = isEdit ? `/api/posts/${initialData.id}` : "/api/posts";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title, content, type, recommendation,
          recommendedPrice: recommendation !== "NONE" && recommendedPrice !== ""
            ? parseFloat(recommendedPrice)
            : null,
          ticker: type === "STOCK" ? ticker : null,
          tickerName: type === "STOCK" ? tickerName : null,
          market: type === "STOCK" ? market || null : null,
          sectorName: type === "SECTOR" ? sectorName : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) return setError(data.error || "오류가 발생했습니다");

      router.push(`/posts/${data.id}`);
      router.refresh();
    } catch {
      setError("서버 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* 게시글 유형 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">게시글 유형</label>
        <div className="flex gap-3">
          {(["STOCK", "SECTOR", "GENERAL"] as PostType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                type === t
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
              }`}
            >
              {t === "STOCK" ? "📊 특정 종목" : t === "SECTOR" ? "🏭 업종·테마" : "📰 일반 정보"}
            </button>
          ))}
        </div>
      </div>

      {/* 종목 선택 (STOCK 타입) */}
      {type === "STOCK" && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">종목 선택</label>
          <TickerSearch onSelect={handleTickerSelect} />
          {ticker && (
            <p className="mt-1 text-xs text-green-600">
              선택됨: {tickerName} ({ticker}) · {market === "KR" ? "국내" : "미국"}
            </p>
          )}
        </div>
      )}

      {/* 업종명 (SECTOR 타입) */}
      {type === "SECTOR" && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">업종·테마명</label>
          <input
            type="text"
            value={sectorName}
            onChange={(e) => setSectorName(e.target.value)}
            placeholder="예: 반도체, 2차전지, AI, 바이오"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {/* 매수/매도 추천 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">투자 의견</label>
        <div className="flex gap-3">
          {(["BUY", "SELL", "NONE"] as Recommendation[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => {
                setRecommendation(r);
                if (r === "NONE") setRecommendedPrice("");
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                recommendation === r
                  ? r === "BUY"
                    ? "bg-green-600 text-white border-green-600"
                    : r === "SELL"
                    ? "bg-red-600 text-white border-red-600"
                    : "bg-gray-600 text-white border-gray-600"
                  : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
              }`}
            >
              {r === "BUY" ? "▲ 매수 추천" : r === "SELL" ? "▼ 매도 추천" : "- 중립"}
            </button>
          ))}
        </div>

        {/* 추천 가격 입력 (매수/매도 선택 시) */}
        {recommendation !== "NONE" && (
          <div className={`mt-3 p-4 rounded-lg border ${
            recommendation === "BUY"
              ? "bg-green-50 border-green-200"
              : "bg-red-50 border-red-200"
          }`}>
            <label className={`block text-sm font-medium mb-1.5 ${
              recommendation === "BUY" ? "text-green-800" : "text-red-800"
            }`}>
              {recommendation === "BUY" ? "▲ 매수 추천 가격" : "▼ 매도 추천 가격"}
              <span className="ml-1 font-normal text-gray-500">(선택)</span>
            </label>
            <div className="relative">
              <input
                type="number"
                value={recommendedPrice}
                onChange={(e) => setRecommendedPrice(e.target.value)}
                placeholder={
                  market === "US"
                    ? "예: 150.50"
                    : "예: 85000"
                }
                min="0"
                step={market === "US" ? "0.01" : "1"}
                className={`w-full border rounded-lg px-3 py-2 pr-14 text-sm focus:outline-none focus:ring-2 ${
                  recommendation === "BUY"
                    ? "border-green-300 focus:ring-green-500"
                    : "border-red-300 focus:ring-red-500"
                } bg-white`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">
                {market === "US" ? "USD" : "KRW"}
              </span>
            </div>
            {recommendedPrice && !isNaN(parseFloat(recommendedPrice)) && (
              <p className={`mt-1 text-xs ${
                recommendation === "BUY" ? "text-green-700" : "text-red-700"
              }`}>
                {market === "US"
                  ? `$${parseFloat(recommendedPrice).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : `${parseInt(recommendedPrice).toLocaleString("ko-KR")}원`
                }
              </p>
            )}
          </div>
        )}
      </div>

      {/* 제목 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">제목</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="게시글 제목을 입력해주세요"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          maxLength={200}
        />
      </div>

      {/* 내용 (마크다운 에디터) */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">내용 (Markdown 지원)</label>
          {/* 이미지 업로드 버튼 */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              multiple
              className="hidden"
              onChange={handleImageUpload}
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 transition-all"
            >
              {uploading ? (
                <>
                  <span className="inline-block w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  업로드 중...
                </>
              ) : (
                <>🖼️ 이미지 첨부</>
              )}
            </button>
          </div>
        </div>
        <div data-color-mode="light">
          <MDEditor
            value={content}
            onChange={(v) => setContent(v || "")}
            height={400}
            preview="live"
          />
        </div>
        <p className="mt-1 text-xs text-gray-400">JPG, PNG, GIF, WEBP · 최대 5MB · 복수 선택 가능</p>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading || uploading}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "저장 중..." : isEdit ? "수정하기" : "게시하기"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="border border-gray-300 text-gray-700 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          취소
        </button>
      </div>
    </form>
  );
}
