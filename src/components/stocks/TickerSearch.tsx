"use client";

import { useState, useCallback, useRef } from "react";
import type { StockSearchResult } from "@/lib/yahoo-finance";

interface Props {
  onSelect: (result: StockSearchResult) => void;
  placeholder?: string;
}

export function TickerSearch({ onSelect, placeholder = "종목명 또는 코드 검색 (예: 삼성, AAPL)" }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StockSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (!q.trim() || q.length < 1) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInput = (value: string) => {
    setQuery(value);
    setOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 400);
  };

  const handleSelect = (result: StockSearchResult) => {
    setQuery(`${result.name} (${result.symbol})`);
    setOpen(false);
    onSelect(result);
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => handleInput(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {loading && (
        <span className="absolute right-3 top-2.5 text-gray-400 text-sm">검색 중...</span>
      )}
      {open && results.length > 0 && (
        <ul className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
          {results.map((r) => (
            <li key={r.symbol}>
              <button
                type="button"
                className="w-full text-left px-4 py-2.5 hover:bg-blue-50 flex items-center justify-between text-sm"
                onMouseDown={() => handleSelect(r)}
              >
                <span>
                  <span className="font-medium text-gray-900">{r.name}</span>
                  <span className="text-gray-500 ml-2">{r.symbol}</span>
                </span>
                <span className={`text-xs rounded-full px-2 py-0.5 ${r.market === "KR" ? "bg-blue-100 text-blue-600" : "bg-green-100 text-green-600"}`}>
                  {r.market === "KR" ? "국내" : "미국"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
