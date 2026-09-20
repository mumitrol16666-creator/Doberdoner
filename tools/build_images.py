#!/usr/bin/env python3
"""Готовит фото блюд для сайта: data/photos/original/<хэш>.jpg → site/img/<слаг>.jpg (800 px)
и site/img/<слаг>-sm.jpg (360 px, для плиток и подсказок). Работает через системный sips (macOS).

Запуск:  python3 tools/build_images.py
"""
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw" / "kamiqr_menu_raw.json"
SRC = ROOT / "data" / "photos" / "original"
OUT = ROOT / "site" / "img"

# название блюда в меню kamiqr → имя файла на сайте
SLUGS = {
    "DOBER STAR": "dober-star",
    "DOBER DONER": "dober-doner",
    "DOBER MEKS": "dober-meks",
    "ПП-шнейница": "pp-shneinica",
    "GRIBOEDOV": "griboedov",
    "Черная Жемчужина": "black-pearl",
    "Джимиччури": "jimichurri",
    "DOBER Louis za Verton": "louis",
    "ПО-БРАТСКИ": "po-bratski",
    "Чики Брики": "chiki-briki",
    "BEEF Бургер": "beef-burger",
    "Ласковый мерзавец": "merzavec",
    "Чикен Стоун": "chicken-stone",
    "Джиперс Криперс": "jeepers",
    "Вертушка Джеки Чана": "vertushka",
    "Чикаго Блюз": "chicago",
    'Бургер фирменный "DOBERMAN"': "doberman",
    "Чикен": "chicken",
    "Картофель фри": "fries",
    "Картофельные дольки": "wedges",
    "Доберсы": "dobersy",
    "Луковые кольца": "onion-rings",
    "Нагетсы": "nuggets",
    "Соус BBQ": "sauce-bbq",
    "Соус сырный": "sauce-cheese",
    "Кетчуп": "ketchup",
    "Перчик дополнительно": "pepper",
    "Соус белый": "sauce-white",
    "Медово-чесночный": "sauce-honey",
    "Сладкий чили": "sauce-chili",
    "Coca Cola": "cola",
    "Sprite": "sprite",
    "Fanta": "fanta",
    "Чай FuseTea в ассортименте": "fusetea",
    "Coca Cola Zero": "cola-zero",
    "Fanta Granat": "fanta-granat",
    "Компот из сухофруктов": "compote",
    "Сок с трубочкой Piko в ассортименте": "piko",
    "Турецкий Айран": "ayran",
    "BonAqua": "bonaqua",
    "Piko тетрапак в ассортименте": "piko-tetra",
    "Piko Pulpy в ассортименте": "piko-pulpy",
}


def sips(src, dst, size):
    subprocess.run(["sips", "-s", "format", "jpeg", "-s", "formatOptions", "72",
                    "-Z", str(size), str(src), "--out", str(dst)],
                   check=True, capture_output=True)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    items = json.loads(RAW.read_text(encoding="utf-8"))["data"]["items"]
    missing = []
    for item in items.values():
        name = (item["name"].get("RU") or "").strip()
        slug = SLUGS.get(name)
        if not slug:
            missing.append(name)
            continue
        src = SRC / (item.get("mainImg") or "")
        if not src.exists():
            missing.append(name + " (нет файла)")
            continue
        sips(src, OUT / (slug + ".jpg"), 800)
        sips(src, OUT / (slug + "-sm.jpg"), 360)
        print(slug, (OUT / (slug + ".jpg")).stat().st_size // 1024, "KB")
    if missing:
        print("БЕЗ ФОТО:", ", ".join(missing))


if __name__ == "__main__":
    main()
