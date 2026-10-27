/* @ds-bundle: {"format":4,"namespace":"LeagueMN","components":[{"name":"NavBar"},{"name":"SectionHeader"},{"name":"ResultsStrip"},{"name":"NewsFeatured"},{"name":"NewsCard"},{"name":"NewsList"},{"name":"NewsImage"},{"name":"LeaguesPanel"},{"name":"UpcomingPanel"},{"name":"EmptyState"},{"name":"BottomTabBar"},{"name":"Footer"},{"name":"Button"}]} */
(function () {
  var React = window.React, h = React.createElement;
  function cx() { return Array.prototype.filter.call(arguments, Boolean).join(" "); }
  function I(name, extra) { return h("span", Object.assign({ className: "mi", "aria-hidden": true }, extra || {}), name); }

  /* ---------- primitives ---------- */
  function Logo(p) {
    return h("a", { className: "lmn-logo", href: p && p.href || "#", "aria-label": "LeagueMN — Нүүр" }, "League", h("em", null, "MN"), h("i", null));
  }
  function Button(p) {
    var rest = Object.assign({}, p); ["icon", "iconOnly", "className", "children"].forEach(function (k) { delete rest[k]; });
    return h("button", Object.assign({ type: "button" }, rest, { className: cx("lmn-btn", p.iconOnly && "lmn-btn-icon", p.className) }),
      p.icon && I(p.icon), p.iconOnly ? h("span", { className: "sr" }, p.children) : p.children);
  }
  function ThemeToggle() {
    var root = document.documentElement;
    var s = React.useState(root.getAttribute("data-theme") === "dark"), dark = s[0], set = s[1];
    return h(Button, { iconOnly: true, icon: dark ? "light_mode" : "dark_mode", onClick: function () { var n = !dark; set(n); root.setAttribute("data-theme", n ? "dark" : "light"); } }, dark ? "Гэрэл горим" : "Харанхуй горим");
  }
  function SectionHeader(p) {
    return h("div", { className: "lmn-sh" }, h(p.as || "h2", null, p.title),
      p.linkLabel && h("a", { className: "lmn-link", href: p.href || "#" }, p.linkLabel));
  }

  /* ---------- navigation ---------- */
  var NAV = ["Нүүр", "Мэдээ", "Тоглолтууд", "Лигүүд", "Бидний тухай", "Холбоо барих"];
  function NavBar(p) {
    var cur = p.current || "Нүүр";
    return h("header", { className: "lmn-nav" }, h("div", { className: "lmn-nav-in" },
      h(Logo),
      h("nav", { className: "lmn-nav-links", "aria-label": "Үндсэн цэс" }, (p.items || NAV).map(function (t) {
        return h("a", { key: t, href: "#", "aria-current": t === cur ? "page" : undefined }, t);
      })),
      h("div", { className: "lmn-nav-actions" }, h(ThemeToggle), h(Button, { iconOnly: true, icon: "menu", className: "lmn-nav-menu" }, "Цэс нээх"))));
  }
  var TABS = [["Нүүр", "home"], ["Мэдээ", "newspaper"], ["Тоглолт", "sports_basketball"], ["Лигүүд", "emoji_events"], ["Холбоо", "call"]];
  function BottomTabBar(p) {
    var cur = p.current || "Нүүр";
    return h("nav", { className: cx("lmn-tabbar", p.static && "is-static"), "aria-label": "Доод цэс" }, TABS.map(function (t) {
      return h("a", { key: t[0], href: "#", "aria-current": t[0] === cur ? "page" : undefined }, I(t[1]), t[0]);
    }));
  }

  /* ---------- results ---------- */
  function Team(t, state) {
    return h("div", { className: cx("lmn-team", state && "is-" + state) },
      h("span", { className: "lmn-team-logo", style: { background: t.color || "#595d6c" }, "aria-hidden": true }, t.abbr[0]),
      h("span", { className: "lmn-team-abbr", title: t.name }, t.abbr),
      h("span", { className: "lmn-team-score" }, t.score));
  }
  function ResultCard(p) {
    var a = p.home, b = p.away, aw = a.score > b.score;
    return h("a", { className: "lmn-card lmn-result", href: p.href || "#", "aria-label": a.abbr + " " + a.score + ", " + b.abbr + " " + b.score },
      h("div", { className: "lmn-result-h" }, h("span", null, p.date), "·", h("b", null, p.league)),
      Team(a, aw ? "winner" : "loser"), Team(b, aw ? "loser" : "winner"));
  }
  function ResultsStrip(p) {
    return h("section", { "aria-labelledby": "res-h" },
      h(SectionHeader, { title: "Сүүлд болсон тоглолтууд", linkLabel: "Бүх хуваарь →" }),
      h("div", { className: "lmn-strip-wrap" }, h("div", { className: "lmn-strip", role: "list" },
        (p.results || []).map(function (r, i) { return h(ResultCard, Object.assign({ key: i }, r)); }))));
  }

  /* ---------- news ---------- */
  function NewsImage(p) {
    return h("div", { className: "lmn-media" },
      p.image ? h("img", { src: p.image, alt: p.alt || "", loading: "lazy" }) : h("div", { className: "lmn-media-ph" }, I("newspaper")),
      p.date && h("span", { className: "lmn-date-pill" }, I("calendar_today"), p.date),
      p.book !== false && h("span", { className: "lmn-book", "aria-hidden": true }, I("menu_book")));
  }
  function NewsFeatured(p) {
    return h("a", { className: "lmn-card lmn-hover lmn-feat", href: p.href || "#" },
      h(NewsImage, { image: p.image, date: p.date }),
      h("div", { className: "lmn-feat-body" },
        h("span", { className: "lmn-tag" }, p.league),
        h("h3", { className: "lmn-feat-title lmn-t clamp-2", title: p.title }, p.title),
        p.excerpt && h("p", { className: "lmn-excerpt clamp-2" }, p.excerpt),
        h("span", { className: "lmn-link" }, "Дэлгэрэнгүй ›")));
  }
  function NewsCard(p) {
    return h("a", { className: "lmn-card lmn-hover lmn-ncard", href: p.href || "#" },
      h(NewsImage, { image: p.image, date: p.date }),
      h("div", { className: "lmn-ncard-body" },
        p.league && h("span", { className: "lmn-tag" }, p.league),
        h("h3", { className: "lmn-ncard-title lmn-t clamp-2", title: p.title }, p.title),
        h("span", { className: "lmn-link" }, "Дэлгэрэнгүй ›")));
  }
  function NewsRow(p) {
    return h("a", { className: "lmn-row", href: p.href || "#" },
      h("span", { className: "lmn-thumb" }, p.image ? h("img", { src: p.image, alt: "", loading: "lazy" }) : I("newspaper")),
      h("span", null, h("h4", { className: "lmn-row-title lmn-t clamp-2", title: p.title }, p.title), h("span", { className: "lmn-meta" }, p.date + " · " + p.league)),
      I("chevron_right", { className: "mi lmn-chev" }));
  }
  function NewsList(p) {
    var items = p.items || [];
    return h("div", { className: "lmn-card" },
      p.title && h("div", { className: "lmn-panel-h" }, h("h3", null, p.title)),
      items.length ? h("div", { className: "lmn-list" }, items.map(function (n, i) { return h(NewsRow, Object.assign({ key: i }, n)); }))
        : h(EmptyState, { icon: "newspaper", title: "Мэдээ байхгүй байна", compact: true }),
      p.linkLabel !== false && items.length > 0 && h("div", { className: "lmn-card-foot" }, h("a", { className: "lmn-link", href: "#" }, p.linkLabel || "Бүх мэдээ →")));
  }

  /* ---------- sidebar ---------- */
  function LeagueRow(p) {
    var pct = Math.round(100 * p.finished / Math.max(p.total, 1));
    return h("a", { className: "lmn-prow", href: p.href || "#", style: { "--lc": p.color || "var(--accent)" } },
      h("span", { className: "lmn-ltile" }, p.logo ? h("img", { src: p.logo, alt: "" }) : h("span", null, p.abbr)),
      h("span", { style: { minWidth: 0 } },
        h("h4", { className: "lmn-lname lmn-t", title: p.name }, p.name),
        h("span", { className: "lmn-lseason", style: { display: "block" } }, p.season),
        h("span", { className: "lmn-progress", role: "progressbar", "aria-valuenow": p.finished, "aria-valuemin": 0, "aria-valuemax": p.total, "aria-label": "Болсон тоглолт", style: { display: "block" } }, h("i", { style: { width: pct + "%" } })),
        h("span", { className: "lmn-pnum" }, h("b", null, p.finished + "/" + p.total), " · " + p.teams + " баг")),
      I("chevron_right", { className: "mi lmn-chev" }));
  }
  function Panel(p) {
    return h("section", { className: "lmn-card" },
      h("div", { className: "lmn-panel-h" }, h("h3", null, p.title), p.live && h("span", { className: "lmn-pulse", role: "img", "aria-label": "Шууд" })),
      p.empty ? p.empty : h("div", { className: "lmn-panel-body" }, p.children),
      !p.empty && p.footLabel && h("div", { className: "lmn-card-foot" }, h("a", { className: "lmn-link", href: "#" }, p.footLabel)));
  }
  function LeaguesPanel(p) {
    var ls = p.leagues || [];
    return h(Panel, { title: "Явагдаж буй лигүүд", live: ls.length > 0, footLabel: "Бүх лиг ›",
      empty: !ls.length && h(EmptyState, { icon: "emoji_events", title: "Одоогоор явагдаж буй лиг алга", text: "Шинэ улирал эхлэхэд энд харагдана.", compact: true }) },
      ls.map(function (l, i) { return h(LeagueRow, Object.assign({ key: i }, l)); }));
  }
  function UpcomingRow(p) {
    return h("a", { className: "lmn-prow", href: p.href || "#" },
      h("span", { className: "lmn-dt" }, h("b", null, p.day), h("span", null, p.time)),
      h("span", { style: { minWidth: 0 } }, h("p", { className: "lmn-vs lmn-t" }, p.home, h("span", null, "vs"), p.away), h("span", { className: "lmn-lseason", style: { display: "block" } }, p.league)),
      I("chevron_right", { className: "mi lmn-chev" }));
  }
  function UpcomingPanel(p) {
    var gs = p.games || [];
    return h(Panel, { title: "Удахгүй болох тоглолтууд", footLabel: "Бүх хуваарь ›",
      empty: !gs.length && h(EmptyState, { icon: "event_busy", title: "Товлогдсон тоглолт алга", compact: true }) },
      gs.map(function (g, i) { return h(UpcomingRow, Object.assign({ key: i }, g)); }));
  }

  /* ---------- feedback / chrome ---------- */
  function EmptyState(p) {
    return h("div", { className: cx("lmn-empty", p.compact && "is-compact") },
      h("span", { className: "lmn-empty-ic" }, I(p.icon || "inbox")), h("b", null, p.title), p.text && h("p", null, p.text), p.action);
  }
  var FB = "M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 3.9v2.3H8v3h2.5V21h3z";
  function Footer() {
    function col(t, items) { return h("div", null, h("h4", null, t), h("ul", null, items.map(function (x) { return h("li", { key: x }, h("a", { href: "#" }, x)); }))); }
    return h("footer", { className: "lmn-footer" },
      h("div", { className: "lmn-footer-in" },
        h("div", null, h(Logo), h("p", null, "Монголын сагсан бөмбөгийн лигүүдийн тоглолт, хүснэгт, статистик, мэдээ нэг дороос."),
          h("a", { className: "lmn-fb", href: "#" }, h("svg", { viewBox: "0 0 24 24", "aria-hidden": true }, h("path", { d: FB })), "Facebook")),
        col("Платформ", ["Мэдээ", "Тоглолтууд", "Лигүүд"]),
        col("Мэдээлэл", ["Бидний тухай", "Холбоо барих", "Нэвтрэх"])),
      h("div", { className: "lmn-copy" }, "© 2026 LeagueMN. Бүх эрх хуулиар хамгаалагдсан."));
  }

  /* ---------- sample data (previews only — not product data) ---------- */
  function svg(s) { return "data:image/svg+xml;charset=utf-8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" preserveAspectRatio="xMidYMid slice">' + s + "</svg>"); }
  var ball = function (x, y, r) { return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="#e8601c"/><g fill="none" stroke="#3a1a08" stroke-width="' + r / 14 + '"><path d="M' + (x - r) + " " + y + "H" + (x + r) + '"/><path d="M' + x + " " + (y - r) + "V" + (y + r) + '"/><path d="M' + (x - r * .7) + " " + (y - r * .7) + "Q" + (x - r * .25) + " " + y + " " + (x - r * .7) + " " + (y + r * .7) + '"/><path d="M' + (x + r * .7) + " " + (y - r * .7) + "Q" + (x + r * .25) + " " + y + " " + (x + r * .7) + " " + (y + r * .7) + '"/></g>'; };
  var COVERS = [
    svg('<defs><radialGradient id="g" cx=".5" cy="0" r="1"><stop offset="0" stop-color="#3b3f63"/><stop offset="1" stop-color="#11121c"/></radialGradient><linearGradient id="f" y2="1" x2="0"><stop offset="0" stop-color="#b8743a"/><stop offset="1" stop-color="#6e3d17"/></linearGradient></defs><rect width="640" height="360" fill="url(#g)"/><path d="M0 250 L640 250 L640 360 L0 360z" fill="url(#f)"/><g stroke="#f3e3cc" stroke-opacity=".5" stroke-width="3" fill="none"><path d="M120 360 L230 250 M520 360 L410 250"/><ellipse cx="320" cy="300" rx="120" ry="30"/></g><g fill="#fff" opacity=".08"><circle cx="90" cy="40" r="60"/><circle cx="550" cy="30" r="80"/></g>' + ball(320, 170, 70)),
    svg('<rect width="640" height="360" fill="#1d3b6e"/><rect width="640" height="360" fill="#0b1a33" opacity=".35"/><rect x="230" y="40" width="180" height="120" rx="6" fill="none" stroke="#e9eef8" stroke-width="8"/><rect x="290" y="95" width="60" height="45" fill="none" stroke="#e9eef8" stroke-width="5"/><ellipse cx="320" cy="170" rx="42" ry="8" fill="none" stroke="#e8601c" stroke-width="7"/><g stroke="#e9eef8" stroke-width="2" opacity=".8"><path d="M282 172 L296 230 M300 175 L308 232 M320 178 V234 M340 175 L332 232 M358 172 L344 230"/></g>' + ball(470, 270, 46)),
    svg('<rect width="640" height="360" fill="#c58a4d"/><g stroke="#8a5528" stroke-opacity=".25" stroke-width="2">' + Array.apply(null, Array(16)).map(function (_, i) { return '<path d="M0 ' + (i * 24) + ' H640"/>'; }).join("") + '</g><g fill="none" stroke="#fff" stroke-width="5" opacity=".9"><path d="M320 0 V360"/><circle cx="320" cy="180" r="60"/><path d="M0 110 H150 V250 H0"/><path d="M640 110 H490 V250 H640"/><path d="M0 40 A 220 220 0 0 1 0 320" transform="translate(40 0)"/></g>' + ball(220, 180, 34)),
    svg('<rect width="640" height="360" fill="#2b1f4a"/><g fill="#a98bf0" opacity=".35">' + Array.apply(null, Array(60)).map(function (_, i) { return '<circle cx="' + (i * 53 % 640) + '" cy="' + (30 + (i * 37 % 140)) + '" r="' + (6 + i % 5) + '"/>'; }).join("") + '</g><rect y="220" width="640" height="140" fill="#7a4a24"/><path d="M0 220 H640" stroke="#fff" stroke-width="4" opacity=".7"/>' + ball(480, 150, 54)),
    svg('<rect width="640" height="360" fill="#0e3b3b"/><circle cx="320" cy="400" r="260" fill="#14595a"/><circle cx="320" cy="400" r="160" fill="none" stroke="#e9f6f6" stroke-width="6" opacity=".7"/><path d="M0 360 L640 360" stroke="#fff"/>' + ball(320, 150, 60))
  ];
  var LONG = "Хан-Уул Хүлэгүүд сүүлийн секундэд гурван онооны шидэлтээр Бодь Старсыг ялж, MCBA-ийн улирлын тэргүүлэгч боллоо";
  var demo = {
    cover: function (i) { return COVERS[i % COVERS.length]; },
    results: [
      { date: "10.26", league: "MCBA", home: { abbr: "HKH", name: "Хан-Уул Хүлэгүүд", score: 86, color: "#b94810" }, away: { abbr: "BST", name: "Бодь Старс", score: 79, color: "#2563a8" } },
      { date: "10.26", league: "Friends Basketball League", home: { abbr: "NTG", name: "Нийслэл Тайгерс", score: 71, color: "#1b1c24" }, away: { abbr: "DUN", name: "Дархан Юнайтед", score: 74, color: "#7c4dcc" } },
      { date: "10.25", league: "Үвс лиг", home: { abbr: "SCH", name: "Сэлэнгэ Чонос", score: 102, color: "#0e7474" }, away: { abbr: "EMN", name: "Эрдэнэт Майнерс", score: 98, color: "#8a6508" } },
      { date: "10.25", league: "MCBA", home: { abbr: "UBW", name: "УБ Вольвс", score: 64, color: "#4b4f63" }, away: { abbr: "HKH", name: "Хан-Уул Хүлэгүүд", score: 81, color: "#b94810" } },
      { date: "10.24", league: "Оюутны лиг", home: { abbr: "MUS", name: "МУИС", score: 55, color: "#2563a8" }, away: { abbr: "SHU", name: "ШУТИС", score: 58, color: "#17793f" } },
      { date: "10.24", league: "Friends Basketball League", home: { abbr: "BST", name: "Бодь Старс", score: 90, color: "#2563a8" }, away: { abbr: "NTG", name: "Нийслэл Тайгерс", score: 77, color: "#1b1c24" } }
    ],
    featured: { league: "MCBA", date: "2026.10.27", title: LONG, excerpt: "Тоглолтын төгсгөлд 2 оноогоор хоцорч байсан Хүлэгүүдийн хамгаалагч 0.8 секунд үлдээд шидэлт хийж, 6000 үзэгчтэй танхимыг хөл дээр нь босгосон юм. Ингэснээр баг улирлын 10 дахь ялалтаа байгууллаа.", image: COVERS[0] },
    pair: [
      { league: "Оюутны лиг", date: "2026.10.26", title: "Оюутны лигийн 2026–2027 оны улирлын хуваарь албан ёсоор гарлаа", image: COVERS[1] },
      { league: "Үвс лиг", date: "2026.10.25", title: "Үвс лигийн аварга Сэлэнгэ Чонос шинэ улиралд бэлтгэлээ эхлүүллээ", image: null }
    ],
    list: [
      { title: "Бодь Старс шинэ ахлах дасгалжуулагчтай боллоо", date: "2026.10.25", league: "MCBA", image: COVERS[2] },
      { title: "Friends Basketball League-ийн 22 дахь улирлын 7 дахь долоо хоногийн шилдэг тоглогчид тодорлоо", date: "2026.10.24", league: "FBL", image: COVERS[3] },
      { title: "Эмэгтэй багуудын лиг ирэх сард нээлтээ хийнэ", date: "2026.10.23", league: "Үвс лиг", image: null },
      { title: "Дархан Юнайтед гурван тоглолт дараалан ялж, плей-оффын эрхээ баталгаажууллаа", date: "2026.10.22", league: "FBL", image: COVERS[4] },
      { title: "Танхимын засварын улмаас MCBA-ийн хоёр тоглолтын цаг өөрчлөгдлөө", date: "2026.10.21", league: "MCBA", image: COVERS[1] },
      { title: "Залуучуудын 3x3 тэмцээнд 40 гаруй баг бүртгүүллээ", date: "2026.10.20", league: "3x3", image: COVERS[2] }
    ],
    leagues: [
      { name: "MCBA", abbr: "MC", season: "Division 1 · 2026–2027", color: "var(--league-blue)", finished: 12, total: 30, teams: 8 },
      { name: "Friends Basketball League", abbr: "FB", season: "Season 22", color: "var(--league-orange)", finished: 29, total: 36, teams: 6 },
      { name: "Оюутны лиг", abbr: "ОЛ", season: "2026–2027 · Намар", color: "var(--league-violet)", finished: 4, total: 45, teams: 10 },
      { name: "Үвс лиг — Эмэгтэй", abbr: "ҮЛ", season: "2026 · Эмэгтэй", color: "var(--league-teal)", finished: 15, total: 19, teams: 6 }
    ],
    upcoming: [
      { day: "10.28", time: "19:00", home: "HKH", away: "NTG", league: "MCBA" },
      { day: "10.29", time: "18:30", home: "BST", away: "DUN", league: "Friends Basketball League" },
      { day: "10.30", time: "20:00", home: "MUS", away: "SHU", league: "Оюутны лиг" },
      { day: "11.01", time: "17:00", home: "SCH", away: "EMN", league: "Үвс лиг" }
    ]
  };

  window.LeagueMN = Object.assign(window.LeagueMN || {}, {
    Logo: Logo, Button: Button, ThemeToggle: ThemeToggle, SectionHeader: SectionHeader, NavBar: NavBar, BottomTabBar: BottomTabBar,
    ResultCard: ResultCard, ResultsStrip: ResultsStrip, NewsImage: NewsImage, NewsFeatured: NewsFeatured, NewsCard: NewsCard, NewsRow: NewsRow, NewsList: NewsList,
    LeagueRow: LeagueRow, LeaguesPanel: LeaguesPanel, UpcomingRow: UpcomingRow, UpcomingPanel: UpcomingPanel, EmptyState: EmptyState, Footer: Footer, Icon: I, demo: demo
  });
})();
