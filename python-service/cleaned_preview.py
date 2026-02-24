import argparse
import json
import os

import pandas as pd

from common import clean_dataset, load_dataset, make_json_serializable


def get_cleaned_preview(file_path: str, page: int = 1, page_size: int = 10):
    raw = load_dataset(file_path)
    cleaned, _ = clean_dataset(raw)
    cleaned = cleaned.reset_index(drop=True)

    total_rows = int(cleaned.shape[0])
    page_size = max(1, int(page_size))
    total_pages = max(1, (total_rows + page_size - 1) // page_size)
    page = min(max(1, int(page)), total_pages)

    start = (page - 1) * page_size
    end = start + page_size
    page_df = cleaned.iloc[start:end].copy()
    page_df = page_df.where(pd.notna(page_df), None)

    rows = json.loads(page_df.to_json(orient="records"))

    return {
        "page": page,
        "page_size": page_size,
        "total_rows": total_rows,
        "total_pages": total_pages,
        "columns": list(cleaned.columns),
        "rows": rows,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", required=True)
    parser.add_argument("--page", default=1, type=int)
    parser.add_argument("--page_size", default=10, type=int)
    args = parser.parse_args()

    if not os.path.exists(args.file):
        print(json.dumps({"error": "Dataset file not found."}))
        raise SystemExit(1)

    try:
        result = get_cleaned_preview(args.file, args.page, args.page_size)
        print(json.dumps(make_json_serializable(result)))
    except Exception as exc:
        print(json.dumps({"error": str(exc)}))
        raise SystemExit(1)
