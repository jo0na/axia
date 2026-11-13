/* shell.js - logged-in pages: keeps visitors without an account out, draws the sidebar + profile menu */
(function () {
  const S = Axia.storage, user = S.currentUser();
  if (!user) { location.replace("login.html"); return; }
  const page = document.body.dataset.page, side = document.getElementById("side");
  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  const logo = el("a", "logo", "Axia"); logo.href = "start.html";
  const nav = el("nav"); nav.setAttribute("aria-label", "Main navigation");
  [["start", "Start", "start.html"], ["for-me", "For Me", "for-me.html"], ["for-someone", "For Someone", "for-someone.html"], ["settings", "Settings", "settings.html"]].forEach(function (l) {
    const a = el("a", "", l[1]); a.href = l[2]; if (l[0] === (page === "build" ? "start" : page)) a.setAttribute("aria-current", "page"); nav.append(a);
  });

  // ---- profile pill (bottom left) + pop-up menu: Hi, User! / Profile / Email & Password / Log Out ----
  const me = el("div", "me"), btn = el("button"), im = el("img"), menu = el("div", "menu");
  btn.type = "button"; btn.setAttribute("aria-haspopup", "true"); btn.setAttribute("aria-expanded", "false"); im.src = user.avatar; im.alt = "";
  btn.append(im, el("span", "name", user.username), el("span", "chev", "‹")); menu.hidden = true;
  const hi = el("div", "menu-hi"); hi.append(document.createTextNode("Hi, " + user.username + "!"), el("br"), document.createTextNode("What would you like to do?"));
  function item(label, href, icon) {
    const a = el(href ? "a" : "button", "mi"); if (href) a.href = href; else a.type = "button";
    const ic = el("img"); ic.src = icon; ic.alt = ""; a.append(ic, el("span", "", label)); if (href) a.append(el("span", "go", "›")); return a;
  }
  const out = item("Log Out", null, "../assets/icons/settings/log-out.jpg");
  out.onclick = function () { S.endSession(); location.href = "../index.html"; };
  menu.append(hi, item("Profile", "profile.html", user.avatar), item("Email & Password", "account.html", "../assets/icons/settings/change-email-password.jpg"), el("hr"), out);
  me.append(menu, btn);
  function setMenu(open) { menu.hidden = !open; btn.classList.toggle("open", open); btn.setAttribute("aria-expanded", open); }
  btn.onclick = function (e) { e.stopPropagation(); setMenu(menu.hidden); };
  document.addEventListener("click", function (e) { if (!me.contains(e.target)) setMenu(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });
  side.append(logo, nav, me);

  const top = document.getElementById("top-msg");
  if (top && page === "start") { const s = S.getSession(); top.textContent = s.isNew ? "Welcome!" : "Welcome back!"; }
  const yes = document.querySelectorAll("[data-for]");           // Start page: choose the purpose
  yes.forEach(function (b) { b.onclick = function () { location.href = "build.html?for=" + b.dataset.for; }; });
  const list = document.getElementById("pkg-list");               // For Me / For Someone pages
  if (list) {
    const pk = S.myPackages(user.email, document.body.dataset.purpose); let i = 0;
    const pager = document.getElementById("pager"), end = document.getElementById("end");
    function show() {
      list.replaceChildren(); end.hidden = true;
      if (!pk.length) { list.append(el("p", "end", "No packages yet. Go to Start to create your first one.")); pager.hidden = true; return; }
      const p = pk[i], types = {}, card = el("div", "pkg"), img = el("img"), body = el("div"), ul = el("ul");
      p.items.forEach(function (it) { types[it.type] = 1; });
      Object.keys(types).forEach(function (t) { ul.append(el("li", "", Axia.types[t].name)); });
      img.src = "../assets/images/gifts/" + (p.purpose === "me" ? "for-me-pink" : "for-someone-yellow") + ".png"; img.alt = "";
      const open = el("a", "bt", "Open"); open.href = "open.html?p=" + p.id;
      body.append(el("h2", "", p.title), el("p", "", "Items in this package:"), ul, el("strong", "", Object.keys(types).length + (Object.keys(types).length === 1 ? " Content type • " : " Content types • ") + p.items.length + (p.items.length === 1 ? " item included" : " items included")));
      card.append(img, body, open); list.append(card);
      prev.disabled = i === 0; next.disabled = i === pk.length - 1; end.hidden = i !== pk.length - 1; pager.hidden = false;
    }
    const prev = el("button", "bt", "◁"), next = el("button", "bt", "▷");
    prev.type = next.type = "button"; prev.setAttribute("aria-label", "Previous package"); next.setAttribute("aria-label", "Next package");
    prev.onclick = function () { i--; show(); }; next.onclick = function () { i++; show(); };
    pager.append(prev, next); show();
  }
})();