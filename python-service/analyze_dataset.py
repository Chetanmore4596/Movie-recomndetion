import argparse
import json
import os
import warnings
from pathlib import Path

import pandas as pd

from common import clean_dataset, frame_preview, load_dataset, make_json_serializable, value_counts_lite

warnings.filterwarnings("ignore", category=RuntimeWarning)


def analyze(file_path: str):
    raw = load_dataset(file_path)
    cleaned, cleaning_meta = clean_dataset(raw)
    cleaned_csv_path = str(Path(file_path).with_name(f"{Path(file_path).stem}_cleaned.csv"))
    cleaned.to_csv(cleaned_csv_path, index=False)

    dtype_counts = (
        cleaned.dtypes.astype(str)
        .value_counts()
        .rename_axis("dtype")
        .reset_index(name="count")
        .to_dict(orient="records")
    )

    missing_by_column = [
        {"column": col, "missing": int(raw[col].isna().sum())} for col in raw.columns
    ]

    numeric_cols = cleaned.select_dtypes(include=["number"]).columns.tolist()
    categorical_cols = cleaned.select_dtypes(exclude=["number"]).columns.tolist()

    numeric_summary = {}
    if numeric_cols:
        desc = cleaned[numeric_cols].describe().round(3)
        numeric_summary = desc.to_dict()

    categorical_summary = {}
    for col in categorical_cols[:5]:
        categorical_summary[col] = value_counts_lite(cleaned[col], top_n=8)

    distributions = []
    for col in numeric_cols[:3]:
        series = pd.to_numeric(cleaned[col], errors="coerce").dropna()
        if series.empty:
            continue
        bins = pd.cut(series, bins=8)
        binned = bins.value_counts().sort_index()
        distributions.append(
            {
                "column": col,
                "bins": [
                    {"name": str(interval), "value": int(count)}
                    for interval, count in binned.items()
                ],
            }
        )

    column_info = [
        {
            "name": col,
            "dtype": str(cleaned[col].dtype),
            "missing": int(raw[col].isna().sum()),
            "unique": int(cleaned[col].nunique()),
        }
        for col in cleaned.columns
    ]

    return {
        "dataset": {
            "file_name": Path(file_path).name,
            "rows": int(raw.shape[0]),
            "columns": int(raw.shape[1]),
            "column_names": list(raw.columns),
        },
        "cleaning": {
            **cleaning_meta,
            "cleaned_csv_path": cleaned_csv_path,
        },
        "column_info": column_info,
        "preview": frame_preview(cleaned, n=50),
        "charts": {
            "dtype_counts": dtype_counts,
            "missing_by_column": missing_by_column,
            "numeric_distributions": distributions,
            "categorical_summary": categorical_summary,
        },
        "stats": {
            "numeric_summary": numeric_summary,
            "categorical_columns": categorical_cols,
            "numeric_columns": numeric_cols,
        },
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", required=True)
    args = parser.parse_args()

    if not os.path.exists(args.file):
        print(json.dumps({"error": "Dataset file not found."}))
        raise SystemExit(1)

    try:
        result = analyze(args.file)
        print(json.dumps(make_json_serializable(result)))
    except Exception as exc:
        print(json.dumps({"error": str(exc)}))
        raise SystemExit(1)
