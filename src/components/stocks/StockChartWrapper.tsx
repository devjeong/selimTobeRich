"use client";

import dynamic from "next/dynamic";

const StockChart = dynamic(() => import("./StockChart"), { ssr: false });

export default function StockChartWrapper(props: { symbol: string; market: "KR" | "US" }) {
  return <StockChart {...props} />;
}
