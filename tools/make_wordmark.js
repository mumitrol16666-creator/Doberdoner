// Собирает site/img/wordmark.svg — надпись DOBER / DONER как на вывеске точек.
// Буквы переводятся в контуры (сайт не зависит от шрифта), заливка красная, белая обводка — внутри контура.
//
// Один раз:  cd tools && npm i opentype.js@1.3.4
//            curl -L -o Montserrat-Black.ttf https://github.com/JulietaUla/Montserrat/raw/master/fonts/ttf/Montserrat-Black.ttf
// Запуск:    node tools/make_wordmark.js site/img/wordmark.svg   (из папки проекта)
// Надпись DOBER / DONER как на вывеске: буквы переведены в контуры (от шрифта не зависит),
// красная заливка + белая обводка ВНУТРИ контура (клип по форме тех же букв).
const opentype = require('opentype.js');
const fs = require('fs');
const font = opentype.loadSync(require('path').join(__dirname, 'Montserrat-Black.ttf'));

function line(text, size, spacing, baseline) {
  // раскладываем буквы вручную: ширина глифа + кернинг + разрядка
  let x = 0; const parts = [];
  const glyphs = font.stringToGlyphs(text);
  glyphs.forEach((g, i) => {
    parts.push(g.getPath(x, baseline, size).toPathData(2));
    const kern = i < glyphs.length - 1 ? font.getKerningValue(g, glyphs[i + 1]) : 0;
    x += (g.advanceWidth + kern) * size / font.unitsPerEm + (i < glyphs.length - 1 ? spacing : 0);
  });
  return { d: parts.join(''), width: x };
}

// подбираем размер так, чтобы обе строки были шириной 100
const W = 100;
let s1 = 26; const w1 = line('DOBER', s1, 0, 0).width; s1 = +(s1 * W / w1).toFixed(3);
const s2 = 16.5; const w2raw = line('DONER', s2, 0, 0).width; const sp2 = +((W - w2raw) / 4).toFixed(3);
const a = line('DOBER', s1, 0, 24);
const b = line('DONER', s2, sp2, 41);
const cap1 = font.tables.os2.sCapHeight * s1 / font.unitsPerEm, cap2 = font.tables.os2.sCapHeight * s2 / font.unitsPerEm;
const top = +(24 - cap1 - 1).toFixed(2), bottom = 42.5;
const rim1 = +(cap1 * 0.075 * 2).toFixed(2), rim2 = +(cap2 * 0.075 * 2).toFixed(2);   // обводка ≈7.5% высоты букв

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${top} ${W} ${+(bottom - top).toFixed(2)}" role="img" aria-label="Dober Doner">
<defs><clipPath id="a"><path d="${a.d}"/></clipPath><clipPath id="b"><path d="${b.d}"/></clipPath></defs>
<g fill="#ee1d2f" stroke="#fff" stroke-linejoin="round">
<path d="${a.d}" stroke-width="${rim1}" clip-path="url(#a)"/>
<path d="${b.d}" stroke-width="${rim2}" clip-path="url(#b)"/>
</g></svg>
`;
fs.writeFileSync(process.argv[2], svg);
console.log(JSON.stringify({ size1: s1, size2: s2, spacing2: sp2, width1: a.width.toFixed(2), width2: b.width.toFixed(2), viewBox: [0, top, W, bottom - top], rim1, rim2, bytes: svg.length }));
