#!/usr/bin/env node
/*
 * Кладёт содержимое сайта в сам HTML, чтобы поисковики видели меню, цены, точки и отзывы без выполнения JS.
 * Источник данных — те же site/js/config.js и site/js/reviews.js; в браузере app.js потом заменяет
 * этот HTML интерактивной версией (корзина, выбор точки, казахский язык).
 *
 * Что делает:
 *   - заполняет места между метками <!-- static:… --> в index.html и menu.html;
 *   - подставляет данные первой точки в контакты и плашку точки;
 *   - собирает schema.org: 4 точки (FastFoodRestaurant) + меню (Menu → MenuSection → MenuItem с ценами);
 *   - ставит canonical и абсолютный og:image по site.url;
 *   - прячет сайт от поисковиков или открывает его по флагу site.indexable в config.js;
 *   - пишет robots.txt и sitemap.xml.
 *
 * Запуск:  node tools/build_static.js   (GitHub Actions делает это сам перед каждой публикацией)
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE = path.join(ROOT, 'site');
global.window = {};
require(path.join(SITE, 'js', 'config.js'));
require(path.join(SITE, 'js', 'reviews.js'));
const CFG = window.DOBER;
const REV = window.DOBER_REVIEWS || { summary: null, items: [] };
const URL_BASE = CFG.site.url.replace(/\/?$/, '/');

// ───────────── помощники (повторяют логику app.js) ─────────────
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const money = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ' + CFG.currency;
const icon = id => '<svg class="ic" aria-hidden="true"><use href="#i-' + id + '"/></svg>';
const plural = (n, forms) => { const a = Math.abs(n) % 100, b = a % 10; return forms[a > 10 && a < 20 ? 2 : b === 1 ? 0 : b > 1 && b < 5 ? 1 : 2]; };
const webp = src => src.replace(/\.(jpg|png)$/, '.webp');
const small = src => webp(src.replace('.jpg', '-sm.jpg'));

const CATS = CFG.menu.filter(c => !c.hidden).map(c => Object.assign({}, c, { items: c.items.filter(i => !i.hidden) }));
const ITEMS = {};
CATS.forEach(c => c.items.forEach(i => { ITEMS[i.id] = i; }));
const BRANCHES = CFG.branches.filter(b => !b.hidden);
const MAIN = BRANCHES[0];

const groupsOf = item => item.groups || [];
const hasChoice = item => groupsOf(item).length > 0 || (item.extras || []).length > 0;
function defaultDelta(item) {
  return groupsOf(item).reduce((sum, g) => {
    const o = g.options.find(x => x.id === (item.defaults || {})[g.id]) || g.options.find(x => x.def) || g.options[0];
    return sum + (o.price || 0);
  }, 0);
}
const minPrice = item => (item.price || 0) + defaultDelta(item);
const oldPrice = item => (item.oldPrice ? item.oldPrice + defaultDelta(item) : null);
const priceText = item => (hasChoice(item) ? 'от ' : '') + money(minPrice(item));

const fullAddress = b => b.address + (b.addressNote ? ', ' + b.addressNote : '') + ', ' + b.city;
function deliveryLine(b) {
  if (!b.delivery) return 'Только навынос';
  if (b.delivery.fee == null) return 'Доставка и навынос';
  return b.delivery.freeFrom ? 'Доставка ' + money(b.delivery.fee) + ', от ' + money(b.delivery.freeFrom) + ' — бесплатно' : 'Доставка ' + money(b.delivery.fee);
}
const routeLink = b => 'https://2gis.kz/aktobe/directions/points/%7C' + b.geo.lon + '%2C' + b.geo.lat;
const ratingOf = b => {
  const fresh = (REV.summary && REV.summary.branches[b.id]) || {};
  return { value: fresh.rating || (b.rating || {}).value, count: fresh.ratings_count || (b.rating || {}).count };
};

function badges(item) {
  const list = [];
  if (item.badge) list.push('<span class="badge">' + esc(item.badge) + '</span>');
  if (item.spicy) list.push('<span class="badge badge--hot">🌶 Острый</span>');
  return list.length ? list.join('') : '';
}
function stars(n) {
  let out = '<span class="stars" role="img" aria-label="Оценка ' + n + ' из 5">';
  for (let i = 1; i <= 5; i++) out += '<svg class="ic' + (i > n ? ' off' : '') + '" aria-hidden="true"><use href="#i-star"/></svg>';
  return out + '</span>';
}

// ───────────── фрагменты разметки ─────────────
function cardHTML(item) {
  const b = badges(item), old = oldPrice(item);
  const act = hasChoice(item)
    ? '<button type="button" class="btn btn--brand add">Выбрать</button>'
    : '<button type="button" class="btn btn--brand add">' + icon('plus') + 'Добавить</button>';
  return '<article class="card" id="item-' + esc(item.id) + '">' +
    '<button type="button" class="card__media" aria-label="Открыть: ' + esc(item.name) + '">' +
      (item.image ? '<img src="' + esc(small(item.image)) + '" alt="' + esc(item.name) + '" loading="lazy" width="360" height="360">' : '') +
      (b ? '<div class="card__badges">' + b + '</div>' : '') +
    '</button>' +
    '<div class="card__body"><h4 class="card__name">' + esc(item.name) + '</h4>' +
      (item.desc ? '<p class="card__desc">' + esc(item.desc) + '</p>' : '') +
      '<div class="card__foot"><div class="card__price">' + (old ? '<s>' + money(old) + '</s>' : '') + '<b>' + priceText(item) + '</b></div>' +
      '<div class="card__act">' + act + '</div></div>' +
    '</div></article>';
}

const menuHTML = CATS.map(cat =>
  '<section class="cat" id="cat-' + esc(cat.id) + '" aria-labelledby="cat-h-' + esc(cat.id) + '">' +
    '<div class="cat__head"><h3 id="cat-h-' + esc(cat.id) + '">' + esc(cat.title) + '</h3>' +
      (cat.note ? '<span class="cat__note">' + esc(cat.note) + '</span>' : '') + '</div>' +
    '<div class="cards">' + cat.items.map(cardHTML).join('') + '</div>' +
  '</section>').join('');

const catsHTML = CATS.map(cat => '<a href="#cat-' + esc(cat.id) + '" data-cat="' + esc(cat.id) + '">' + esc(cat.title) + '</a>').join('');

const teaserHTML = CATS.map(cat =>
  '<a class="tile" href="menu.html#cat-' + esc(cat.id) + '"><span class="tile__e" aria-hidden="true">' + esc(cat.emoji || '🍽️') + '</span>' +
  '<span class="tile__t">' + esc(cat.title) + '</span><span class="tile__p">от ' + money(Math.min.apply(null, cat.items.map(minPrice))) + '</span></a>').join('');

const highlightsHTML = (CFG.highlights || []).filter(id => ITEMS[id]).map(id => {
  const item = ITEMS[id], b = badges(item);
  return '<a class="hit" href="menu.html#item-' + esc(id) + '"><span class="hit__media">' +
    (item.image ? '<img src="' + esc(small(item.image)) + '" alt="' + esc(item.name) + '" loading="lazy" width="360" height="360">' : '') +
    (b ? '<span class="card__badges">' + b + '</span>' : '') + '</span>' +
    '<span class="hit__name">' + esc(item.name) + '</span><span class="hit__price">' + priceText(item) + '</span></a>';
}).join('');

const branchesHTML = BRANCHES.map(b => {
  const r = ratingOf(b);
  return '<article class="bcard" id="branch-' + esc(b.id) + '">' +
    '<div class="bcard__head"><h3>' + esc(b.name) + '</h3>' +
      (r.value ? '<span class="bcard__rating">' + icon('star') + '<b>' + r.value.toFixed(1) + '</b><span>' + r.count + ' ' + plural(r.count, ['оценка', 'оценки', 'оценок']) + '</span></span>' : '') + '</div>' +
    '<div class="bcard__row"><span>' + icon('pin') + '</span><span>' + esc(fullAddress(b) + (b.landmark ? ' · ' + b.landmark : '')) + '</span></div>' +
    '<div class="bcard__row"><span>' + icon('clock') + '</span><span>' + esc(b.hours.label + (b.hours.lastOrder ? ' · заказы до ' + b.hours.lastOrder : '')) + '</span></div>' +
    '<div class="bcard__row"><span>' + icon('bag') + '</span><span>' + esc(deliveryLine(b)) + '</span></div>' +
    ((b.features || []).length ? '<div class="bcard__tags">' + b.features.map(f => '<span>' + esc(f) + '</span>').join('') + '</div>' : '') +
    '<div class="bcard__btns">' +
      '<a class="btn btn--brand" href="menu.html?branch=' + esc(b.id) + '">Заказать отсюда</a>' +
      '<a class="btn btn--light" href="tel:' + esc(b.phone) + '">' + icon('phone') + esc(b.phoneDisplay) + '</a>' +
      '<a class="btn btn--light" href="https://wa.me/' + esc(b.whatsapp) + '" target="_blank" rel="noopener">' + icon('whatsapp') + 'WhatsApp</a>' +
      '<a class="btn btn--light" href="' + esc(b.twoGis) + '" target="_blank" rel="noopener">2ГИС</a>' +
      '<a class="btn btn--light" href="' + esc(routeLink(b)) + '" target="_blank" rel="noopener">Маршрут</a>' +
    '</div></article>';
}).join('');

let promoHTML = '';
const promo = CFG.promo, promoItem = promo && promo.active !== false && ITEMS[promo.item];
if (promoItem) {
  promoHTML = '<div class="deal__media"><img src="' + esc(webp(promoItem.image)) + '" alt="' + esc(promoItem.name) + '" loading="lazy" width="800" height="800"></div>' +
    '<div class="deal__body"><span class="deal__badge">' + icon('fire') + 'Акция сети</span><h2>' + esc(promo.title) + '</h2>' +
    (promo.text ? '<p class="deal__text">' + esc(promo.text) + '</p>' : '') +
    '<div class="deal__price">' + (promoItem.oldPrice ? '<s>' + money(promoItem.oldPrice) + '</s>' : '') + '<b>' + money(promoItem.price) + '</b></div>' +
    '<div class="deal__cta"><a class="btn btn--brand btn--lg" href="menu.html#item-' + esc(promoItem.id) + '">Заказать по акции</a></div></div>';
}

let ratingHTML = '', reviewsHTML = '';
const S = REV.summary;
if (S) {
  const dist = S.distribution, max = Math.max.apply(null, Object.values(dist)) || 1;
  ratingHTML = '<div class="rating__top"><div class="rating__num">' + S.rating.toFixed(1) + '</div><div>' + stars(Math.round(S.rating)) +
    '<div class="rating__sub">' + S.ratings_count + ' ' + plural(S.ratings_count, ['оценка', 'оценки', 'оценок']) + ' · ' +
    S.reviews_count + ' ' + plural(S.reviews_count, ['отзыв', 'отзыва', 'отзывов']) + ' в 2ГИС по всем точкам</div></div></div>' +
    '<div class="bars">' + [5, 4, 3, 2, 1].map(n => '<div class="bar"><span>' + n + '</span><i><b style="width:' + Math.round((dist[n] || 0) / max * 100) + '%"></b></i><span>' + (dist[n] || 0) + '</span></div>').join('') + '</div>' +
    '<p class="bars__note">Распределение — по ' + S.rated_total + ' отзывам с оценкой.</p>' +
    '<div class="rating__branches">' + BRANCHES.map(b => { const r = (S.branches || {})[b.id]; return r ? '<span class="rating__branch"><b>' + r.rating.toFixed(1) + '</b><span>' + esc(b.name) + '</span></span>' : ''; }).join('') + '</div>';
}
const AVA = ['#262a78', '#ee1d2f', '#111113', '#1b1e5c', '#4a4a52', '#c8121f'];
const initials = name => (name.split(/\s+/).filter(w => /^\p{L}/u.test(w)).slice(0, 2).map(w => Array.from(w)[0].toUpperCase()).join('')) || '★';
const reviewDate = iso => new Date(iso + 'T12:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
const branchName = id => (BRANCHES.find(b => b.id === id) || {}).name || '';
reviewsHTML = REV.items.map((r, i) =>
  '<article class="rev"><div class="rev__head"><div class="rev__ava" style="background:' + AVA[i % AVA.length] + '" aria-hidden="true">' + esc(initials(r.author)) + '</div>' +
  '<div><div class="rev__name">' + esc(r.author) + '</div><div class="rev__meta">' + esc(reviewDate(r.date)) + '</div></div></div>' +
  stars(r.rating) + '<p class="rev__text">' + esc(r.text) + '</p>' +
  '<span class="rev__tag">' + icon('pin') + esc(branchName(r.branch)) + '</span></article>').join('');

const galleryHTML = (CFG.gallery || []).filter(g => ITEMS[g.id]).map(g => {
  const item = ITEMS[g.id];
  return '<button type="button" class="' + (g.shape ? 'is-' + g.shape : '') + '" aria-label="Открыть фото: ' + esc(item.name) + '">' +
    '<img src="' + esc(small(item.image)) + '" alt="' + esc(item.name) + '" loading="lazy"></button>';
}).join('');

// ───────────── schema.org: точки + меню ─────────────
const hoursSpec = b => 'Mo-Su ' + String(b.hours.open).padStart(2, '0') + ':00-' + (b.hours.close === 24 ? '24' : String(b.hours.close % 24).padStart(2, '0')) + ':00';
const MENU_ID = URL_BASE + 'menu.html#menu';
const graph = BRANCHES.map(b => {
  const r = ratingOf(b);
  const node = {
    '@type': 'FastFoodRestaurant',
    '@id': URL_BASE + '#' + b.id,
    name: 'Dober Doner — ' + b.name,
    url: URL_BASE,
    image: URL_BASE + 'img/dober-star.jpg',
    logo: URL_BASE + 'favicon.png',
    servesCuisine: ['Донер', 'Шаурма', 'Бургеры', 'Фастфуд'],
    priceRange: '₸',
    telephone: b.phone,
    address: { '@type': 'PostalAddress', streetAddress: b.address + (b.addressNote ? ', ' + b.addressNote : ''), addressLocality: b.city, addressRegion: 'Актюбинская область', addressCountry: 'KZ' },
    geo: { '@type': 'GeoCoordinates', latitude: b.geo.lat, longitude: b.geo.lon },
    openingHours: hoursSpec(b),
    hasMenu: { '@id': MENU_ID },
    acceptsReservations: false,
    sameAs: ['https://www.instagram.com/' + CFG.contacts.instagram + '/', CFG.contacts.facebook, b.twoGis]
  };
  if (r.value) node.aggregateRating = { '@type': 'AggregateRating', ratingValue: r.value, ratingCount: r.count, bestRating: 5 };
  return node;
});
graph.push({
  '@type': 'Menu',
  '@id': MENU_ID,
  name: 'Меню Dober Doner',
  inLanguage: 'ru',
  hasMenuSection: CATS.map(cat => ({
    '@type': 'MenuSection',
    name: cat.title,
    hasMenuItem: cat.items.map(item => {
      const mi = { '@type': 'MenuItem', name: item.name, offers: { '@type': 'Offer', price: String(minPrice(item)), priceCurrency: 'KZT' } };
      if (item.desc) mi.description = item.desc;
      if (item.image) mi.image = URL_BASE + item.image;
      if (hasChoice(item)) mi.offers = { '@type': 'AggregateOffer', lowPrice: String(minPrice(item)), priceCurrency: 'KZT' };
      return mi;
    })
  }))
});
const ldJSON = '<script type="application/ld+json">\n' + JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }, null, 2) + '\n  </script>';

// ───────────── запись в страницы ─────────────
function fill(html, name, content) {
  const re = new RegExp('(<!-- static:' + name + ' -->)[\\s\\S]*?(<!-- /static:' + name + ' -->)');
  if (!re.test(html)) throw new Error('нет метки static:' + name);
  return html.replace(re, (m, a, b) => a + content + b);
}
// простые элементы без вложенных тегов: <b data-x>…</b>
function text(html, attr, value) {
  const re = new RegExp('(<(\\w+)[^>]*\\bdata-' + attr + '\\b[^>]*>)[^<]*(</\\2>)', 'g');
  return html.replace(re, (m, open, tag, close) => open + esc(value) + close);
}
function head(html, page) {
  const canonical = URL_BASE + (page === 'index.html' ? '' : page);
  // canonical: одна страница без ?lang= и ?branch=
  html = html.replace(/\s*<link rel="canonical"[^>]*>/g, '');
  html = html.replace(/(<meta name="viewport"[^>]*>)/, '$1\n  <link rel="canonical" href="' + canonical + '">');
  // Превью ссылки в WhatsApp / Telegram: своя заставка 1200×630 (tools/build_og.sh), абсолютные адреса
  const og = page === 'menu.html' ? 'og-menu.jpg' : 'og-home.jpg';
  html = html.replace(/\s*<meta (property|name)="(og:image[^"]*|og:url|og:site_name|twitter:card)" content="[^"]*">/g, '');
  html = html.replace(/(<meta property="og:description" content="[^"]*">)/, '$1' +
    '\n  <meta property="og:url" content="' + canonical + '">' +
    '\n  <meta property="og:site_name" content="Dober Doner">' +
    '\n  <meta property="og:image" content="' + URL_BASE + 'img/' + og + '">' +
    '\n  <meta property="og:image:type" content="image/jpeg">' +
    '\n  <meta property="og:image:width" content="1200">' +
    '\n  <meta property="og:image:height" content="630">' +
    '\n  <meta property="og:image:alt" content="Dober Doner — донеры и бургеры, 4 точки в Актобе и Хромтау">' +
    '\n  <meta name="twitter:card" content="summary_large_image">');
  // видимость в поиске — по флагу site.indexable
  html = html.replace(/\s*<!-- (ДЕМО-РЕЖИМ|Сайт скрыт от поисковиков)[^>]*-->/g, '').replace(/\s*<meta name="robots"[^>]*>/g, '');
  if (!CFG.site.indexable) {
    html = html.replace(/(<link rel="canonical"[^>]*>)/, '$1\n  <!-- Сайт скрыт от поисковиков: в site/js/config.js site.indexable = false. Для запуска поставить true. -->\n  <meta name="robots" content="noindex, nofollow">');
  }
  return html;
}

function build(page, fn) {
  const file = path.join(SITE, page);
  let html = fs.readFileSync(file, 'utf8');
  html = head(html, page);
  html = fn(html);
  fs.writeFileSync(file, html);
  console.log('готово:', 'site/' + page);
}

const branchFacts = html => {
  html = text(html, 'branch-name', MAIN.name);
  html = text(html, 'branch-address', MAIN.address);
  html = text(html, 'branch-address-full', fullAddress(MAIN));
  html = text(html, 'branch-landmark', MAIN.landmark || '');
  html = text(html, 'branch-hours', MAIN.hours.label);
  html = text(html, 'branch-lastorder', MAIN.hours.lastOrder ? 'заказы принимаем до ' + MAIN.hours.lastOrder : 'без выходных');
  html = text(html, 'branch-delivery', deliveryLine(MAIN));
  html = text(html, 'phone-text', MAIN.phoneDisplay);
  html = text(html, 'wa-text', MAIN.phoneDisplay);
  html = html.replace(/(<a[^>]*\bdata-phone\b[^>]*href=")[^"]*"|(<a[^>]*href=")tel:[^"]*("[^>]*\bdata-phone\b)/g,
    (m, a, b, c) => (a ? a + 'tel:' + MAIN.phone + '"' : b + 'tel:' + MAIN.phone + c));
  html = html.replace(/(<a[^>]*href=")https:\/\/wa\.me\/[^"]*("[^>]*\bdata-wa-chat\b)/g, '$1https://wa.me/' + MAIN.whatsapp + '$2');
  return html;
};

build('index.html', html => {
  html = fill(html, 'highlights', highlightsHTML);
  html = fill(html, 'teaser', teaserHTML);
  html = fill(html, 'branches', branchesHTML);
  html = fill(html, 'rating', ratingHTML);
  html = fill(html, 'reviews', reviewsHTML);
  html = fill(html, 'gallery', galleryHTML);
  html = fill(html, 'promo', promoHTML);
  html = html.replace(/(<section class="section section--deal" data-promo)( hidden)?>/, promoItem ? '$1>' : '$1 hidden>');
  if (S) {
    html = text(html, 'rating', S.rating.toFixed(1));
    html = text(html, 'ratings-count', String(S.ratings_count));
  }
  const dobers = CATS.find(c => c.id === 'dobers') || CATS[0];
  html = text(html, 'min-price', money(Math.min.apply(null, dobers.items.map(minPrice))));
  html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, ldJSON);
  return branchFacts(html);
});

build('menu.html', html => {
  html = fill(html, 'cats', catsHTML);
  html = fill(html, 'menu', menuHTML);
  html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, ldJSON);
  return branchFacts(html);
});

build('privacy.html', html => html);

// ───────────── robots.txt и sitemap.xml ─────────────
const today = new Date().toISOString().slice(0, 10);
fs.writeFileSync(path.join(SITE, 'robots.txt'), 'User-agent: *\nAllow: /\n\nSitemap: ' + URL_BASE + 'sitemap.xml\n');
fs.writeFileSync(path.join(SITE, 'sitemap.xml'),
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  [['', '1.0'], ['menu.html', '0.9'], ['privacy.html', '0.2']].map(([p, prio]) =>
    '  <url><loc>' + URL_BASE + p + '</loc><lastmod>' + today + '</lastmod><priority>' + prio + '</priority></url>').join('\n') +
  '\n</urlset>\n');
console.log('готово: site/robots.txt, site/sitemap.xml · в поиске:', CFG.site.indexable ? 'ОТКРЫТ' : 'скрыт (site.indexable = false)');
