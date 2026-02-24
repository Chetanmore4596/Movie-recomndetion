import argparse
import json
import os
import warnings

import pandas as pd

from common import clean_dataset, load_dataset, make_json_serializable

warnings.filterwarnings("ignore", category=RuntimeWarning)

SUPPORTED_LANGUAGES = {
    "hindi": {"hindi", "hi", "hin"},
    "english": {"english", "en", "eng"},
    "telugu": {"telugu", "te"},
    "tamil": {"tamil", "ta"},
    "malayalam": {"malayalam", "ml"},
    "kannada": {"kannada", "kn"},
}

SUPPORTED_CATEGORIES = {
    "action": {"action"},
    "adventure": {"adventure"},
    "comedy": {"comedy"},
    "drama": {"drama"},
    "romance": {"romance"},
    "horror": {"horror"},
    "thriller": {"thriller"},
    "mystery": {"mystery"},
    "science fiction": {"science fiction", "sci fi", "sci-fi", "scifi"},
    "fantasy": {"fantasy"},
    "animation": {"animation"},
    "family": {"family"},
    "crime": {"crime"},
    "biography": {"biography", "biopic"},
    "historical": {"historical", "history"},
    "war": {"war"},
    "musical": {"musical", "music"},
    "sports": {"sports", "sport"},
    "documentary": {"documentary"},
    "western": {"western"},
    "superhero": {"superhero"},
    "psychological": {"psychological"},
    "noir": {"noir"},
    "disaster": {"disaster"},
    "survival": {"survival"},
}


def _pick_column(df: pd.DataFrame, candidates: list[str]) -> str | None:
    lower_map = {c.lower(): c for c in df.columns}
    for name in candidates:
        if name in lower_map:
            return lower_map[name]
    return None


def _infer_language_key(value: str) -> str:
    text = str(value).strip().lower()
    for canonical, variants in SUPPORTED_LANGUAGES.items():
        if text in variants or canonical in text:
            return canonical
    return "other"


def _normalize_genre(value: str) -> str:
    text = str(value or "").strip()
    if not text:
        return "unknown"
    first = text.split(",")[0].strip().lower().replace("film", "").replace("-", " ").strip()
    first = " ".join(first.split())
    for canonical, variants in SUPPORTED_CATEGORIES.items():
        if first in variants or canonical in first:
            return canonical
    return "unknown"


def _prepare_ranked_from_dataset(
    cleaned: pd.DataFrame, top_n: int, language: str = "all", genre: str = "all"
) -> tuple[list[dict], dict]:
    title_col = _pick_column(cleaned, ["title", "movie_title", "name"])
    if not title_col:
        raise ValueError("No title column found in the dataset.")

    rating_col = _pick_column(cleaned, ["imdb_rating", "vote_average", "rating", "score"])
    vote_count_col = _pick_column(cleaned, ["vote_count", "votes", "rating_count"])
    language_col = _pick_column(cleaned, ["original_language", "spoken_languages", "language", "lang"])
    genre_col = _pick_column(cleaned, ["genres", "genre", "category"])
    release_col = _pick_column(cleaned, ["release_date", "year", "release_year"])

    working = cleaned[[title_col]].copy()
    working["title"] = cleaned[title_col].astype(str).str.strip()
    working = working[working["title"] != ""]

    if rating_col:
        working["score"] = pd.to_numeric(cleaned[rating_col], errors="coerce").fillna(0.0)
    else:
        popularity_col = _pick_column(cleaned, ["popularity"])
        working["score"] = (
            pd.to_numeric(cleaned[popularity_col], errors="coerce").fillna(0.0)
            if popularity_col
            else 0.0
        )

    if vote_count_col:
        working["vote_count"] = pd.to_numeric(cleaned[vote_count_col], errors="coerce").fillna(0).astype(int)
    else:
        working["vote_count"] = 0

    if language_col:
        working["language"] = cleaned[language_col].astype(str).apply(_infer_language_key)
    else:
        working["language"] = "other"

    if genre_col:
        working["genre"] = cleaned[genre_col].astype(str).apply(_normalize_genre)
    else:
        working["genre"] = "unknown"

    if release_col:
        years = pd.to_datetime(cleaned[release_col], errors="coerce").dt.year.fillna(0).astype(int)
        working["year"] = years.where(years > 0, None)
    else:
        working["year"] = None

    # Restrict recommendations to modern movie years.
    working = working[(working["year"].isna()) | ((working["year"] >= 2000) & (working["year"] <= 2026))]

    full_languages = ["all"] + sorted(working["language"].dropna().astype(str).unique().tolist())
    full_genres = ["all"] + sorted(working["genre"].dropna().astype(str).unique().tolist())

    language = (language or "all").strip().lower()
    if language != "all":
        working = working[working["language"] == language]

    genre = (genre or "all").strip().lower()
    if genre != "all":
        working = working[working["genre"] == genre]

    working["title_key"] = working["title"].astype(str).str.strip().str.lower()

    ranked = (
        working.sort_values(by=["score", "vote_count"], ascending=[False, False])
        .drop_duplicates(subset=["title_key"], keep="first")
        .head(max(top_n * 5, 100))
    )

    recommendations = [
        {
            "title": row.title,
            "score": round(float(row.score), 2),
            "language": row.language,
            "genre": row.genre,
            "source": "dataset",
            "year": row.year,
        }
        for row in ranked.itertuples(index=False)
    ]

    filter_options = {
        "languages": ["all", "hindi", "english", "telugu", "tamil", "malayalam", "kannada"],
        "genres": [
            "all",
            "action",
            "adventure",
            "comedy",
            "drama",
            "romance",
            "horror",
            "thriller",
            "mystery",
            "science fiction",
            "fantasy",
            "animation",
            "family",
            "crime",
            "biography",
            "historical",
            "war",
            "musical",
            "sports",
            "documentary",
            "western",
            "superhero",
            "psychological",
            "noir",
            "disaster",
            "survival",
        ],
    }

    model_info = {
        "rows_used": int(cleaned.shape[0]),
        "title_column": title_col,
        "rating_column": rating_col,
        "language_column": language_col,
        "genre_column": genre_col,
    }
    return recommendations, model_info, filter_options


def build_recommendations(file_path: str, top_n: int = 12, language: str = "all", genre: str = "all"):
    raw = load_dataset(file_path)
    cleaned, _ = clean_dataset(raw)

    dataset_recommendations, model_info, filter_options = _prepare_ranked_from_dataset(
        cleaned, top_n, language, genre
    )

    merged = dataset_recommendations[:top_n]

    return {
        "query": "top_rated",
        "language": (language or "all").strip().lower(),
        "genre": (genre or "all").strip().lower(),
        "recommendations": merged,
        "filter_options": filter_options,
        "message": "Top-rated recommendations generated from uploaded dataset.",
        "model_info": {
            **model_info,
            "dataset_count": len(dataset_recommendations),
            "returned_count": len(merged),
        },
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", required=True)
    parser.add_argument("--top_n", default=12, type=int)
    parser.add_argument("--language", default="all")
    parser.add_argument("--genre", default="all")
    args = parser.parse_args()

    if not os.path.exists(args.file):
        print(json.dumps({"error": "Dataset file not found."}))
        raise SystemExit(1)

    try:
        result = build_recommendations(args.file, args.top_n, args.language, args.genre)
        print(json.dumps(make_json_serializable(result)))
    except Exception as exc:
        print(json.dumps({"error": str(exc)}))
        raise SystemExit(1)
