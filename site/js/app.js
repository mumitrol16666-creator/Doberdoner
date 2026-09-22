/* Dober Doner — выбор точки, меню, корзина и отправка заказа в WhatsApp. Настройки — в config.js */
(function () {
  'use strict';

  const { t, language, localize, pageUrl } = window.DOBER_I18N;
  window.DOBER_I18N.init();
  const CFG = localize(window.DOBER);
  const REV = window.DOBER_REVIEWS || { summary: null, items: [] };

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const icon = id => '<svg class="ic" aria-hidden="true"><use href="#i-' + id + '"/></svg>';

  // el('div', {class: 'x', text: '…'}, [дети]) — text всегда безопасен, html только для своей разметки
  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (v == null || v === false) return;
      if (k === 'text') node.textContent = t(v);
      else if (k === 'html') node.innerHTML = v;
      else if (k === 'class') node.className = v;
      else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v === true ? '' : ['aria-label', 'alt', 'title'].includes(k) ? t(v) : v);
    });
    (children || []).forEach(c => c && node.appendChild(c));
    return node;
  }

  // Фото: сайт запрашивает .webp (вдвое легче), старым браузерам подставляем .jpg
  const webp = src => src.replace(/\.(jpg|png)$/, '.webp');
  function photo(attrs) {
    const original = attrs.src;
    return el('img', Object.assign({}, attrs, {
      src: webp(original),
      onerror: e => { e.target.onerror = null; e.target.src = original; }
    }));
  }

  const group3 = (n, sep) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  const money = n => group3(n, ' ') + ' ' + CFG.currency;
  const plural = (n, forms) => {
    const a = Math.abs(n) % 100, b = a % 10;
    return t(forms[a > 10 && a < 20 ? 2 : b === 1 ? 0 : b > 1 && b < 5 ? 1 : 2]);
  };

  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
    },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* приватный режим */ } }
  };

  // ─────────────────────────── меню: индекс блюд ───────────────────────────
  const CATS = CFG.menu.filter(c => !c.hidden).map(c => Object.assign({}, c, { items: c.items.filter(i => !i.hidden) }));
  const ITEMS = {}, CAT_OF = {};
  CATS.forEach(c => c.items.forEach(i => { ITEMS[i.id] = i; CAT_OF[i.id] = c.id; }));
  const groupsOf = item => (item && item.groups) || [];
  const extrasOf = item => (item && item.extras) || [];
  const hasChoice = item => groupsOf(item).length > 0 || extrasOf(item).length > 0;
  // группы, где вариант — это сам объём порции: в карточке показываем полную цену, а не надбавку
  const BASE_GROUPS = ['size', 'portion', 'volume', 'patty'];

  // Что выбрано в карточке по умолчанию: option.def, переопределяется item.defaults
  function defaultSel(item) {
    const sel = {};
    groupsOf(item).forEach(g => {
      const custom = (item.defaults || {})[g.id];
      const option = g.options.find(o => o.id === custom) || g.options.find(o => o.def) || g.options[0];
      sel[g.id] = option.id;
    });
    return sel;
  }

  // ───────────────────────────── филиалы ─────────────────────────────
  const BRANCHES = CFG.branches.filter(b => !b.hidden);
  // ?branch=eset-batyra в ссылке (QR на столе в кафе) сразу выбирает эту точку и запоминает её
  const branchFromUrl = new URLSearchParams(location.search).get('branch');
  let branch = BRANCHES.find(b => b.id === branchFromUrl) ||
    BRANCHES.find(b => b.id === store.get('dober.branch.v1')) || BRANCHES[0];
  if (branch.id === branchFromUrl) store.set('dober.branch.v1', branch.id);
  const branchOf = id => BRANCHES.find(b => b.id === id) || BRANCHES[0];
  let forcedPickup = false;      // самовывоз включён сайтом, а не гостем

  function cityNow() {
    const d = new Date();
    return new Date(d.getTime() + (d.getTimezoneOffset() + (CFG.timezoneOffsetMin || 300)) * 60000);
  }
  // close: 26 — работает до 02:00 следующего дня
  function isOpen(b) {
    const n = cityNow(), h = n.getHours() + n.getMinutes() / 60;
    const { open, close } = b.hours;
    return close > 24 ? (h >= open || h < close - 24) : (h >= open && h < close);
  }
  // 24 — «24:00», 26 — «02:00» (точка работает после полуночи)
  const hh = h => (h === 24 ? '24' : String(Math.round(h) % 24).padStart(2, '0')) + ':00';
  const closeText = b => (b.hours.lastOrder ? b.hours.lastOrder : hh(b.hours.close));

  function statusLine(b) {
    return isOpen(b)
      ? t('Открыто · заказы до {time}', { time: closeText(b) })
      : t('Закрыто · откроется в {time}', { time: hh(b.hours.open) });
  }
  function deliveryLine(b) {
    if (!b.delivery) return t('Только навынос');
    if (b.delivery.fee == null) return t('Доставка и навынос');
    return b.delivery.freeFrom
      ? t('Доставка {fee}, от {from} — бесплатно', { fee: money(b.delivery.fee), from: money(b.delivery.freeFrom) })
      : t('Доставка {fee}', { fee: money(b.delivery.fee) });
  }
  const fullAddress = b => b.address + (b.addressNote ? ', ' + b.addressNote : '') + ', ' + b.city;
  const waLink = (b, text) => 'https://wa.me/' + b.whatsapp + (text ? '?text=' + encodeURIComponent(text) : '');
  const routeLink = b => 'https://2gis.kz/' + (b.city === 'Хромтау' ? 'aktobe' : 'aktobe') +
    '/directions/points/%7C' + b.geo.lon + '%2C' + b.geo.lat;

  // короткая пульсация плашки точки: при входе на страницу заказа и при смене точки
  function pulseBranchbar() {
    $$('[data-branchbar], [data-orderbranch]').forEach(bar => {
      bar.classList.remove('is-pulse');
      void bar.offsetWidth;
      bar.classList.add('is-pulse');
    });
  }

  function setBranch(id, opts) {
    const next = branchOf(id);
    const changed = next.id !== branch.id;
    branch = next;
    store.set('dober.branch.v1', branch.id);
    applyBranch();
    if (form) {
      // точка без доставки: переключаем на самовывоз, но помним, чтобы вернуть доставку на следующей точке
      if (!branch.delivery && form.elements.mode.value === 'delivery') {
        forcedPickup = true;
        form.elements.mode.value = 'pickup';
      } else if (branch.delivery && forcedPickup) {
        forcedPickup = false;
        form.elements.mode.value = 'delivery';
      }
      syncForm();
      renderCart(false);
    }
    if (changed) pulseBranchbar();
    if (changed && !(opts && opts.silent)) toast(t('Точка заказа: ') + branch.name);
  }

  // Подставляет данные выбранной точки во всю разметку
  function applyBranch() {
    $$('[data-branch-name]').forEach(n => { n.textContent = branch.name; });
    $$('[data-branch-address]').forEach(n => { n.textContent = branch.address; });
    $$('[data-branch-address-full]').forEach(n => { n.textContent = fullAddress(branch); });
    $$('[data-branch-landmark]').forEach(n => { n.textContent = branch.landmark || ''; n.hidden = !branch.landmark; });
    $$('[data-branch-hours]').forEach(n => { n.textContent = branch.hours.label; });
    $$('[data-branch-lastorder]').forEach(n => {
      n.textContent = branch.hours.lastOrder ? t('заказы принимаем до {time}', { time: branch.hours.lastOrder }) : t('без выходных');
    });
    $$('[data-branch-status]').forEach(n => {
      n.textContent = statusLine(branch);
      n.classList.toggle('is-open', isOpen(branch));
      n.classList.toggle('is-closed', !isOpen(branch));
    });
    $$('[data-branch-delivery]').forEach(n => { n.textContent = deliveryLine(branch); });
    $$('[data-phone]').forEach(a => { a.href = 'tel:' + branch.phone; });
    $$('[data-phone-text]').forEach(n => { n.textContent = branch.phoneDisplay; });
    $$('[data-wa-chat]').forEach(a => { a.href = waLink(branch, ''); });
    $$('[data-wa-text]').forEach(n => { n.textContent = branch.phoneDisplay; });
    $$('[data-2gis]').forEach(a => { a.href = branch.twoGis; });
    $$('[data-status]').forEach(node => {
      node.hidden = false;
      node.textContent = isOpen(branch) ? t('Открыто до {time}', { time: hh(branch.hours.close) })
        : t('Закрыто · откроемся в {time}', { time: hh(branch.hours.open) });
      node.classList.toggle('is-open', isOpen(branch));
      node.classList.toggle('is-closed', !isOpen(branch));
    });
    const map = $('[data-map]');
    if (map) {
      const { lat, lon } = branch.geo;
      const bbox = [lon - 0.0028, lat - 0.0016, lon + 0.0028, lat + 0.0016].map(v => v.toFixed(6)).join(',');
      const src = 'https://www.openstreetmap.org/export/embed.html?bbox=' + encodeURIComponent(bbox) +
        '&layer=mapnik&marker=' + encodeURIComponent(lat + ',' + lon);
      if (map.getAttribute('src') !== src) map.src = src;
    }
    const closedNote = $('[data-closed-note]');
    if (closedNote) {
      closedNote.hidden = isOpen(branch);
      closedNote.textContent = t('Точка «{name}» сейчас закрыта — работает {hours}. Заказ можно отправить уже сейчас, ответим после открытия.',
        { name: branch.name, hours: branch.hours.label.toLowerCase() });
    }
    renderBranchList();
    renderBranchCards();
  }

  // ─────────────────────────── корзина ───────────────────────────
  // строка: { id, sel: {groupId: optionId}, extras: [id], qty } — названия и цены берём из config.js
  let cart = store.get('dober.cart.v1', []);

  function lineKey(line) {
    const item = ITEMS[line.id];
    if (!hasChoice(item)) return line.id;
    return [line.id, groupsOf(item).map(g => (line.sel || {})[g.id] || '').join('/'),
      (line.extras || []).slice().sort().join('+')].join('|');
  }

  function resolve(line) {
    const item = ITEMS[line.id];
    if (!item) return null;
    const qty = Math.max(1, Math.min(99, parseInt(line.qty, 10) || 1));
    const picks = groupsOf(item).map(g => g.options.find(o => o.id === (line.sel || {})[g.id]));
    if (picks.some(o => !o)) return null;
    const extras = (line.extras || []).map(id => extrasOf(item).find(e => e.id === id)).filter(Boolean);
    const delta = picks.reduce((s, o) => s + (o.price || 0), 0) + extras.reduce((s, e) => s + (e.price || 0), 0);
    const unit = (item.price || 0) + delta;
    const full = item.oldPrice ? item.oldPrice + delta : unit;
    const main = picks.map(o => o.line || o.name).filter(Boolean);
    return {
      key: lineKey(line), id: item.id, name: item.name,
      title: item.name + (main.length ? ' · ' + main.join(', ') : ''),
      opts: extras.map(e => '+ ' + (e.line || e.name)).join(', '),
      unit, full, deal: full > unit, qty, sum: unit * qty
    };
  }

  cart = cart.filter(resolve);
  const lines = () => cart.map(resolve).filter(Boolean);
  const cartCount = () => lines().reduce((s, l) => s + l.qty, 0);
  const cartTotal = () => lines().reduce((s, l) => s + l.sum, 0);
  const cartSavings = () => lines().reduce((s, l) => s + (l.full - l.unit) * l.qty, 0);
  const qtyOf = id => cart.filter(l => l.id === id).reduce((s, l) => s + l.qty, 0);
  const specOf = s => ({ id: s.id, sel: Object.assign({}, s.sel), extras: (s.extras || []).slice() });
  // дополняет выбор значениями по умолчанию: в предложениях к покупке варианты не перечисляют
  const fullSpec = s => ({ id: s.id, sel: Object.assign(defaultSel(ITEMS[s.id]), s.sel), extras: (s.extras || []).slice() });

  function addToCart(line, qty, opts) {
    const spec = fullSpec(line), key = lineKey(spec);
    const found = cart.find(l => lineKey(l) === key);
    if (found) found.qty = Math.min(99, found.qty + qty);
    else cart.push(Object.assign(spec, { qty }));
    commit(true);
    if (!(opts && opts.silent)) afterAdd(spec);
  }
  function setQty(key, qty) {
    const found = cart.find(l => lineKey(l) === key);
    if (!found) return;
    if (qty <= 0) cart = cart.filter(l => l !== found);
    else found.qty = Math.min(99, qty);
    commit(false);
  }
  function decLast(id) {
    for (let i = cart.length - 1; i >= 0; i--) {
      if (cart[i].id !== id) continue;
      cart[i].qty -= 1;
      if (cart[i].qty <= 0) cart.splice(i, 1);
      break;
    }
    commit(false);
  }
  function commit(bump) {
    store.set('dober.cart.v1', cart);
    view = 'form';
    renderCart(bump);
  }

  // ─────────────────── предложения к покупке ───────────────────
  function covered(id) {
    const cat = CAT_OF[id], single = (CFG.upsellExclusive || []).includes(cat);
    return cart.some(l => l.id === id || (single && CAT_OF[l.id] === cat));
  }
  function suggestion(s) {
    const item = ITEMS[s.id], r = item && resolve(Object.assign({ qty: 1 }, fullSpec(s)));
    return r ? { spec: fullSpec(s), label: s.label || r.name, price: r.unit, image: item.image, emoji: item.emoji } : null;
  }
  const available = list => (list || []).filter(s => ITEMS[s.id] && !covered(s.id)).map(suggestion).filter(Boolean);

  const dismissed = new Set();
  let trayTimer, trayDismissKey = null;

  function openTray(lead, title, chips, dismissKey) {
    const tray = $('[data-tray]');
    if (!tray) return;
    $('[data-tray-lead]').textContent = lead || '';
    $('[data-tray-lead]').hidden = !lead;
    $('[data-tray-title]').textContent = t(title);
    $('[data-tray-chips]').replaceChildren.apply($('[data-tray-chips]'), chips);
    trayDismissKey = dismissKey;
    tray.hidden = false;
    tray.classList.remove('is-in'); void tray.offsetWidth; tray.classList.add('is-in');
    $('[data-toast]').classList.remove('is-on');
    clearTimeout(trayTimer);
    trayTimer = setTimeout(hideTray, 16000);
  }
  function hideTray() {
    clearTimeout(trayTimer);
    if ($('[data-tray]')) $('[data-tray]').hidden = true;
  }

  function ruleTray(itemId, lead) {
    const rule = (CFG.upsell || []).find(u => u.after.includes(itemId) && !dismissed.has(u.id) && available(u.suggest).length);
    if (!rule) return false;
    openTray(lead, rule.title, available(rule.suggest).map(s => el('button', {
      type: 'button', class: 'chip', 'aria-label': t('Добавить: ') + s.label + ', ' + money(s.price),
      onclick: () => {
        addToCart(s.spec, 1, { silent: true });
        if (!ruleTray(itemId, '✓ ' + t('В корзине: ') + s.label) && !ruleTray(s.spec.id, '✓ ' + t('В корзине: ') + s.label)) {
          hideTray();
          toast(t('В корзине: ') + s.label);
        }
      }
    }, [
      s.image ? photo({ class: 'chip__img', src: s.image.replace('.jpg', '-sm.jpg'), alt: '', loading: 'lazy' })
        : el('span', { class: 'chip__e', text: s.emoji || '🍽️', 'aria-hidden': 'true' }),
      el('span', { text: s.label }),
      el('b', { text: '+' + money(s.price) })
    ])), rule.id);
    return true;
  }

  function afterAdd(spec) {
    const r = resolve(Object.assign({ qty: 1 }, spec));
    if (!r) return;
    const lead = '✓ ' + t('В корзине: ') + r.name;
    if (ruleTray(r.id, lead)) return;
    hideTray();
    toast(t('В корзине: ') + r.name);
  }

  // ─────────────────────────── карточки меню ───────────────────────────
  function stepper(qty, onChange, label) {
    return el('div', { class: 'stepper', role: 'group', 'aria-label': label || 'Количество' }, [
      el('button', { type: 'button', 'aria-label': 'Меньше', html: icon('minus'), onclick: () => onChange(qty - 1) }),
      el('output', { text: String(qty), 'aria-live': 'polite' }),
      el('button', { type: 'button', 'aria-label': 'Больше', html: icon('plus'), onclick: () => onChange(qty + 1) })
    ]);
  }

  const actionSlots = {};       // id блюда → контейнер с кнопкой «Добавить» / степпером

  function itemBadges(item) {
    const list = [];
    if (item.badge) list.push(el('span', { class: 'badge', text: item.badge }));
    if (item.spicy) list.push(el('span', { class: 'badge badge--hot', text: '🌶 Острый' }));
    return list;
  }

  function priceBlock(item) {
    const base = resolve({ id: item.id, qty: 1, sel: defaultSel(item), extras: [] });
    const box = el('div', { class: 'card__price' });
    if (base.deal) box.appendChild(el('s', { text: money(base.full) }));
    box.appendChild(el('b', { text: hasChoice(item) ? t('от {price}', { price: money(base.unit) }) : money(base.unit) }));
    return box;
  }

  function renderCard(item) {
    const slot = el('div', { class: 'card__act' });
    actionSlots[item.id] = slot;
    return el('article', { class: 'card', id: 'item-' + item.id }, [
      el('button', {
        type: 'button', class: 'card__media', 'aria-label': t('Открыть: ') + item.name,
        onclick: () => openItem(item)
      }, [
        item.image ? photo({ src: item.image.replace('.jpg', '-sm.jpg'), alt: item.name, loading: 'lazy', width: 360, height: 360 }) : null,
        itemBadges(item).length ? el('div', { class: 'card__badges' }, itemBadges(item)) : null
      ]),
      el('div', { class: 'card__body' }, [
        el('h4', { class: 'card__name', text: item.name }),
        item.desc ? el('p', { class: 'card__desc', text: item.desc }) : null,
        el('div', { class: 'card__foot' }, [priceBlock(item), slot])
      ])
    ]);
  }

  function renderActions() {
    Object.keys(actionSlots).forEach(id => {
      const item = ITEMS[id], qty = qtyOf(id);
      const slot = actionSlots[id];
      if (hasChoice(item)) {
        slot.replaceChildren(el('button', {
          type: 'button', class: 'btn btn--brand add', text: qty ? t('Ещё · ') + qty : 'Выбрать',
          'aria-label': t('Открыть: ') + item.name, onclick: () => openItem(item)
        }));
        return;
      }
      slot.replaceChildren(qty > 0
        ? stepper(qty, q => (q > qty ? addToCart({ id }, 1) : decLast(id)), item.name + t(': количество'))
        : el('button', {
          type: 'button', class: 'btn btn--brand add', html: icon('plus') + t('Добавить'),
          'aria-label': t('Добавить: ') + item.name, onclick: () => addToCart({ id }, 1)
        }));
    });
  }

  function renderMenu() {
    const menu = $('[data-menu]'), cats = $('[data-cats]');
    // в HTML лежит статичная копия меню для поисковиков (tools/build_static.js) — заменяем её живой
    menu.replaceChildren();
    cats.replaceChildren();
    CATS.forEach(cat => {
      cats.appendChild(el('a', { href: '#cat-' + cat.id, text: cat.title, 'data-cat': cat.id }));
      menu.appendChild(el('section', { class: 'cat', id: 'cat-' + cat.id, 'aria-labelledby': 'cat-h-' + cat.id }, [
        el('div', { class: 'cat__head' }, [
          el('h3', { text: cat.title, id: 'cat-h-' + cat.id }),
          cat.note ? el('span', { class: 'cat__note', text: cat.note }) : null
        ]),
        el('div', { class: 'cards' }, cat.items.map(renderCard))
      ]));
    });
    if (CFG.menuHint) {
      $('[data-menu-hint]').textContent = CFG.menuHint;
      $('[data-menu-hint]').hidden = false;
    }

    if ('IntersectionObserver' in window) {
      const links = $$('[data-cat]');
      const io = new IntersectionObserver(entries => {
        entries.forEach(en => {
          if (!en.isIntersecting) return;
          links.forEach(a => {
            const on = '#' + en.target.id === a.getAttribute('href');
            a.classList.toggle('is-active', on);
            if (on && a.parentNode.scrollWidth > a.parentNode.clientWidth) {
              a.parentNode.scrollTo({ left: a.offsetLeft - 16, behavior: 'smooth' });
            }
          });
        });
      }, { rootMargin: '-30% 0px -60% 0px' });
      $$('.cat').forEach(s => io.observe(s));
    }
  }

  // ─────────────────────── карточка блюда (модалка) ───────────────────────
  let itemState = null, itemOpener = null;

  function openItem(item) {
    const sheet = $('[data-item-sheet]');
    if (!sheet) { location.href = pageUrl('menu.html#item-' + item.id); return; }
    itemOpener = document.activeElement;
    itemState = { id: item.id, sel: defaultSel(item), extras: new Set(), qty: 1 };
    $('[data-item-title]').textContent = item.name;
    const body = $('[data-item-body]');
    body.scrollTop = 0;

    // у групп «размер / порция / объём» показываем полную цену варианта, у остальных — надбавку
    const groups = groupsOf(item).map(g => el('div', { class: 'opt' }, [
      el('div', { class: 'opt__t', text: g.title }),
      el('div', { class: 'opts' }, g.options.map(o => el('label', { class: 'opts__o' }, [
        el('input', {
          type: 'radio', name: 'g-' + g.id, value: o.id, checked: itemState.sel[g.id] === o.id,
          onchange: () => { itemState.sel[g.id] = o.id; refreshItem(); }
        }),
        el('span', {}, [
          el('i', { text: o.name }),
          BASE_GROUPS.includes(g.id) ? el('b', { text: money((item.price || 0) + (o.price || 0)) })
            : o.price ? el('b', { text: '+' + money(o.price) }) : null
        ])
      ])))
    ]));

    const extras = extrasOf(item).length ? el('div', { class: 'opt' }, [
      el('div', { class: 'opt__t', text: 'Добавить по вкусу' }),
      el('div', { class: 'addons' }, extrasOf(item).map(e => el('label', { class: 'addon' }, [
        el('input', {
          type: 'checkbox', value: e.id,
          onchange: ev => { ev.target.checked ? itemState.extras.add(e.id) : itemState.extras.delete(e.id); refreshItem(); }
        }),
        el('span', { html: '<svg class="ic ic--off" aria-hidden="true"><use href="#i-plus"/></svg><svg class="ic ic--on" aria-hidden="true"><use href="#i-check"/></svg>' }, [
          document.createTextNode(e.name + ' '),
          el('i', { text: e.price ? '+' + money(e.price) : t('бесплатно') })
        ])
      ])))
    ]) : null;

    body.replaceChildren.apply(body, [
      item.image ? el('div', { class: 'itemhero' }, [
        photo({ src: item.image, alt: item.name, width: 800, height: 800 }),
        itemBadges(item).length ? el('div', { class: 'card__badges' }, itemBadges(item)) : null
      ]) : null,
      item.desc ? el('p', { class: 'itemdesc', text: item.desc }) : null
    ].concat(groups, [extras]));

    sheet.hidden = false;
    document.body.classList.add('is-locked');
    $('#page').inert = true;
    hideTray();
    $('.sheet__panel', sheet).focus();
    refreshItem();
  }

  function refreshItem() {
    if (!itemState) return;
    const item = ITEMS[itemState.id];
    const spec = { id: item.id, sel: itemState.sel, extras: Array.from(itemState.extras) };
    const r = resolve(Object.assign({ qty: 1 }, spec));
    $('[data-item-add]').textContent = t('В корзину · ') + money(r.unit * itemState.qty);
    $('[data-item-qty]').replaceChildren(
      el('span', { text: 'Количество' }),
      stepper(itemState.qty, q => { itemState.qty = Math.max(1, Math.min(20, q)); refreshItem(); }, 'Сколько порций')
    );
  }

  function closeItem() {
    const sheet = $('[data-item-sheet]');
    if (!sheet || sheet.hidden) return;
    sheet.hidden = true;
    itemState = null;
    if ($('[data-sheet]').hidden) {
      document.body.classList.remove('is-locked');
      $('#page').inert = false;
    }
    if (itemOpener && itemOpener.focus) itemOpener.focus();
  }

  function initItemSheet() {
    $$('[data-close-item]').forEach(b => b.addEventListener('click', closeItem));
    $('[data-item-add]').addEventListener('click', () => {
      const spec = { id: itemState.id, sel: itemState.sel, extras: Array.from(itemState.extras) };
      const qty = itemState.qty;
      closeItem();
      addToCart(spec, qty);
    });
  }

  // ─────────────────────── выбор точки (модалка) ───────────────────────
  function branchRow(b, onPick) {
    const open = isOpen(b);
    return el('button', {
      type: 'button', class: 'brow' + (b.id === branch.id ? ' is-on' : ''), onclick: () => onPick(b)
    }, [
      el('span', { class: 'brow__check', html: b.id === branch.id ? icon('check') : '' }),
      el('span', { class: 'brow__body' }, [
        el('span', { class: 'brow__name' }, [
          document.createTextNode(b.name),
          b.rating ? el('span', { class: 'brow__rating', html: icon('star') }, [document.createTextNode(b.rating.value.toFixed(1))]) : null
        ]),
        el('span', { class: 'brow__addr', text: b.address + ', ' + b.city }),
        el('span', { class: 'brow__meta' }, [
          el('span', { class: open ? 'is-open' : 'is-closed', text: open ? t('Открыто до {time}', { time: hh(b.hours.close) }) : t('Закрыто до {time}', { time: hh(b.hours.open) }) }),
          el('span', { text: deliveryLine(b) }),
          b.distance ? el('span', { text: t('{km} км от вас', { km: b.distance.toFixed(1) }) }) : null
        ])
      ])
    ]);
  }

  function renderBranchList() {
    const box = $('[data-branch-list]');
    if (!box) return;
    box.replaceChildren.apply(box, BRANCHES.map(b => branchRow(b, picked => {
      setBranch(picked.id);
      closeBranches();
    })));
  }

  function renderBranchCards() {
    const box = $('[data-branch-cards]');
    if (!box) return;
    box.replaceChildren.apply(box, BRANCHES.map(b => {
      // рейтинг: из свежей выгрузки отзывов, иначе из config.js
      const fresh = (REV.summary && REV.summary.branches[b.id]) || {};
      const rating = { rating: fresh.rating || (b.rating || {}).value, ratings_count: fresh.ratings_count || (b.rating || {}).count };
      const open = isOpen(b);
      return el('article', { class: 'bcard' + (b.id === branch.id ? ' is-on' : ''), id: 'branch-' + b.id }, [
        el('div', { class: 'bcard__head' }, [
          el('h3', { text: b.name }),
          rating.rating ? el('span', { class: 'bcard__rating', html: icon('star') }, [
            el('b', { text: rating.rating.toFixed(1) }),
            el('span', { text: (rating.ratings_count || 0) + ' ' + plural(rating.ratings_count || 0, ['оценка', 'оценки', 'оценок']) })
          ]) : null
        ]),
        el('div', { class: 'bcard__row' }, [el('span', { html: icon('pin') }), el('span', { text: fullAddress(b) + (b.landmark ? ' · ' + b.landmark : '') })]),
        el('div', { class: 'bcard__row' }, [el('span', { html: icon('clock') }), el('span', {}, [
          el('b', { class: open ? 'is-open' : 'is-closed', text: open ? 'Открыто' : 'Закрыто' }),
          document.createTextNode(' · ' + b.hours.label + (b.hours.lastOrder ? t(' · заказы до {time}', { time: b.hours.lastOrder }) : ''))
        ])]),
        el('div', { class: 'bcard__row' }, [el('span', { html: icon('bag') }), el('span', { text: deliveryLine(b) })]),
        (b.features || []).length ? el('div', { class: 'bcard__tags' }, b.features.map(f => el('span', { text: f }))) : null,
        el('div', { class: 'bcard__btns' }, [
          el('button', {
            type: 'button', class: 'btn btn--brand', text: b.id === branch.id ? 'Заказать отсюда' : 'Выбрать эту точку',
            onclick: () => {
              setBranch(b.id, { silent: true });
              location.href = pageUrl('menu.html');
            }
          }),
          el('a', { class: 'btn btn--light', href: 'tel:' + b.phone, html: icon('phone') }, [document.createTextNode(b.phoneDisplay)]),
          el('a', { class: 'btn btn--light', href: waLink(b, ''), target: '_blank', rel: 'noopener', html: icon('whatsapp') }, [document.createTextNode(t('WhatsApp'))]),
          el('a', { class: 'btn btn--light', href: b.twoGis, target: '_blank', rel: 'noopener', text: '2ГИС' }),
          el('a', { class: 'btn btn--light', href: routeLink(b), target: '_blank', rel: 'noopener', text: 'Маршрут' })
        ])
      ]);
    }));
  }

  function openBranches() {
    const sheet = $('[data-branch-sheet]');
    if (!sheet) return;
    renderBranchList();
    sheet.hidden = false;
    document.body.classList.add('is-locked');
    $('#page').inert = true;
    $('.sheet__panel', sheet).focus();
  }
  function closeBranches() {
    const sheet = $('[data-branch-sheet]');
    if (!sheet || sheet.hidden) return;
    sheet.hidden = true;
    if (!$('[data-sheet]') || $('[data-sheet]').hidden) {
      document.body.classList.remove('is-locked');
      $('#page').inert = false;
    }
  }

  function locateNearest() {
    if (!navigator.geolocation) return toast('Браузер не умеет определять геопозицию');
    toast('Определяем, где вы…');
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude, longitude } = pos.coords;
      BRANCHES.forEach(b => {
        const dx = (b.geo.lon - longitude) * 71.5, dy = (b.geo.lat - latitude) * 111.3;   // км на широте Актобе
        b.distance = Math.sqrt(dx * dx + dy * dy);
      });
      const nearest = BRANCHES.slice().sort((a, b) => a.distance - b.distance)[0];
      setBranch(nearest.id, { silent: true });
      renderBranchList();
      toast(t('Ближайшая точка: {name} · {km} км', { name: nearest.name, km: nearest.distance.toFixed(1) }));
    }, () => toast('Не получилось определить геопозицию — выберите точку из списка'), { timeout: 8000 });
  }

  function initBranchSheet() {
    $$('[data-open-branches]').forEach(b => b.addEventListener('click', openBranches));
    $$('[data-close-branches]').forEach(b => b.addEventListener('click', closeBranches));
    const locate = $('[data-locate]');
    if (locate) locate.addEventListener('click', locateNearest);
  }

  // ─────────────────── оформление и сообщение в WhatsApp ───────────────────
  const form = $('[data-checkout]');
  const saved = store.get('dober.customer.v1', {});
  let view = 'form';
  let lastFocus = null;

  function formData() {
    const f = form.elements;
    return {
      mode: f.mode.value, address: f.address.value.trim(), name: f.name.value.trim(), phone: f.phone.value.trim(),
      when: f.when.value, time: f.time.value, payment: f.payment ? f.payment.value : '', comment: f.comment.value.trim()
    };
  }

  function deliveryFee(total) {
    if (!branch.delivery || branch.delivery.fee == null) return null;
    return branch.delivery.freeFrom && total >= branch.delivery.freeFrom ? 0 : branch.delivery.fee;
  }

  function buildMessage() {
    const d = formData(), delivery = d.mode === 'delivery', out = [];
    out.push('*' + t('Новый заказ с сайта — ') + CFG.brand.name + '*');
    out.push(t('Точка: ') + branch.name + ' (' + branch.address + ', ' + branch.city + ')', '');
    lines().forEach((l, i) => {
      out.push((i + 1) + '. ' + l.title + (l.opts ? ' (' + l.opts + ')' : ''));
      out.push('   ' + l.qty + ' × ' + money(l.unit) + ' = ' + money(l.sum));
    });
    out.push('');
    out.push('*' + t('Итого: ') + money(cartTotal()) + '*');
    if (delivery) {
      const fee = deliveryFee(cartTotal());
      out.push(fee === 0 ? t('Доставка: бесплатно (заказ от {from})', { from: money(branch.delivery.freeFrom) })
        : fee ? t('Доставка: {fee}', { fee: money(fee) })
          : t('Доставку подтвердит оператор'));
    }
    out.push('');
    out.push(t('Получение: ') + t(delivery ? 'доставка' : 'самовывоз'));
    if (delivery) out.push(t('Адрес: ') + d.address);
    out.push(t('Когда: ') + (d.when === 'time' && d.time ? t('к {time}', { time: d.time }) : t('как можно скорее')));
    if (d.payment) out.push(t('Оплата: ') + t(d.payment));
    out.push(t('Имя: ') + d.name);
    if (d.phone) out.push(t('Телефон: ') + d.phone);
    if (d.comment) out.push(t('Комментарий: ') + d.comment);
    return out.join('\n');
  }

  function validate(show) {
    const d = formData(), errors = [];
    if (d.mode === 'delivery' && d.address.length < 4) errors.push('address');
    if (d.name.length < 2) errors.push('name');
    if (d.when === 'time' && !d.time) errors.push('time');
    if (show) {
      ['address', 'name', 'time'].forEach(name => {
        const bad = errors.includes(name);
        $('[data-err="' + name + '"]').hidden = !bad;
        form.elements[name].closest('.field').classList.toggle('is-err', bad);
        form.elements[name].setAttribute('aria-invalid', bad ? 'true' : 'false');
      });
    }
    return errors;
  }

  function syncForm() {
    const d = formData();
    const canDeliver = !!branch.delivery;
    form.elements.mode[0].disabled = !canDeliver;
    $('[data-nodelivery-note]').hidden = canDeliver;
    if (!canDeliver) {
      $('[data-nodelivery-note]').textContent = t('Точка «{name}» работает только навынос. Нужна доставка — выберите другую точку.', { name: branch.name });
    }
    const delivery = canDeliver && d.mode === 'delivery';
    $('[data-address-field]').hidden = !delivery;
    $('[data-pickup-note]').hidden = delivery;
    $('[data-time-field]').hidden = d.when !== 'time';
    $('[data-total-note]').textContent = delivery ? t(' без доставки') : '';
    $('[data-send]').href = waLink(branch, buildMessage());

    const bar = $('[data-free-delivery]');
    const total = cartTotal();
    const gap = branch.delivery && branch.delivery.freeFrom ? branch.delivery.freeFrom - total : 0;
    bar.hidden = !delivery || !branch.delivery || branch.delivery.fee == null;
    if (!bar.hidden) {
      bar.textContent = gap > 0
        ? t('Доставка {fee}. Добавьте ещё {gap} — и она будет бесплатной.', { fee: money(branch.delivery.fee), gap: money(gap) })
        : t('Доставка бесплатно — заказ от {from}.', { from: money(branch.delivery.freeFrom) });
      bar.classList.toggle('is-free', gap <= 0);
    }
    store.set('dober.customer.v1', { mode: d.mode, address: d.address, name: d.name, phone: d.phone, payment: d.payment });
  }

  function renderLines() {
    $('[data-lines]').replaceChildren.apply($('[data-lines]'), lines().map(l => el('li', { class: 'line' }, [
      el('div', {}, [
        el('div', { class: 'line__name', text: l.title }),
        l.opts ? el('div', { class: 'line__opts', text: l.opts }) : null,
        el('div', { class: 'line__unit' }, [
          l.deal ? el('s', { class: 'price-old', text: money(l.full) }) : null,
          document.createTextNode(money(l.unit) + t(' за шт.'))
        ])
      ]),
      el('div', { class: 'line__sum', text: money(l.sum) }),
      el('div', { class: 'line__ctrl' }, [
        stepper(l.qty, q => setQty(l.key, q), l.title + t(': количество')),
        el('button', { type: 'button', class: 'line__del', html: icon('trash') + t('Убрать'), 'aria-label': t('Убрать: ') + l.title, onclick: () => setQty(l.key, 0) })
      ])
    ])));
  }

  function renderCartSuggest() {
    const box = $('[data-cart-suggest]');
    const list = available(CFG.cartSuggest).slice(0, 4);
    box.hidden = !list.length;
    if (!list.length) return;
    box.replaceChildren(
      el('div', { class: 'cs__t', text: 'Добавить к заказу?' }),
      el('div', { class: 'cs__row' }, list.map(s => el('button', {
        type: 'button', class: 'cs__item', 'aria-label': t('Добавить: ') + s.label + ', ' + money(s.price),
        onclick: () => { addToCart(s.spec, 1, { silent: true }); toast(t('В корзине: ') + s.label); }
      }, [
        s.image ? photo({ class: 'cs__img', src: s.image.replace('.jpg', '-sm.jpg'), alt: '', loading: 'lazy' }) : null,
        el('span', { class: 'cs__n', text: s.label }),
        el('span', { class: 'cs__p', html: icon('plus') }, [document.createTextNode(money(s.price))])
      ])))
    );
  }

  function renderCart(bump) {
    const count = cartCount(), total = cartTotal();
    const badge = $('[data-cart-count]'), bar = $('[data-cartbar]');
    const home = bar.hasAttribute('data-cartbar-home');
    badge.hidden = count === 0;
    badge.textContent = count;
    bar.hidden = count === 0 && !home;
    document.body.classList.toggle('has-cart', count > 0 || home);
    $('[data-cartbar-count]').textContent = count ? count + ' ' + plural(count, ['позиция', 'позиции', 'позиций']) : t('Меню и заказ');
    $('[data-cartbar-total]').textContent = count ? money(total) : '';
    if (home) {
      $('[data-cartbar-go]').textContent = t(count ? 'Оформить →' : 'Выбрать →');
      bar.href = pageUrl(count ? 'menu.html#cart' : 'menu.html');
    }
    if (bump && count) { bar.classList.remove('is-bump'); void bar.offsetWidth; bar.classList.add('is-bump'); }
    if (!count) hideTray();
    renderActions();
    if (!form) return;

    const empty = count === 0;
    $('[data-empty]').hidden = !(empty && view === 'form');
    $('[data-done]').hidden = view !== 'done';
    form.hidden = empty || view !== 'form';
    $('[data-sheet-foot]').hidden = empty || view !== 'form';
    $('[data-total]').textContent = money(total);
    if (!form.hidden) { renderLines(); renderCartSuggest(); syncForm(); }
  }

  function openCart() {
    lastFocus = document.activeElement;
    view = 'form';
    hideTray();
    closeItem();
    $('[data-sheet]').hidden = false;
    document.body.classList.add('is-locked');
    $('#page').inert = true;
    applyBranch();
    renderCart(false);
    pulseBranchbar();
    $('[data-sheet] .sheet__panel').focus();
  }
  function closeCart() {
    endEditing();
    $('[data-sheet]').hidden = true;
    document.body.classList.remove('is-locked');
    $('#page').inert = false;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  // На мобильных клавиатура уменьшает visualViewport, но не всегда fixed-контейнер.
  function fitKeyboardViewport() {
    const sheet = $('[data-sheet]');
    const viewport = window.visualViewport;
    sheet.style.setProperty('--visible-height', (viewport ? viewport.height : window.innerHeight) + 'px');
    sheet.style.setProperty('--visible-top', (viewport ? viewport.offsetTop : 0) + 'px');
  }
  function endEditing() {
    if (!form) return;
    const active = document.activeElement;
    if (active && form.contains(active)) active.blur();
    $('[data-sheet]').classList.remove('is-editing');
    $('[data-dismiss-keyboard]').hidden = true;
  }
  function revealCheckoutField(field) {
    const scroll = $('[data-sheet-scroll]');
    const area = scroll.getBoundingClientRect();
    const bounds = field.getBoundingClientRect();
    if (bounds.bottom > area.bottom - 12) scroll.scrollTop += bounds.bottom - area.bottom + 12;
    else if (bounds.top < area.top + 12) scroll.scrollTop -= area.top + 12 - bounds.top;
  }
  function initKeyboard() {
    const sheet = $('[data-sheet]');
    const done = $('[data-dismiss-keyboard]');
    form.addEventListener('focusin', event => {
      if (!window.matchMedia('(max-width: 899px)').matches ||
          !event.target.matches('textarea, input:not([type="radio"]):not([type="checkbox"])')) return;
      sheet.classList.add('is-editing');
      done.hidden = false;
      fitKeyboardViewport();
      requestAnimationFrame(() => revealCheckoutField(event.target));
    });
    done.addEventListener('pointerdown', event => event.preventDefault());
    done.addEventListener('click', () => {
      endEditing();
      $('[data-sheet] .sheet__panel').focus({ preventScroll: true });
    });
    form.addEventListener('keydown', event => {
      if (event.key === 'Enter' && event.target.matches('input:not([type="radio"])')) {
        event.preventDefault();
        endEditing();
        $('[data-sheet] .sheet__panel').focus({ preventScroll: true });
      }
    });
    let frame;
    const resize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!sheet.classList.contains('is-editing')) return;
        fitKeyboardViewport();
        requestAnimationFrame(() => {
          const active = document.activeElement;
          if (sheet.classList.contains('is-editing') && form.contains(active)) revealCheckoutField(active);
        });
      });
    };
    window.addEventListener('resize', resize);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', resize);
      window.visualViewport.addEventListener('scroll', resize);
    }
  }

  function copyOrder() {
    const text = buildMessage();
    const ok = () => toast('Текст заказа скопирован');
    const fallback = () => {
      const ta = el('textarea', { style: 'position:fixed;opacity:0' });
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); ok(); } catch (e) { toast('Не получилось скопировать'); }
      ta.remove();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, fallback);
    else fallback();
  }

  function initCheckout() {
    $('[data-payments]').replaceChildren.apply($('[data-payments]'), CFG.payments.map((p, i) =>
      el('label', {}, [el('input', { type: 'radio', name: 'payment', value: p, checked: saved.payment ? saved.payment === p : i === 0 }), el('span', { text: p })])));
    if (saved.mode) form.elements.mode.value = saved.mode;
    ['address', 'name', 'phone'].forEach(k => { if (saved[k]) form.elements[k].value = saved[k]; });
    try {
      const draft = JSON.parse(sessionStorage.getItem('dober.languageDraft') || 'null');
      if (draft) Object.entries(draft).forEach(([key, value]) => {
        const field = form.elements.namedItem(key);
        if (field) field.value = value;
      });
      sessionStorage.removeItem('dober.languageDraft');
    } catch (e) { /* storage unavailable */ }

    form.addEventListener('input', syncForm);
    form.addEventListener('change', syncForm);
    form.addEventListener('submit', e => e.preventDefault());
    ['address', 'name', 'time'].forEach(name => form.elements[name].addEventListener('input', () => {
      if (!validate(false).includes(name)) {
        $('[data-err="' + name + '"]').hidden = true;
        form.elements[name].closest('.field').classList.remove('is-err');
      }
    }));

    // Кнопка — настоящая ссылка на wa.me: так WhatsApp открывается и во встроенных браузерах
    $('[data-send]').addEventListener('click', e => {
      const errors = validate(true);
      if (errors.length || !cartCount()) {
        e.preventDefault();
        const first = form.elements[errors[0]];
        if (first) { first.scrollIntoView({ block: 'center', behavior: 'smooth' }); first.focus({ preventScroll: true }); }
        return;
      }
      syncForm();
      setTimeout(() => { endEditing(); view = 'done'; renderCart(false); $('[data-sheet-scroll]').scrollTop = 0; }, 700);
    });

    $$('[data-close-cart]').forEach(b => b.addEventListener('click', closeCart));
    $('[data-copy]').addEventListener('click', copyOrder);
    $('[data-back]').addEventListener('click', () => { view = 'form'; renderCart(false); });
    $('[data-new]').addEventListener('click', () => {
      cart = [];
      form.elements.comment.value = '';
      commit(false);
      closeCart();
      toast('Корзина очищена — можно оформить новый заказ');
    });
  }

  // ──────────────── главная: акция, хиты, плитки категорий ────────────────
  function minPrice(item) {
    const r = resolve({ id: item.id, qty: 1, sel: defaultSel(item), extras: [] });
    return r ? r.unit : (item.price || 0);
  }

  function renderPromo() {
    const promo = CFG.promo;
    if (!promo || promo.active === false || !ITEMS[promo.item]) return;
    const item = ITEMS[promo.item];
    const box = $('[data-promo-box]'), banner = $('[data-promo-banner]');
    if (box) {
      $('[data-promo]').hidden = false;
      box.replaceChildren(
        el('div', { class: 'deal__media' }, [photo({ src: item.image, alt: item.name, loading: 'lazy', width: 800, height: 800 })]),
        el('div', { class: 'deal__body' }, [
          el('span', { class: 'deal__badge', html: icon('fire') }, [document.createTextNode(t('Акция сети'))]),
          el('h2', { text: promo.title }),
          promo.text ? el('p', { class: 'deal__text', text: promo.text }) : null,
          el('div', { class: 'deal__price' }, [
            item.oldPrice ? el('s', { text: money(item.oldPrice) }) : null,
            el('b', { text: money(item.price) })
          ]),
          el('div', { class: 'deal__cta' }, [
            el('a', { class: 'btn btn--brand btn--lg', href: pageUrl('menu.html#item-' + item.id), text: 'Заказать по акции' })
          ])
        ])
      );
    }
    if (banner) {
      banner.hidden = false;
      banner.href = '#item-' + item.id;
      banner.replaceChildren(
        el('span', { class: 'dealbar__badge', html: icon('fire') }, [document.createTextNode(t('Акция'))]),
        el('span', { class: 'dealbar__t', text: promo.title }),
        el('span', { class: 'dealbar__go', text: 'Показать →' })
      );
    }
  }

  function renderHighlights() {
    const box = $('[data-highlights]');
    if (!box) return;
    box.replaceChildren.apply(box, (CFG.highlights || []).filter(id => ITEMS[id]).map(id => {
      const item = ITEMS[id];
      return el('a', { class: 'hit', href: pageUrl('menu.html#item-' + id) }, [
        el('span', { class: 'hit__media' }, [
          item.image ? photo({ src: item.image.replace('.jpg', '-sm.jpg'), alt: item.name, loading: 'lazy', width: 360, height: 360 }) : null,
          itemBadges(item).length ? el('span', { class: 'card__badges' }, itemBadges(item)) : null
        ]),
        el('span', { class: 'hit__name', text: item.name }),
        el('span', { class: 'hit__price', text: hasChoice(item) ? t('от {price}', { price: money(minPrice(item)) }) : money(minPrice(item)) })
      ]);
    }));
  }

  function renderTeaser() {
    const box = $('[data-teaser]');
    if (!box) return;
    box.replaceChildren();
    CATS.forEach(cat => box.appendChild(el('a', { class: 'tile', href: pageUrl('menu.html#cat-' + cat.id) }, [
      el('span', { class: 'tile__e', text: cat.emoji || '🍽️', 'aria-hidden': 'true' }),
      el('span', { class: 'tile__t', text: cat.title }),
      el('span', { class: 'tile__p', text: t('от {price}', { price: money(Math.min.apply(null, cat.items.map(minPrice))) }) })
    ])));
  }

  // menu.html#cart открывает корзину, #item-… / #cat-… показывает блюдо или раздел
  let hashScrollY = null;
  function openFromHash(onLoad) {
    const hash = decodeURIComponent(location.hash.slice(1));
    if (!hash) return;
    if (hash === 'cart') {
      if (form) { openCart(); history.replaceState(null, '', location.pathname + location.search); }
      return;
    }
    const target = document.getElementById(hash);
    if (!target) return;
    target.scrollIntoView({ block: hash.startsWith('item-') ? 'center' : 'start', behavior: onLoad === true ? 'instant' : 'smooth' });
    hashScrollY = window.scrollY;
    if (hash.startsWith('item-')) {
      target.classList.remove('is-spot'); void target.offsetWidth; target.classList.add('is-spot');
    }
  }

  // ─────────────────────────── отзывы ───────────────────────────
  const AVA = ['#262a78', '#ee1d2f', '#111113', '#1b1e5c', '#4a4a52', '#c8121f'];
  function initials(name) {
    const words = name.split(/\s+/).filter(w => /^[\p{L}]/u.test(w));
    const s = words.slice(0, 2).map(w => Array.from(w)[0].toUpperCase()).join('');
    return s || '★';
  }
  function stars(n) {
    const box = el('span', { class: 'stars', role: 'img', 'aria-label': t('Оценка {n} из 5', { n }) });
    for (let i = 1; i <= 5; i++) box.insertAdjacentHTML('beforeend', '<svg class="ic' + (i > n ? ' off' : '') + '" aria-hidden="true"><use href="#i-star"/></svg>');
    return box;
  }
  function reviewDate(iso) {
    if (language === 'kk') {
      const [year, month, day] = iso.split('-').map(Number);
      const months = ['қаңтар', 'ақпан', 'наурыз', 'сәуір', 'мамыр', 'маусым', 'шілде', 'тамыз', 'қыркүйек', 'қазан', 'қараша', 'желтоқсан'];
      return day + ' ' + months[month - 1] + ' ' + year;
    }
    return new Date(iso + 'T12:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function renderReviews() {
    const s = REV.summary, box = $('[data-rating-box]'), track = $('[data-reviews]');
    if (s) {
      $$('[data-rating]').forEach(n => { n.textContent = s.rating.toFixed(1); });
      $$('[data-ratings-count]').forEach(n => { n.textContent = s.ratings_count; });
      const dist = s.distribution, max = Math.max.apply(null, Object.values(dist)) || 1;
      box.replaceChildren(
        el('div', { class: 'rating__top' }, [
          el('div', { class: 'rating__num', text: s.rating.toFixed(1) }),
          el('div', {}, [stars(Math.round(s.rating)), el('div', {
            class: 'rating__sub',
            text: s.ratings_count + ' ' + plural(s.ratings_count, ['оценка', 'оценки', 'оценок']) + ' · ' +
              s.reviews_count + ' ' + plural(s.reviews_count, ['отзыв', 'отзыва', 'отзывов']) + t(' в 2ГИС по всем точкам')
          })])
        ]),
        el('div', { class: 'bars' }, [5, 4, 3, 2, 1].map(n => el('div', { class: 'bar' }, [
          el('span', { text: String(n) }),
          el('i', {}, [el('b', { style: 'width:' + Math.round((dist[n] || 0) / max * 100) + '%' })]),
          el('span', { text: String(dist[n] || 0) })
        ]))),
        el('p', { class: 'bars__note', text: t('Распределение — по {n} отзывам с оценкой.', { n: s.rated_total }) }),
        el('div', { class: 'rating__branches' }, BRANCHES.map(b => {
          const r = (s.branches || {})[b.id];
          return r ? el('span', { class: 'rating__branch' }, [
            el('b', { text: r.rating.toFixed(1) }),
            el('span', { text: b.name })
          ]) : null;
        }))
      );
    } else if (box) box.hidden = true;

    const titleOf = id => (BRANCHES.find(b => b.id === id) || {}).name || '';
    track.replaceChildren();
    REV.items.forEach((r, i) => {
      const text = el('p', { class: 'rev__text', text: r.text });
      const long = r.text.length > 260 || r.text.split('\n').length > 6;
      if (long) text.classList.add('is-clamped');
      const more = long ? el('button', {
        type: 'button', class: 'rev__more', text: 'Читать полностью',
        onclick: () => {
          const clamped = text.classList.toggle('is-clamped');
          more.textContent = t(clamped ? 'Читать полностью' : 'Свернуть');
        }
      }) : null;
      track.appendChild(el('article', { class: 'rev' }, [
        el('div', { class: 'rev__head' }, [
          el('div', { class: 'rev__ava', text: initials(r.author), style: 'background:' + AVA[i % AVA.length], 'aria-hidden': 'true' }),
          el('div', {}, [el('div', { class: 'rev__name', text: r.author }), el('div', { class: 'rev__meta', text: reviewDate(r.date) })])
        ]),
        stars(r.rating), text, more,
        el('span', { class: 'rev__tag', html: icon('pin') }, [document.createTextNode(titleOf(r.branch))])
      ]));
    });

    const prev = $('[data-rev-prev]'), next = $('[data-rev-next]');
    const step = () => { const c = $('.rev', track); return c ? c.getBoundingClientRect().width + 14 : 320; };
    const sync = () => {
      prev.disabled = track.scrollLeft < 8;
      next.disabled = track.scrollLeft + track.clientWidth > track.scrollWidth - 8;
    };
    prev.addEventListener('click', () => track.scrollBy({ left: -step() * 2, behavior: 'smooth' }));
    next.addEventListener('click', () => track.scrollBy({ left: step() * 2, behavior: 'smooth' }));
    track.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    sync();
  }

  // ─────────────────────────── галерея ───────────────────────────
  function initGallery() {
    const grid = $('[data-gallery]'), box = $('[data-lightbox]'), img = $('[data-lb-img]'), cap = $('[data-lb-cap]');
    const shots = (CFG.gallery || []).filter(g => ITEMS[g.id]).map(g => ({
      src: ITEMS[g.id].image, thumb: ITEMS[g.id].image.replace('.jpg', '-sm.jpg'),
      alt: ITEMS[g.id].name, shape: g.shape
    }));
    if (!shots.length) return;
    grid.replaceChildren();
    let index = 0, opener = null;
    const show = i => {
      index = (i + shots.length) % shots.length;
      const g = shots[index];
      img.onerror = () => { img.onerror = null; img.src = g.src; };
      img.src = webp(g.src);
      img.alt = g.alt;
      cap.textContent = g.alt + t(' · фото из меню сети');
    };
    const close = () => { box.hidden = true; document.body.classList.remove('is-locked'); $('#page').inert = false; if (opener) opener.focus(); };
    shots.forEach((g, i) => grid.appendChild(el('button', {
      type: 'button', class: g.shape ? 'is-' + g.shape : '', 'aria-label': t('Открыть фото: ') + g.alt,
      onclick: e => {
        opener = e.currentTarget; show(i); box.hidden = false;
        document.body.classList.add('is-locked'); $('#page').inert = true; $('[data-lb-close]').focus();
      }
    }, [photo({ src: g.thumb, alt: g.alt, loading: 'lazy' })])));
    $('[data-lb-close]').addEventListener('click', close);
    $('[data-lb-prev]').addEventListener('click', () => show(index - 1));
    $('[data-lb-next]').addEventListener('click', () => show(index + 1));
    box.addEventListener('click', e => { if (e.target === box || e.target.tagName === 'FIGURE') close(); });
    document.addEventListener('keydown', e => {
      if (!box.hidden) {
        if (e.key === 'Escape') close();
        if (e.key === 'ArrowLeft') show(index - 1);
        if (e.key === 'ArrowRight') show(index + 1);
      }
    });
  }

  // ─────────────── общие данные сети в разметку ───────────────
  function applyConfig() {
    const c = CFG.contacts;
    $$('[data-instagram]').forEach(a => {
      a.href = 'https://www.instagram.com/' + c.instagram + '/';
      const b = $('b', a);
      if (b) b.textContent = '@' + c.instagram;
    });
    $$('[data-year]').forEach(n => { n.textContent = new Date().getFullYear(); });
    // «добер от …» — минимальная цена в категории доберов
    const dobers = CATS.find(cat => cat.id === 'dobers') || CATS[0];
    if (dobers) $$('[data-min-price]').forEach(n => { n.textContent = money(Math.min.apply(null, dobers.items.map(minPrice))); });
  }

  // ─────────────────────────── уведомление ───────────────────────────
  let toastTimer;
  function toast(text) {
    const node = $('[data-toast]');
    node.textContent = window.DOBER_I18N.t(text);
    node.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => node.classList.remove('is-on'), 2400);
  }

  // ──────────────────────────────── старт ────────────────────────────────
  applyConfig();
  if ($('[data-menu]')) renderMenu();
  if ($('[data-item-sheet]')) initItemSheet();
  initBranchSheet();
  if (form) { initCheckout(); initKeyboard(); }
  $$('[data-open-cart]').forEach(b => b.addEventListener('click', openCart));
  if ($('[data-reviews]')) renderReviews();
  if ($('[data-gallery]')) initGallery();
  renderPromo();
  renderHighlights();
  renderTeaser();
  applyBranch();
  renderCart(false);
  openFromHash(true);
  // на странице заказа сразу обращаем внимание на выбранную точку
  if ($('[data-menu]')) pulseBranchbar();

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if ($('[data-item-sheet]') && !$('[data-item-sheet]').hidden) closeItem();
    else if ($('[data-branch-sheet]') && !$('[data-branch-sheet]').hidden) closeBranches();
    else if ($('[data-sheet]') && !$('[data-sheet]').hidden) closeCart();
    else if ($('[data-tray]') && !$('[data-tray]').hidden) hideTray();
  });
  const trayClose = $('[data-tray-close]');
  if (trayClose) trayClose.addEventListener('click', () => {
    if (trayDismissKey) dismissed.add(trayDismissKey);
    hideTray();
  });

  window.addEventListener('load', () => { if (hashScrollY !== null && Math.abs(window.scrollY - hashScrollY) < 8) openFromHash(true); });
  window.addEventListener('hashchange', () => openFromHash(false));
  setInterval(applyBranch, 60000);
})();
