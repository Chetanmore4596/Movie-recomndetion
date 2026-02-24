import json
import math
import os
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd


def _read_csv_with_fallback(file_path: str, sep: str = ",") -> pd.DataFrame:
    try:
        return pd.read_csv(file_path, sep=sep)
    except UnicodeDecodeError:
        return pd.read_csv(file_path, sep=sep, encoding="latin-1")


def load_dataset(file_path: str) -> pd.DataFrame:
    ext = Path(file_path).suffix.lower()
    if ext in {".csv", ".txt"}:
        return _read_csv_with_fallback(file_path)
    if ext == ".tsv":
        return _read_csv_with_fallback(file_path, sep="\t")
    if ext in {".xls", ".xlsx"}:
        return pd.read_excel(file_path)
    if ext == ".json":
        return pd.read_json(file_path)
    if ext == ".jsonl":
        return pd.read_json(file_path, lines=True)
    raise ValueError("Unsupported dataset format.")


def clean_dataset(df: pd.DataFrame) -> tuple[pd.DataFrame, dict[str, Any]]:
    before_rows = int(df.shape[0])
    before_missing = int(df.isna().sum().sum())

    cleaned = df.copy()
    cleaned = cleaned.drop_duplicates()

    for col in cleaned.columns:
        if cleaned[col].dtype == "object":
            cleaned[col] = cleaned[col].astype(str).str.strip().replace({"nan": np.nan, "": np.nan})

    for col in cleaned.columns:
        if pd.api.types.is_numeric_dtype(cleaned[col]):
            median_value = cleaned[col].median()
            cleaned[col] = cleaned[col].fillna(median_value)
        else:
            mode_series = cleaned[col].mode(dropna=True)
            fill_value = mode_series.iloc[0] if not mode_series.empty else "Unknown"
            cleaned[col] = cleaned[col].fillna(fill_value)

    after_rows = int(cleaned.shape[0])
    after_missing = int(cleaned.isna().sum().sum())

    return cleaned, {
        "rows_before": before_rows,
        "rows_after": after_rows,
        "missing_before": before_missing,
        "missing_after": after_missing,
        "duplicates_removed": before_rows - after_rows,
    }


def _truncate(value: Any, max_chars: int = 160) -> Any:
    if value is None or (isinstance(value, float) and np.isnan(value)):
        return None
    if isinstance(value, str) and len(value) > max_chars:
        return value[: max_chars - 3] + "..."
    return value


def frame_preview(df: pd.DataFrame, n: int = 50) -> list[dict[str, Any]]:
    preview = df.head(n).replace({np.nan: None}).copy()
    for col in preview.columns:
        if preview[col].dtype == "object":
            preview[col] = preview[col].apply(_truncate)
    return json.loads(preview.to_json(orient="records"))


def value_counts_lite(series: pd.Series, top_n: int = 8) -> list[dict[str, Any]]:
    vc = series.astype(str).value_counts().head(top_n)
    return [{"name": str(k), "value": int(v)} for k, v in vc.items()]


def make_json_serializable(obj: Any) -> Any:
    if obj is None:
        return None
    if isinstance(obj, dict):
        return {k: make_json_serializable(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [make_json_serializable(x) for x in obj]
    if isinstance(obj, tuple):
        return [make_json_serializable(x) for x in obj]
    if isinstance(obj, np.ndarray):
        return [make_json_serializable(x) for x in obj.tolist()]
    if isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    if isinstance(obj, (np.int64, np.int32)):
        return int(obj)
    if isinstance(obj, (np.float64, np.float32)):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    if isinstance(obj, (np.bool_)):
        return bool(obj)
    if pd.api.types.is_scalar(obj) and pd.isna(obj):
        return None
    return obj


def ensure_temp_dir() -> str:
    temp_dir = Path(__file__).resolve().parent / "temp"
    os.makedirs(temp_dir, exist_ok=True)
    return str(temp_dir)
