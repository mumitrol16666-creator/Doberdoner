#!/bin/bash
# Собирает настольное меню A4 в PDF — по файлу на каждую точку (QR ведёт в меню именно этой точки).
# Нужен установленный Google Chrome. Запуск:  bash tools/build_print.sh
set -e
cd "$(dirname "$0")/.."
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
mkdir -p print/pdf
for BRANCH in $(node -e "global.window={};require('./site/js/config.js');console.log(window.DOBER.branches.filter(b=>!b.hidden).map(b=>b.id).join(' '))"); do
  OUT="print/pdf/dober-menu-a4-$BRANCH.pdf"
  "$CHROME" --headless=new --disable-gpu --no-pdf-header-footer --virtual-time-budget=8000 \
    --print-to-pdf="$OUT" "file://$PWD/print/menu-a4.html?branch=$BRANCH" 2>/dev/null
  echo "готово: $OUT"
done
