"""
KRX 전체 종목 리스트를 FinanceDataReader로 가져와 JSON으로 저장하는 스크립트.
사용법: py scripts/generate-kr-stocks.py
출력: src/lib/kr-stocks-data.json
"""

import json
import os
import sys
from datetime import datetime

try:
    import FinanceDataReader as fdr
except ImportError:
    print("FinanceDataReader가 설치되지 않았습니다.")
    print("설치: pip install git+https://github.com/financedata-org/FinanceDataReader.git")
    sys.exit(1)

def fetch_stocks():
    print("KRX 종목 목록 가져오는 중...")

    kospi = fdr.StockListing('KOSPI')
    kosdaq = fdr.StockListing('KOSDAQ')

    print(f"  KOSPI: {len(kospi)}개")
    print(f"  KOSDAQ: {len(kosdaq)}개")

    stocks = []

    for _, row in kospi.iterrows():
        code = str(row.get('Code', '')).zfill(6)
        name = str(row.get('Name', '')).strip()
        if not code or not name:
            continue
        stocks.append({
            "symbol": f"{code}.KS",
            "name": name,
            "market": "KR",
            "exchange": "KOSPI"
        })

    for _, row in kosdaq.iterrows():
        code = str(row.get('Code', '')).zfill(6)
        name = str(row.get('Name', '')).strip()
        if not code or not name:
            continue
        stocks.append({
            "symbol": f"{code}.KQ",
            "name": name,
            "market": "KR",
            "exchange": "KOSDAQ"
        })

    return stocks

def main():
    stocks = fetch_stocks()

    output = {
        "generated_at": datetime.now().isoformat(),
        "count": len(stocks),
        "stocks": stocks
    }

    # 출력 경로
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    output_path = os.path.join(project_root, "src", "lib", "kr-stocks-data.json")

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"\n[완료] 저장: {output_path}")
    print(f"   총 {len(stocks)}개 종목 (KOSPI + KOSDAQ)")

if __name__ == "__main__":
    main()
