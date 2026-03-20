import { cn } from "@/lib/utils";
import type { Recommendation } from "@prisma/client";

interface Props {
  recommendation: Recommendation;
  size?: "sm" | "md" | "lg";
}

const labels: Record<Recommendation, string> = {
  BUY: "매수 추천",
  SELL: "매도 추천",
  NONE: "중립",
};

const styles: Record<Recommendation, string> = {
  BUY: "bg-green-100 text-green-700 border border-green-200",
  SELL: "bg-red-100 text-red-700 border border-red-200",
  NONE: "bg-gray-100 text-gray-600 border border-gray-200",
};

const sizes = {
  sm: "text-xs px-2 py-0.5",
  md: "text-sm px-2.5 py-1",
  lg: "text-base px-3 py-1.5",
};

export function RecommendationBadge({ recommendation, size = "sm" }: Props) {
  if (recommendation === "NONE") return null;
  return (
    <span className={cn("inline-flex items-center rounded-full font-medium", styles[recommendation], sizes[size])}>
      {recommendation === "BUY" ? "▲" : "▼"} {labels[recommendation]}
    </span>
  );
}

export function PostTypeBadge({ type }: { type: "STOCK" | "SECTOR" | "GENERAL" }) {
  const map = {
    STOCK: { label: "종목분석", style: "bg-blue-100 text-blue-700 border border-blue-200" },
    SECTOR: { label: "업종·테마", style: "bg-purple-100 text-purple-700 border border-purple-200" },
    GENERAL: { label: "일반정보", style: "bg-gray-100 text-gray-600 border border-gray-200" },
  };
  const { label, style } = map[type];
  return (
    <span className={cn("inline-flex items-center rounded-full text-xs px-2 py-0.5 font-medium", style)}>
      {label}
    </span>
  );
}
