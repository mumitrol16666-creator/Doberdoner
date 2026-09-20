#!/usr/bin/env python3
"""Скачивает отзывы 2ГИС по всем филиалам Dober doner в data/raw/.

Запуск:  python3 tools/fetch_2gis.py
Дальше:  python3 tools/build_data.py  — соберёт data/*.json и site/js/reviews.js
"""
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
KEY = "6e7e1929-4ea9-4a5d-8c05-d601860389bd"   # публичный ключ веб-версии 2ГИС
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0 Safari/537.36")

# slug → id филиала в 2ГИС
BRANCHES = {
    "shaikenova": "70000001060010769",   # Нагашбай Шайкенова, 20
    "eset-batyra": "70000001092741150",  # Есет батыра, 83
    "city-mall": "70000001116881897",    # ТЦ City Shopping Center, 12 мкр
    "khromtau": "70000001094311159",     # Хромтау, Мухтара Ауэзова, 9а
}


def get(url):
    out = subprocess.run(["curl", "-s", "-A", UA, "-H", "Referer: https://2gis.kz/", url],
                         capture_output=True, text=True, check=True).stdout
    return json.loads(out)


def reviews(firm_id, rated, limit=50):
    url = ("https://public-api.reviews.2gis.com/2.0/branches/{id}/reviews?limit={limit}"
           "&is_advertiser=false&fields=meta.providers,meta.branch_rating,"
           "meta.branch_reviews_count,meta.total_count&without_my_first_review=false"
           "&rated={rated}&sort_by=date_edited&key={key}&locale=ru_KZ").format(
        id=firm_id, limit=limit, rated=str(rated).lower(), key=KEY)
    items, meta = [], None
    while url and len(items) < 400:
        page = get(url)
        meta = meta or page.get("meta")
        items += page.get("reviews") or []
        url = (page.get("meta") or {}).get("next_link")
    return meta, items


def main():
    RAW.mkdir(parents=True, exist_ok=True)
    for slug, firm_id in BRANCHES.items():
        for rated in (True, False):
            meta, items = reviews(firm_id, rated)
            name = "reviews_{slug}_{kind}.json".format(slug=slug, kind="rated" if rated else "unrated")
            (RAW / name).write_text(json.dumps({"meta": meta, "reviews": items}, ensure_ascii=False, indent=1),
                                    encoding="utf-8")
            print(name, len(items))


if __name__ == "__main__":
    main()
