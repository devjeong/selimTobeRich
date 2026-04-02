import type { MarketItem } from "@/types/market";
import { MarketCard } from "./MarketCard";

interface Props {
  title: string;
  items: MarketItem[];
  badge?: string;
}

export function MarketSection({ title, items, badge }: Props) {
  // 아이템 수에 따라 그리드 컬럼 조정
  const colsClass =
    items.length === 2
      ? "grid-cols-2"
      : items.length === 3
      ? "grid-cols-1 sm:grid-cols-3"
      : "grid-cols-2 sm:grid-cols-4";

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-base font-bold text-gray-800">{title}</h2>
        {badge && (
          <span className="text-xs bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full">
            {badge}
          </span>
        )}
      </div>
      <div className={`grid ${colsClass} gap-3`}>
        {items.map((item) => (
          <MarketCard key={item.symbol} item={item} />
        ))}
      </div>
    </section>
  );
}
