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
  if (top && page === "start") {
    // Start page greeting: brand-new account = "Welcome, Name!", returning account = "Welcome back, Name!"
    const s = S.getSession();
    top.textContent = (s.isNew ? "Welcome, " : "Welcome back, ") + user.username + "!";
    top.title = top.textContent;
  }
  const yes = document.querySelectorAll("[data-for]");           // Start page: choose the purpose
  yes.forEach(function (b) { b.onclick = function () { location.href = "build.html?for=" + b.dataset.for; }; });
  const list = document.getElementById("pkg-list");               // For Me / For Someone pages
  if (list) {
    const purposeKey = document.body.dataset.purpose; let pk = S.myPackages(user.email, purposeKey), i = 0, selecting = false, chosen = {};
    const pager = document.getElementById("pager"), end = document.getElementById("end");
    function summary(p) { const n = {}; p.items.forEach(function (it) { n[it.type] = 1; }); const k = Object.keys(n).length; return k + (k === 1 ? " Content type • " : " Content types • ") + p.items.length + (p.items.length === 1 ? " item included" : " items included"); }
    function reload() { pk = S.myPackages(user.email, purposeKey); if (i > pk.length - 1) i = Math.max(pk.length - 1, 0); }
    function remove(ids) {                                          // ask first, then delete one or many packages
      const many = ids.length > 1;
      if (!confirm((many ? "Delete these " + ids.length + " packages" : "Delete this package") + "? This cannot be undone, and any link you shared " + (many ? "for them" : "for it") + " will stop working.")) return false;
      if (!S.deletePackages(ids)) { Axia.toast("We couldn’t delete that. Please try again."); return false; }
      Axia.toast(many ? ids.length + " packages deleted." : "Package deleted."); return true;
    }
    function show() {
      if (selecting && pk.length) return showSelect();
      selecting = false; list.replaceChildren(); end.hidden = true;
      if (!pk.length) { list.append(el("p", "end", "No packages yet. Go to Start to create your first one.")); pager.hidden = true; return; }
      const p = pk[i], types = {}, card = el("div", "pkg"), img = el("img"), body = el("div"), ul = el("ul");
      p.items.forEach(function (it) { types[it.type] = 1; });
      Object.keys(types).forEach(function (t) { ul.append(el("li", "", Axia.types[t].name)); });
      img.src = "../assets/images/gifts/" + (p.purpose === "me" ? "for-me-pink" : "for-someone-yellow") + ".png"; img.alt = "";
      const open = el("a", "bt", "Open"); open.href = "open.html?p=" + p.id;
      body.append(el("h2", "", p.title), el("p", "", "Items in this package:"), ul, el("strong", "", summary(p)));
      const pick = el("button", "pk-act pk-select", "Select"), del = el("button", "pk-act pk-delete", "Delete");
      pick.type = del.type = "button"; pick.setAttribute("aria-label", "Select packages to delete"); del.setAttribute("aria-label", "Delete this package");
      pick.onclick = function () { selecting = true; chosen = {}; show(); };
      del.onclick = function () { if (remove([p.id])) { reload(); show(); } };
      card.append(img, body, open, pick, del); list.append(card);
      prev.disabled = i === 0; next.disabled = i === pk.length - 1; end.hidden = i !== pk.length - 1; pager.hidden = false;
    }
    function showSelect() {                                         // multi-select: tick packages, then delete them all at once
      list.replaceChildren(); end.hidden = true; pager.hidden = true;
      const wrap = el("div", "sel-wrap"), tools = el("div", "sel-tools"), rows = el("div", "sel-rows");
      const all = el("button", "pk-act", "Select all"), del = el("button", "pk-act pk-delete-sel", "Delete selected"), cancel = el("button", "pk-act", "Cancel");
      all.type = del.type = cancel.type = "button";
      const boxes = [];
      function count() { return pk.filter(function (p) { return chosen[p.id]; }).length; }
      function sync() { const n = count(); del.disabled = !n; del.textContent = n ? "Delete selected (" + n + ")" : "Delete selected"; all.textContent = n === pk.length ? "Clear selection" : "Select all"; }
      pk.forEach(function (p) {
        const row = el("label", "sel-row"), cb = el("input"), txt = el("span", "sel-txt");
        cb.type = "checkbox"; cb.checked = !!chosen[p.id]; cb.setAttribute("aria-label", "Select " + p.title);
        cb.onchange = function () { if (cb.checked) chosen[p.id] = true; else delete chosen[p.id]; sync(); };
        txt.append(el("b", "", p.title), el("small", "", summary(p))); row.append(cb, txt); rows.append(row); boxes.push([cb, p.id]);
      });
      all.onclick = function () { const every = count() === pk.length; chosen = {}; boxes.forEach(function (b) { b[0].checked = !every; if (!every) chosen[b[1]] = true; }); sync(); };
      del.onclick = function () { const ids = pk.filter(function (p) { return chosen[p.id]; }).map(function (p) { return p.id; }); if (ids.length && remove(ids)) { selecting = false; chosen = {}; reload(); show(); } };
      cancel.onclick = function () { selecting = false; chosen = {}; show(); };
      tools.append(all, del, cancel); wrap.append(tools, rows); list.append(wrap); sync();
    }
    const prev = el("button", "bt", "◁"), next = el("button", "bt", "▷");
    prev.type = next.type = "button"; prev.setAttribute("aria-label", "Previous package"); next.setAttribute("aria-label", "Next package");
    prev.onclick = function () { i--; show(); }; next.onclick = function () { i++; show(); };
    pager.append(prev, next); show();
  }
})();