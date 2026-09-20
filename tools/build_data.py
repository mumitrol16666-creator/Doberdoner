#!/usr/bin/env python3
"""Собирает чистый датасет из сырых ответов 2ГИС (data/raw) и генерирует
данные отзывов для сайта (site/js/reviews.js).

Запуск:  python3 tools/fetch_2gis.py && python3 tools/build_data.py
Какие отзывы показывать на сайте — список SITE_REVIEWS ниже.
"""
import csv
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
OUT = ROOT / "data"
SITE_JS = ROOT / "site" / "js"

# ratings — число оценок в карточке филиала 2ГИС (оценок больше, чем отзывов с текстом)
BRANCHES = {
    "shaikenova": {"firm": "70000001060010769", "title": "На Шайкенова", "ratings": 553},
    "eset-batyra": {"firm": "70000001092741150", "title": "На Есет батыра", "ratings": 521},
    "city-mall": {"firm": "70000001116881897", "title": "В City Shopping Center", "ratings": 57},
    "khromtau": {"firm": "70000001094311159", "title": "В Хромтау", "ratings": 98},
}

# Рейтинг всей сети — как его считает 2ГИС по карточке организации (не среднее по филиалам)
ORG = {"rating": 4.6, "ratings_count": 1229, "reviews_count": 776}

# Отзывы для карусели на сайте: id отзыва 2ГИС → филиал
SITE_REVIEWS = [
    ("267462131", "shaikenova"),    # Нургуль Филипова — «качество с годами только лучше»
    ("268355517", "eset-batyra"),   # Banu Baimenova — «не думала, что донер может быть таким вкусным»
    ("261030617", "shaikenova"),    # Артем Майер — про Добер Стар
    ("255242073", "eset-batyra"),   # Алена Вагнер — доберман и мерзавец
    ("260093995", "shaikenova"),    # Альбина Калыбайкызы — отзыв на казахском
    ("267310515", "city-mall"),     # Орландо Блум — «донер по-актюбински»
    ("261616744", "eset-batyra"),   # Rain Stark — фирменный добер донер
    ("237148838", "khromtau"),      # Гулдаурен Нурмаханова
    ("258832917", "shaikenova"),    # Nikolai — «по-братски» и «вертушка Джеки Чана»
    ("267415819", "city-mall"),     # Арсен Курманалин — быстрая доставка
    ("263057976", "eset-batyra"),   # Даулет Мукаш — про персонал
    ("136233822", "khromtau"),      # Назым — обслуживание
    ("247566391", "shaikenova"),    # Гульпари Байбусинова — постоянный гость
    ("269009418", "city-mall"),     # Кристина Чёрная — «всегда заказываем только у вас»
]


def clean(review, branch, confirmed):
    factors = (review.get("trust_factors") or {}).get("factors") or []
    visits = next((f.get("visits_count") for f in factors if f.get("type") == "location_visit"), None)
    user = review.get("user") or {}
    return {
        "id": review["id"],
        "branch": branch,
        "author": (user.get("name") or "Гость").strip(),
        "rating": review.get("rating"),
        "date": (review.get("date_created") or "")[:10],
        "text": re.sub(r"\n{3,}", "\n\n", (review.get("text") or "").strip()),
        "visits": visits,
        "confirmed": confirmed,
        "likes": review.get("likes_count") or 0,
    }


def load(branch):
    items, meta = [], None
    for kind, confirmed in (("rated", True), ("unrated", False)):
        path = RAW / "reviews_{b}_{k}.json".format(b=branch, k=kind)
        if not path.exists():
            continue
        page = json.loads(path.read_text(encoding="utf-8"))
        meta = meta or page.get("meta")
        items += [clean(r, branch, confirmed) for r in page.get("reviews") or []]
    items.sort(key=lambda r: r["date"], reverse=True)
    return meta or {}, items


def js_literal(value, indent=2):
    return json.dumps(value, ensure_ascii=False, indent=indent)


def main():
    branches, all_reviews = {}, []
    for slug, info in BRANCHES.items():
        meta, items = load(slug)
        rated = [r for r in items if r["confirmed"] and r["rating"]]
        branches[slug] = {
            "title": info["title"],
            "firm_id": info["firm"],
            "rating": meta.get("branch_rating"),
            "ratings_count": info["ratings"],
            "reviews_count": meta.get("branch_reviews_count"),
            "with_text": len([r for r in items if r["text"]]),
            "distribution": {str(s): sum(1 for r in rated if r["rating"] == s) for s in range(5, 0, -1)},
        }
        all_reviews += items

    total_rated = [r for r in all_reviews if r["confirmed"] and r["rating"]]
    summary = {
        "org": ORG,
        "branches": branches,
        "reviews_total": len(all_reviews),
        "rated_total": len(total_rated),
        "distribution": {str(s): sum(1 for r in total_rated if r["rating"] == s) for s in range(5, 0, -1)},
        "rating_by_texts": round(sum(r["rating"] for r in total_rated) / len(total_rated), 2) if total_rated else None,
    }

    (OUT / "dober_2gis.json").write_text(
        json.dumps({"source": "https://2gis.kz", "fetched_at": "2026-09-20",
                    "summary": summary, "reviews": all_reviews}, ensure_ascii=False, indent=2),
        encoding="utf-8")

    with open(OUT / "reviews.csv", "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(["id", "филиал", "автор", "оценка", "дата", "подтверждён", "лайки", "текст"])
        for r in all_reviews:
            w.writerow([r["id"], BRANCHES[r["branch"]]["title"], r["author"], r["rating"], r["date"],
                        "да" if r["confirmed"] else "нет", r["likes"], r["text"]])

    index = {r["id"]: r for r in all_reviews}
    picked = []
    for rid, branch in SITE_REVIEWS:
        r = index.get(rid)
        if not r:
            print("⚠️  отзыв не найден:", rid)
            continue
        picked.append({k: r[k] for k in ("id", "branch", "author", "rating", "date", "text", "visits")})

    site = {
        "summary": {
            "rating": ORG["rating"],
            "ratings_count": ORG["ratings_count"],
            "reviews_count": ORG["reviews_count"],
            "distribution": summary["distribution"],
            "rated_total": summary["rated_total"],
            "branches": {slug: {"rating": b["rating"], "ratings_count": b["ratings_count"],
                                "reviews_count": b["reviews_count"]}
                         for slug, b in branches.items()},
        },
        "items": picked,
    }
    (SITE_JS / "reviews.js").write_text(
        "/* Отзывы из 2ГИС. Файл генерируется скриптом tools/build_data.py — руками не править. */\n"
        "window.DOBER_REVIEWS = " + js_literal(site) + ";\n", encoding="utf-8")
    print("отзывов всего:", len(all_reviews), "· на сайте:", len(picked),
          "· рейтинг сети:", ORG["rating"], "· среднее по текстам:", summary["rating_by_texts"])


if __name__ == "__main__":
    main()
