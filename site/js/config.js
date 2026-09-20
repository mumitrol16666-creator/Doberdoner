/*
 * НАСТРОЙКИ САЙТА — всё, что обычно нужно менять, лежит в этом файле:
 * филиалы и их номера WhatsApp, часы работы, меню и цены, галерея.
 *
 * Как добавить блюдо: скопируйте строку вида
 *   { id: 'cola', name: 'Coca-Cola', price: 700, image: 'img/cola.jpg' },
 * в нужную категорию. id — любое уникальное слово латиницей.
 * Чтобы временно убрать блюдо, категорию или филиал — добавьте hidden: true.
 *
 * Цены и состав блюд сверены с официальным меню сети (dober-doner.kamiqr.com) 20.09.2026.
 */

/* ─────────── Общие наборы вариантов: на них ссылаются блюда ниже ───────────
   price — сколько добавляется к базовой цене блюда. def: true — что выбрано по умолчанию. */

// Размер добера: M 300 г — базовая цена, L +300, XL +600
const SIZE = {
  id: 'size', title: 'Размер',
  options: [
    { id: 'm', name: 'M · 300 г', line: 'M 300 г', price: 0, def: true },
    { id: 'l', name: 'L · 400 г', line: 'L 400 г', price: 300 },
    { id: 'xl', name: 'XL · 500 г', line: 'XL 500 г', price: 600 }
  ]
};

// Начинка добера
const MEAT = {
  id: 'meat', title: 'Начинка',
  options: [
    { id: 'chicken', name: 'Курица', line: 'курица', price: 0, def: true },
    { id: 'beef', name: 'Говядина', line: 'говядина', price: 300 },
    { id: 'mix', name: 'Ассорти', line: 'ассорти', price: 200 }
  ]
};

// Лаваш. Умолчание у каждого добера своё — поле def переопределяется в блюде через defaults
const LAVASH = {
  id: 'lavash', title: 'Лаваш',
  options: [
    { id: 'hand', name: 'Ручной', line: 'ручной лаваш', def: true },
    { id: 'armenian', name: 'Армянский', line: 'армянский лаваш' },
    { id: 'black', name: 'Чёрный', line: 'чёрный лаваш' }
  ]
};

const SPICE = {
  id: 'spice', title: 'Острота',
  options: [
    { id: 'mild', name: 'Не острый', line: 'не острый', def: true },
    { id: 'medium', name: 'Средне острый', line: 'средне острый' },
    { id: 'hot', name: 'Острый', line: 'острый' }
  ]
};

// Добавки к доберу (цены одинаковые во всех доберах)
const DONER_EXTRAS = [
  { id: 'cheese', name: 'Сыр', line: 'сыр', price: 300 },
  { id: 'aioli', name: 'Соус айоли', line: 'соус айоли', price: 250 },
  { id: 'white', name: 'Белый соус', line: 'белый соус', price: 250 },
  { id: 'bbq', name: 'Соус BBQ', line: 'соус BBQ', price: 250 },
  { id: 'ketchup', name: 'Кетчуп', line: 'кетчуп', price: 250 },
  { id: 'onion', name: 'Маринованный лук', line: 'маринованный лук', price: 250 },
  { id: 'tomato', name: 'Помидоры', line: 'помидоры', price: 150 },
  { id: 'cucumber', name: 'Огурцы свежие', line: 'огурцы свежие', price: 150 },
  { id: 'pickle', name: 'Огурцы маринованные', line: 'огурцы маринованные', price: 150 },
  { id: 'carrot', name: 'Морковь по-корейски', line: 'морковь по-корейски', price: 150 },
  { id: 'pepper', name: 'Перчик', line: 'перчик', price: 150 }
];

// Добавки к бургеру
const BURGER_EXTRAS = [
  { id: 'mozzarella', name: 'Моцарелла', line: 'моцарелла', price: 250 },
  { id: 'cheddar', name: 'Чеддер', line: 'чеддер', price: 250 },
  { id: 'beef-patty', name: 'Говяжья котлета', line: 'говяжья котлета', price: 1000 },
  { id: 'chicken-patty', name: 'Куриная котлета', line: 'куриная котлета', price: 600 }
];

// Соус к гарниру — выбор обязательный, «Без соуса» бесплатно
const SIDE_SAUCE = {
  id: 'sauce', title: 'Соус к гарниру',
  options: [
    { id: 'none', name: 'Без соуса', line: 'без соуса', price: 0, def: true },
    { id: 'cheese', name: 'Сырный', line: 'сырный соус', price: 300 },
    { id: 'bbq', name: 'BBQ', line: 'соус BBQ', price: 300 },
    { id: 'chili', name: 'Сладкий чили', line: 'сладкий чили', price: 300 },
    { id: 'honey', name: 'Медово-чесночный', line: 'медово-чесночный', price: 300 },
    { id: 'white', name: 'Белый', line: 'белый соус', price: 250 },
    { id: 'ketchup', name: 'Кетчуп', line: 'кетчуп', price: 250 }
  ]
};

window.DOBER = {
  brand: {
    name: 'Dober Doner',
    legalName: 'Dober doner',
    slogan: 'Ничего лишнего — только вкус',
    tagline: 'Дерзкий донер и сочная шаверма',
    city: 'Актобе'
  },

  // Общие контакты сети. Номер для заказа берётся у выбранного филиала (см. branches).
  contacts: {
    instagram: 'dober__doner',
    facebook: 'https://www.facebook.com/doberdoner/',
    menu2gis: 'https://go.2gis.com/M9Y68',
    admin: '77011893885',                 // связь с администратором (жалобы, предложения)
    adminDisplay: '+7 701 189 38 85',
    feedback: 'https://dober-doner.kamiqr.com/feedback/PojRUZ',
    franchise: 'https://dober-doner.ifa-tsc.kz/'
  },

  // Реквизиты для страницы «Политика конфиденциальности» (privacy.html).
  // ⚠️ Перед запуском вписать: operator — 'ИП Фамилия И. О.' или 'ТОО «…»', bin — БИН/ИИН.
  legal: { operator: '', bin: '' },

  currency: '₸',
  payments: ['Наличные', 'Карта', 'QR-код', 'Kaspi Red'],

  // ───────────────────────── ФИЛИАЛЫ ─────────────────────────
  // Заказ уходит в WhatsApp того филиала, который выбрал гость. Первый филиал — по умолчанию.
  //   hours.open / hours.close — часы по местному времени, close: 26 = до 02:00 следующего дня
  //   lastOrder — до какого времени принимают заказы (пусто — до закрытия)
  //   delivery: false — филиал работает только навынос
  //   rating — из карточки 2ГИС на 20.09.2026, обновляется скриптом tools/build_data.py
  branches: [
    {
      id: 'shaikenova',
      name: 'На Шайкенова',
      address: 'ул. Нагашбай Шайкенова, 20',
      addressNote: '1 этаж, 11-й микрорайон',
      city: 'Актобе',
      landmark: 'остановка «Аз Наурыз»',
      whatsapp: '77783869447',
      phone: '+77783869447',
      phoneDisplay: '+7 778 386 94 47',
      hours: { open: 10, close: 24, lastOrder: '23:30', label: 'Ежедневно 10:00–24:00' },
      delivery: { fee: 800, freeFrom: 8000 },
      features: ['Зал до 20 мест', 'Бесплатный Wi-Fi', 'Пандус', 'Туалет'],
      rating: { value: 4.9, count: 553 },
      geo: { lat: 50.283083, lon: 57.201618 },
      twoGis: 'https://2gis.kz/aktobe/firm/70000001060010769',
      firmId: '70000001060010769'
    },
    {
      id: 'eset-batyra',
      name: 'На Есет батыра',
      address: 'ул. Есет батыра, 83',
      addressNote: '1 этаж, 5-й микрорайон',
      city: 'Актобе',
      landmark: 'остановка «Дом ветеранов»',
      whatsapp: '77007133458',
      phone: '+77007133458',
      phoneDisplay: '+7 700 713 34 58',
      hours: { open: 10, close: 24, lastOrder: '23:30', label: 'Ежедневно 10:00–24:00' },
      delivery: { fee: 800, freeFrom: 8000 },
      features: ['Зал до 30 мест', 'Летняя веранда', 'Бесплатный Wi-Fi', 'Туалет'],
      rating: { value: 4.8, count: 521 },
      geo: { lat: 50.301322, lon: 57.160313 },
      twoGis: 'https://2gis.kz/aktobe/firm/70000001092741150',
      firmId: '70000001092741150'
    },
    {
      // ⚠️ Фудкорт: в 2ГИС у точки нет доставки и указана только шаурма — сверить с кафе,
      //    какие позиции меню тут действительно готовят.
      id: 'city-mall',
      name: 'В City Shopping Center',
      address: '12-й микрорайон, 21л',
      addressNote: 'ТЦ City Shopping Center, 1 этаж',
      city: 'Актобе',
      landmark: 'остановка «12-й микрорайон»',
      whatsapp: '77023988310',
      phone: '+77023988310',
      phoneDisplay: '+7 702 398 83 10',
      hours: { open: 10, close: 22, lastOrder: '', label: 'Ежедневно 10:00–22:00' },
      delivery: null,
      features: ['Фудкорт торгового центра', 'Оплата картой и QR'],
      rating: { value: 4.8, count: 57 },
      geo: { lat: 50.279025, lon: 57.195553 },
      twoGis: 'https://2gis.kz/aktobe/firm/70000001116881897',
      firmId: '70000001116881897'
    },
    {
      // ⚠️ Хромтау: условия доставки (стоимость, бесплатный порог) не опубликованы — уточнить.
      id: 'khromtau',
      name: 'В Хромтау',
      address: 'ул. Мухтара Ауэзова, 9а',
      addressNote: '1 этаж',
      city: 'Хромтау',
      landmark: 'остановка «Космос»',
      whatsapp: '77002608397',
      phone: '+77002608397',
      phoneDisplay: '+7 700 260 83 97',
      hours: { open: 10, close: 26, lastOrder: '', label: 'Ежедневно 10:00–02:00' },
      delivery: { fee: null, freeFrom: null },
      features: ['Зал до 20 мест', 'Бесплатный Wi-Fi', 'Туалет', 'Работает до 02:00'],
      instagram: 'dober_doner_khromtau',
      rating: { value: 4.7, count: 98 },
      geo: { lat: 50.261343, lon: 58.428488 },
      twoGis: 'https://2gis.kz/aktobe/firm/70000001094311159',
      firmId: '70000001094311159'
    }
  ],

  // Что написано о доставке на сайте сети
  deliveryNote: 'Стоимость и время доставки подтвердит оператор в WhatsApp.',
  timezoneOffsetMin: 300,        // Актобе и Хромтау — UTC+5

  // ───────────────────────────── МЕНЮ ─────────────────────────────
  menu: [
    {
      id: 'dobers',
      emoji: '🌯',
      title: 'Доберы',
      note: 'Собери свой добер: размер, начинка, лаваш, острота',
      items: [
        {
          id: 'dober-star', name: 'DOBER STAR', price: 1380, image: 'img/dober-star.jpg',
          desc: 'Мясо на выбор, жареный картофель, маринованные огурчики, свежие помидоры, нежный айоли и фирменный соус — в хрустящем лаваше.',
          groups: [SIZE, MEAT, LAVASH, SPICE], extras: DONER_EXTRAS
        },
        {
          id: 'dober-doner', name: 'DOBER DONER', price: 1380, image: 'img/dober-doner.jpg', badge: 'Новинка',
          desc: 'Свежие помидоры и огурцы, пекинская капуста, картофель, три фирменных соуса и мясо на выбор.',
          groups: [SIZE, MEAT, LAVASH, SPICE], extras: DONER_EXTRAS
        },
        {
          id: 'dober-meks', name: 'DOBER MEKS', price: 1380, image: 'img/dober-meks.jpg', badge: 'Хит', spicy: true,
          desc: 'Охотничьи говяжьи колбаски, жареный картофель, сладкая кукуруза, маринованные огурчики и свежие помидоры, айоли и фирменный соус, жгучий халапеньо.',
          groups: [SIZE, LAVASH, SPICE], extras: DONER_EXTRAS,
          defaults: { lavash: 'armenian', spice: 'medium' }
        },
        {
          id: 'pp-shneinica', name: 'ПП-шнейница', price: 1380, image: 'img/pp-shneinica.jpg',
          desc: 'Свежие помидоры и огурцы, пекинская капуста, морковь по-корейски, два фирменных соуса и мясо на выбор.',
          groups: [SIZE, MEAT, LAVASH, SPICE], extras: DONER_EXTRAS,
          defaults: { lavash: 'armenian' }
        },
        {
          id: 'griboedov', name: 'GRIBOEDOV', price: 1380, image: 'img/griboedov.jpg', badge: 'Хит',
          desc: 'Жареный картофель, нежные грибы, маринованные огурцы, свежие помидоры, соусы айоли, ремулад и грибной, акцент луковых чипсов.',
          groups: [SIZE, LAVASH, SPICE], extras: DONER_EXTRAS
        },
        {
          id: 'black-pearl', name: 'Чёрная жемчужина', price: 1380, image: 'img/black-pearl.jpg',
          desc: 'Чёрный лаваш, пекинская капуста, картофель, жареные шампиньоны, маринованные огурцы и два секретных соуса капитана.',
          groups: [SIZE, MEAT, LAVASH, SPICE], extras: DONER_EXTRAS,
          defaults: { lavash: 'black' }
        },
        {
          id: 'jimichurri', name: 'Джимиччури', price: 1380, image: 'img/jimichurri.jpg', spicy: true,
          desc: 'Курица или говядина, жареный картофель, маринованные огурчики, свежие помидоры, айоли, айсберг и соус чимичури с халапеньо.',
          groups: [SIZE, MEAT, LAVASH], extras: DONER_EXTRAS
        },
        {
          id: 'louis', name: 'DOBER Louis za Verton', price: 1380, image: 'img/louis.jpg',
          desc: 'Картофель, свежие овощи — помидоры, огурцы, пекинская капуста, кукуруза, сыр креметте и сладкая горчица.',
          groups: [SIZE, MEAT, LAVASH, SPICE], extras: DONER_EXTRAS
        },
        {
          // Акция сети: 990 ₸ вместо 1 380 ₸. Убрать акцию — удалить oldPrice и вернуть цены 1380/1680/1980.
          id: 'po-bratski', name: 'Добер ПО-БРАТСКИ', price: 990, oldPrice: 1380, image: 'img/po-bratski.jpg', badge: 'Акция',
          desc: 'Сочный донер с картофелем фри, свежими овощами и фирменными соусами — по-братски, по хорошей цене.',
          groups: [SIZE, MEAT, LAVASH, SPICE],
          defaults: { lavash: 'armenian' }
        }
      ]
    },
    {
      id: 'burgers',
      emoji: '🍔',
      title: 'Бургеры',
      items: [
        {
          id: 'chiki-briki', name: 'Чики Брики', price: 2180, image: 'img/chiki-briki.jpg',
          desc: 'Сочный куриный бургер с чеддером, айсбергом, маринованными огурцами и соусами BBQ и кетчуп.',
          extras: BURGER_EXTRAS
        },
        {
          id: 'beef-burger', name: 'BEEF Бургер', price: 2470, image: 'img/beef-burger.jpg',
          desc: 'Говяжья котлета, салат коул слоу, маринованные огурцы и свежие помидоры, сыр чеддер, соусы айоли, BBQ, кетчуп и фирменный.',
          extras: BURGER_EXTRAS
        },
        {
          id: 'merzavec', name: 'Ласковый мерзавец', price: 2660, image: 'img/merzavec.jpg',
          desc: 'Куриная котлета с жареными грибами, помидорами и моцареллой, под соусами айоли, ремулад, грибным и BBQ, с луковыми чипсами.',
          extras: BURGER_EXTRAS
        },
        {
          id: 'chicken-stone', name: 'Чикен Стоун', price: 2950, image: 'img/chicken-stone.jpg',
          desc: 'Куриная котлета с айсбергом, маринованными огурцами и свежими помидорами, чеддер и соусы айоли, BBQ, кетчуп и фирменный.',
          extras: BURGER_EXTRAS
        },
        {
          id: 'jeepers', name: 'Джиперс Криперс', price: 3340, image: 'img/jeepers.jpg',
          desc: 'Куриный бургер с чеддером, свежими помидорами, хрустящим айсбергом, соусом BBQ и фирменным соусом, с луковыми кольцами.',
          extras: BURGER_EXTRAS
        },
        {
          id: 'vertushka', name: 'Вертушка Джеки Чана', price: 3430, image: 'img/vertushka.jpg', spicy: true,
          desc: 'Говяжья котлета и охотничьи колбаски, айсберг, маринованные огурцы, помидор и чеддер, соусы айоли, сладкий чили, BBQ и фирменный.',
          groups: [SPICE], extras: BURGER_EXTRAS
        },
        {
          id: 'chicago', name: 'Чикаго Блюз', price: 3520, image: 'img/chicago.jpg', badge: 'Много мяса',
          desc: 'Говяжий бургер с тремя котлетами, тянущейся моцареллой, маринованными огурцами, халапеньо и соусами BBQ и кетчуп.',
          groups: [{
            id: 'patty', title: 'Котлеты',
            options: [
              { id: 'three', name: 'Три котлеты', line: 'три котлеты', price: 0, def: true },
              { id: 'four', name: '+ говяжья котлета', line: 'с дополнительной говяжьей котлетой', price: 1900 }
            ]
          }],
          extras: BURGER_EXTRAS
        },
        {
          id: 'doberman', name: 'Бургер «DOBERMAN»', price: 3710, image: 'img/doberman.jpg', badge: 'Фирменный', spicy: true,
          desc: 'Две котлеты — говяжья и куриная, айсберг, фасоль, свежий помидор, чеддер и моцарелла, соусы лечо, BBQ, чимичури, аджика и две горчицы.',
          groups: [SPICE],
          extras: BURGER_EXTRAS.concat([{ id: 'no-onion', name: 'Без лука', line: 'без лука', price: 0 }])
        }
      ]
    },
    {
      id: 'chicken',
      emoji: '🍗',
      title: 'Чикен',
      note: 'Крылышки в фирменной панировке',
      items: [
        {
          id: 'chicken', name: 'Чикен', price: 2200, image: 'img/chicken.jpg',
          desc: 'Крылышки, жаренные в фирменной панировке. Соус можно вмешать или взять отдельно.',
          groups: [
            {
              id: 'portion', title: 'Порция',
              options: [
                { id: '6', name: '6 шт', line: '6 шт', price: 0, def: true },
                { id: '12', name: '12 шт', line: '12 шт', price: 1700 },
                { id: '18', name: '18 шт', line: '18 шт', price: 3400 },
                { id: '24', name: '24 шт', line: '24 шт', price: 5000 }
              ]
            },
            {
              id: 'sauce', title: 'Соус',
              options: [
                { id: 'none', name: 'Без соуса', line: 'без соуса', price: 0, def: true },
                { id: 'chili', name: 'Сладкий чили', line: 'сладкий чили', price: 700 },
                { id: 'honey', name: 'Медово-чесночный', line: 'медово-чесночный', price: 700 },
                { id: 'bbq', name: 'BBQ', line: 'соус BBQ', price: 700 },
                { id: 'cheese', name: 'Сырный', line: 'сырный соус', price: 700 },
                { id: 'white', name: 'Белый', line: 'белый соус', price: 700 },
                { id: 'ketchup', name: 'Кетчуп', line: 'кетчуп', price: 700 }
              ]
            },
            {
              id: 'serve', title: 'Что делаем с соусом?',
              options: [
                { id: 'apart', name: 'Отдельно', line: 'соус отдельно', def: true },
                { id: 'mix', name: 'Вмешать', line: 'соус вмешать' }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'sides',
      emoji: '🍟',
      title: 'Гарниры',
      items: [
        {
          id: 'fries', name: 'Картофель фри', price: 800, image: 'img/fries.jpg',
          groups: [SIDE_SAUCE]
        },
        {
          id: 'wedges', name: 'Картофельные дольки', price: 1000, image: 'img/wedges.jpg',
          groups: [SIDE_SAUCE]
        },
        {
          id: 'nuggets', name: 'Нагетсы', price: 850, image: 'img/nuggets.jpg',
          groups: [
            {
              id: 'portion', title: 'Порция',
              options: [
                { id: '5', name: '5 шт', line: '5 шт', price: 0, def: true },
                { id: '10', name: '10 шт', line: '10 шт', price: 650 }
              ]
            },
            SIDE_SAUCE
          ]
        },
        {
          id: 'onion-rings', name: 'Луковые кольца', price: 1500, image: 'img/onion-rings.jpg',
          desc: 'Золотистые луковые кольца с хрустящей корочкой.',
          groups: [SIDE_SAUCE]
        },
        {
          id: 'dobersy', name: 'Доберсы', price: 2500, image: 'img/dobersy.jpg', badge: 'Новинка',
          desc: 'Сочное куриное филе, обжаренное в панировке. Подаётся с соусом ремулад.'
        }
      ]
    },
    {
      id: 'sauces',
      emoji: '🥣',
      title: 'Соусы и добавки',
      items: [
        { id: 'sauce-bbq', name: 'Соус BBQ', price: 300, image: 'img/sauce-bbq.jpg' },
        { id: 'sauce-cheese', name: 'Соус сырный', price: 300, image: 'img/sauce-cheese.jpg' },
        { id: 'sauce-honey', name: 'Медово-чесночный', price: 300, image: 'img/sauce-honey.jpg' },
        { id: 'sauce-chili', name: 'Сладкий чили', price: 300, image: 'img/sauce-chili.jpg' },
        { id: 'sauce-white', name: 'Соус белый', price: 250, image: 'img/sauce-white.jpg' },
        { id: 'ketchup', name: 'Кетчуп', price: 250, image: 'img/ketchup.jpg' },
        { id: 'pepper', name: 'Перчик', price: 150, image: 'img/pepper.jpg' }
      ]
    },
    {
      id: 'drinks',
      emoji: '🥤',
      title: 'Напитки',
      items: [
        {
          id: 'cola', name: 'Coca-Cola', price: 700, image: 'img/cola.jpg',
          groups: [{
            id: 'volume', title: 'Объём',
            options: [
              { id: '05', name: '0,5 л', line: '0,5 л', price: 0, def: true },
              { id: '1', name: '1 л', line: '1 л', price: 250 },
              { id: 'glass', name: 'Стекло 0,25 л', line: 'стекло 0,25 л', price: 50 },
              { id: 'can', name: 'Жестяная банка', line: 'ж/б', price: 50 }
            ]
          }]
        },
        {
          id: 'cola-zero', name: 'Coca-Cola Zero', price: 700, image: 'img/cola-zero.jpg',
          groups: [{
            id: 'volume', title: 'Объём',
            options: [
              { id: '05', name: '0,5 л', line: '0,5 л', price: 0, def: true },
              { id: '1', name: '1 л', line: '1 л', price: 250 },
              { id: 'can', name: 'Жестяная банка', line: 'ж/б', price: 50 }
            ]
          }]
        },
        {
          id: 'sprite', name: 'Sprite', price: 700, image: 'img/sprite.jpg',
          groups: [{
            id: 'volume', title: 'Объём',
            options: [
              { id: '05', name: '0,5 л', line: '0,5 л', price: 0, def: true },
              { id: '1', name: '1 л', line: '1 л', price: 250 },
              { id: 'glass', name: 'Стекло 0,25 л', line: 'стекло 0,25 л', price: 50 },
              { id: 'can', name: 'Жестяная банка', line: 'ж/б', price: 50 }
            ]
          }]
        },
        {
          id: 'fanta', name: 'Fanta', price: 700, image: 'img/fanta.jpg',
          groups: [{
            id: 'volume', title: 'Объём',
            options: [
              { id: '05', name: '0,5 л', line: '0,5 л', price: 0, def: true },
              { id: '1', name: '1 л', line: '1 л', price: 250 },
              { id: 'glass', name: 'Стекло 0,25 л', line: 'стекло 0,25 л', price: 50 },
              { id: 'can', name: 'Жестяная банка', line: 'ж/б', price: 50 }
            ]
          }]
        },
        { id: 'fanta-granat', name: 'Fanta Granat', price: 750, image: 'img/fanta-granat.jpg' },
        {
          id: 'fusetea', name: 'Чай Fuse Tea', price: 700, image: 'img/fusetea.jpg', desc: 'В ассортименте.',
          groups: [{
            id: 'volume', title: 'Объём',
            options: [
              { id: '05', name: '0,5 л', line: '0,5 л', price: 0, def: true },
              { id: '1', name: '1 л', line: '1 л', price: 250 }
            ]
          }]
        },
        {
          // ⚠️ Объём маленькой порции компота в меню не указан — уточнить и вписать в name варианта.
          id: 'compote', name: 'Компот из сухофруктов', price: 550, image: 'img/compote.jpg',
          desc: 'Насыщенный, ароматный, без лишнего сахара — как у бабушки.',
          groups: [{
            id: 'volume', title: 'Объём',
            options: [
              { id: 'cup', name: 'Порция', line: 'порция', price: 0, def: true },
              { id: '1', name: '1 л', line: '1 л', price: 200 }
            ]
          }]
        },
        { id: 'ayran', name: 'Турецкий айран', price: 450, image: 'img/ayran.jpg' },
        {
          id: 'bonaqua', name: 'Вода BonAqua', price: 400, image: 'img/bonaqua.jpg',
          groups: [{
            id: 'volume', title: 'Объём',
            options: [
              { id: '05', name: '0,5 л', line: '0,5 л', price: 0, def: true },
              { id: '1', name: '1 л', line: '1 л', price: 100 }
            ]
          }]
        },
        { id: 'piko', name: 'Сок Piko с трубочкой', price: 550, image: 'img/piko.jpg', desc: 'В ассортименте.' },
        {
          id: 'piko-pulpy', name: 'Piko Pulpy', price: 900, image: 'img/piko-pulpy.jpg', desc: 'В ассортименте.',
          groups: [{
            id: 'volume', title: 'Объём',
            options: [
              { id: 'std', name: 'Бутылка', line: 'бутылка', price: 0, def: true },
              { id: '1', name: '1 л', line: '1 л', price: 400 }
            ]
          }]
        },
        { id: 'piko-tetra', name: 'Piko тетрапак', price: 1300, image: 'img/piko-tetra.jpg', desc: 'В ассортименте.' }
      ]
    }
  ],

  // ───────────────────── ПРЕДЛОЖЕНИЯ К ПОКУПКЕ ─────────────────────
  // Подсказка сразу после добавления блюда: after — что вызывает, suggest — что предложить.
  // То, что уже в корзине, не предлагается.
  upsell: [
    {
      id: 'doner-sides', after: ['dober-star', 'dober-doner', 'dober-meks', 'pp-shneinica', 'griboedov', 'black-pearl', 'jimichurri', 'louis', 'po-bratski'],
      title: 'К доберу отлично зайдёт',
      suggest: [{ id: 'fries' }, { id: 'cola', label: 'Coca-Cola 0,5 л' }, { id: 'pepper' }]
    },
    {
      id: 'burger-sides', after: ['chiki-briki', 'beef-burger', 'merzavec', 'chicken-stone', 'jeepers', 'vertushka', 'chicago', 'doberman'],
      title: 'Добавить к бургеру?',
      suggest: [{ id: 'fries' }, { id: 'onion-rings' }, { id: 'cola', label: 'Coca-Cola 0,5 л' }]
    },
    {
      id: 'chicken-drink', after: ['chicken', 'dobersy', 'nuggets'],
      title: 'Напиток к закуске?',
      suggest: [{ id: 'cola', label: 'Coca-Cola 0,5 л' }, { id: 'fusetea', label: 'Чай Fuse Tea 0,5 л' }, { id: 'ayran' }]
    }
  ],
  // Категории, где хватит одной позиции: есть любой напиток — другие уже не предлагаем
  upsellExclusive: ['drinks'],
  // Блок «Добавить к заказу?» в корзине (показываются первые 4 подходящих)
  cartSuggest: [
    { id: 'cola', label: 'Coca-Cola 0,5 л' },
    { id: 'fries' },
    { id: 'sauce-cheese' },
    { id: 'chicken' },
    { id: 'ayran' },
    { id: 'pepper' }
  ],

  // ─────────────────────────── ГЛАВНАЯ ───────────────────────────
  // Блок акции на главной: ссылается на блюдо из меню, цена берётся оттуда же.
  promo: {
    active: true,
    item: 'po-bratski',
    title: 'Добер ПО-БРАТСКИ — 990 ₸',
    text: 'Сочный донер с картофелем фри, свежими овощами и фирменными соусами. Цена уже со скидкой — промокод не нужен.'
  },

  // Хиты на главной — карточки «Берут чаще всего»
  highlights: ['dober-meks', 'doberman', 'chicken', 'griboedov'],

  // Галерея: фото блюд из официального меню сети
  gallery: [
    { id: 'dober-star', shape: 'tall' },
    { id: 'doberman', shape: 'tall' },
    { id: 'chicken' },
    { id: 'dober-meks' },
    { id: 'merzavec', shape: 'wide' },
    { id: 'onion-rings' },
    { id: 'griboedov' },
    { id: 'chicago' }
  ]
};
