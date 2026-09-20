#!/usr/bin/env python3
"""Вырезает эмблему добермана из аватара сети (brand/avatar-original.png):
цветное кольцо и белый фон убираются, остаётся только чёрная графика.

На выходе:
  brand/logo-black.png  — чёрная эмблема на прозрачном фоне (для светлого фона)
  brand/logo-white.png  — белая эмблема на прозрачном фоне (для тёмного фона)

Запуск:  python3 tools/make_logo.py
Дальше размеры для сайта делает sips — см. README.
"""
import struct
import zlib
from collections import deque
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "brand" / "avatar-original.png"
OUT_BLACK = ROOT / "brand" / "logo-black.png"
OUT_WHITE = ROOT / "brand" / "logo-white.png"
PAD = 6          # прозрачные поля вокруг эмблемы, px
INK = 150        # темнее этого значения — точно линия эмблемы


def read_png(path):
    data = path.read_bytes()
    assert data[:8] == b"\x89PNG\r\n\x1a\n", "not a PNG"
    pos, idat = 8, b""
    while pos < len(data):
        (length,) = struct.unpack(">I", data[pos:pos + 4])
        ctype, chunk = data[pos + 4:pos + 8], data[pos + 8:pos + 8 + length]
        pos += 12 + length
        if ctype == b"IHDR":
            w, h, depth, color, _, _, interlace = struct.unpack(">IIBBBBB", chunk)
        elif ctype == b"IDAT":
            idat += chunk
        elif ctype == b"IEND":
            break
    assert depth == 8 and interlace == 0 and color in (2, 6), "only 8-bit RGB/RGBA"
    bpp = 3 if color == 2 else 4
    raw, stride = zlib.decompress(idat), w * bpp
    rows, prev, i = [], bytearray(stride), 0
    for _ in range(h):
        f, line = raw[i], bytearray(raw[i + 1:i + 1 + stride])
        i += 1 + stride
        if f == 1:
            for x in range(bpp, stride):
                line[x] = (line[x] + line[x - bpp]) & 255
        elif f == 2:
            for x in range(stride):
                line[x] = (line[x] + prev[x]) & 255
        elif f == 3:
            for x in range(stride):
                a = line[x - bpp] if x >= bpp else 0
                line[x] = (line[x] + ((a + prev[x]) >> 1)) & 255
        elif f == 4:
            for x in range(stride):
                a = line[x - bpp] if x >= bpp else 0
                b = prev[x]
                c = prev[x - bpp] if x >= bpp else 0
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                line[x] = (line[x] + (a if pa <= pb and pa <= pc else b if pb <= pc else c)) & 255
        rows.append(line)
        prev = line
    return w, h, bpp, rows


def write_png(path, w, h, rows):
    def chunk(tag, body):
        return struct.pack(">I", len(body)) + tag + body + struct.pack(">I", zlib.crc32(tag + body) & 0xFFFFFFFF)
    raw = b"".join(b"\x00" + bytes(r) for r in rows)
    path.write_bytes(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0)) +
                     chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))


def main():
    w, h, bpp, rows = read_png(SRC)
    px = lambda x, y: rows[y][x * bpp:x * bpp + 3]

    def colorful(x, y):
        """Пиксель цветного кольца вокруг аватара."""
        r, g, b = px(x, y)
        return max(r, g, b) - min(r, g, b) > 60

    # 1. Заливка от краёв: доходит до кольца и останавливается — так отделяем белый фон снаружи от диска
    outside = [bytearray(w) for _ in range(h)]
    queue = deque([(x, 0) for x in range(w)] + [(x, h - 1) for x in range(w)] +
                  [(0, y) for y in range(h)] + [(w - 1, y) for y in range(h)])
    while queue:
        x, y = queue.popleft()
        if outside[y][x] or colorful(x, y):
            continue
        outside[y][x] = 1
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and not outside[ny][nx]:
                queue.append((nx, ny))

    # 2. Внутри диска: прозрачность = насколько пиксель тёмный
    alpha = [bytearray(w) for _ in range(h)]
    for y in range(h):
        for x in range(w):
            if outside[y][x] or colorful(x, y):
                continue
            luma = min(px(x, y))
            alpha[y][x] = 0 if luma > 245 else 255 if luma < INK else int(round((245 - luma) / (245 - INK) * 255))

    # 3. Убираем тёмную каёмку самого диска: всё, что ближе 4 px к кольцу
    edge = [bytearray(w) for _ in range(h)]
    for y in range(h):
        for x in range(w):
            if outside[y][x] or colorful(x, y):
                edge[y][x] = 1
    for _ in range(4):
        grown = [bytearray(row) for row in edge]
        for y in range(h):
            for x in range(w):
                if edge[y][x]:
                    continue
                if any(edge[ny][nx] for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1))
                       if 0 <= nx < w and 0 <= ny < h):
                    grown[y][x] = 1
        edge = grown
    for y in range(h):
        for x in range(w):
            if edge[y][x]:
                alpha[y][x] = 0

    ys = [y for y in range(h) if any(alpha[y])]
    xs = [x for x in range(w) if any(alpha[y][x] for y in ys)]
    x0, x1 = max(0, min(xs) - PAD), min(w - 1, max(xs) + PAD)
    y0, y1 = max(0, min(ys) - PAD), min(h - 1, max(ys) + PAD)

    for out, (cr, cg, cb) in ((OUT_BLACK, (17, 17, 19)), (OUT_WHITE, (255, 255, 255))):
        lines = []
        for y in range(y0, y1 + 1):
            line = bytearray()
            for x in range(x0, x1 + 1):
                line += bytes((cr, cg, cb, alpha[y][x]))
            lines.append(line)
        write_png(out, x1 - x0 + 1, y1 - y0 + 1, lines)
        print("готово:", out.relative_to(ROOT), x1 - x0 + 1, "x", y1 - y0 + 1)


if __name__ == "__main__":
    main()
