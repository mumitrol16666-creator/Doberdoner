#!/usr/bin/env python3
"""Забирает меню Dober doner с их же страницы kamiqr (window.__data__) в data/raw/kamiqr_menu_raw.json
и раскладывает фото блюд в data/photos/original/.

Запуск:  python3 tools/fetch_menu.py
"""
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
PHOTOS = ROOT / "data" / "photos" / "original"
SRC = "https://dober-doner.kamiqr.com/menu/delivery/list?current_section=330dbf9f-b35d-44c3-8cab-661a791b4b78"
CDN = "https://kamigroup.fra1.cdn.digitaloceanspaces.com/kami/prod/menuItems/"
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0 Safari/537.36")


def main():
    RAW.mkdir(parents=True, exist_ok=True)
    PHOTOS.mkdir(parents=True, exist_ok=True)
    html = subprocess.run(["curl", "-s", "-A", UA, SRC], capture_output=True, text=True, check=True).stdout
    m = re.search(r"window\.__data__\s*=\s*(\{.*?\});?\s*</script>", html, re.S)
    if not m:
        raise SystemExit("не нашли window.__data__ — страница изменилась")
    data = json.loads(m.group(1))
    (RAW / "kamiqr_menu_raw.json").write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")

    for item in data["data"]["items"].values():
        img = item.get("mainImg")
        if not img:
            continue
        out = PHOTOS / img
        if out.exists() and out.stat().st_size:
            continue
        subprocess.run(["curl", "-s", "-o", str(out), CDN + img], check=False)
        print("photo", img, out.stat().st_size // 1024, "KB")


if __name__ == "__main__":
    main()
