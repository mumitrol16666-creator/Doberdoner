#!/bin/bash
# Собирает заставки для превью ссылок: site/img/og-home.jpg и site/img/og-menu.jpg (1200×630, до 300 КБ).
# Нужен Google Chrome. Запуск:  bash tools/build_og.sh   (потом node tools/build_static.js — он пропишет их в страницы)
set -e
cd "$(dirname "$0")/.."
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
TMP="$(mktemp -d)"
for PAGE in home menu; do
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --virtual-time-budget=8000 --force-device-scale-factor=1 \
    --window-size=1200,630 --screenshot="$TMP/og-$PAGE.png" "file://$PWD/tools/og/cover.html?page=$PAGE" 2>/dev/null
  sips -s format jpeg -s formatOptions 82 "$TMP/og-$PAGE.png" --out "site/img/og-$PAGE.jpg" >/dev/null
  echo "готово: site/img/og-$PAGE.jpg — $(( $(stat -f%z "site/img/og-$PAGE.jpg") / 1024 )) КБ"
done
rm -rf "$TMP"
