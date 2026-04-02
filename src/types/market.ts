export interface MarketItem {
  symbol: string;
  label: string;
  group: "KR" | "US" | "FX" | "COMMODITY";
  price: number | null;
  change: number | null;
  changePercent: number | null;
  currency: string;
  isLive: boolean;
  sparkline: number[];
}

export interface MarketOverviewResponse {
  items: MarketItem[];
  fetchedAt: string;
}
