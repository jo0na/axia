/* builder.js - guest workspace: pick content, fill popups, invoice, review, seal + share link.
   Also exposes Axia.render(item) so pages/open.html can show a sealed package.
   Safe by design: all user text goes through textContent, links must be http(s). */
(function () {
  const I = "../assets/images/content/";
  const MSG = ["msg", "Additional Message (Optional)", "area"];
  // [id, tile label, invoice name (plural), picture, fields]; field = [key, label, kind, required]
  const CATS = [
    ["Something Personal", [
      ["letter", "Letter", "Letter", "personal/letter", [["text", "", "area", 1]]],
      ["photo", "Photo", "Photo", "personal/photo", [["file", "Max file size: 5MB", "image", 1], ["caption", "Add a caption (Optional)", "text"], ["msg", "Additional Message (Optional)", "text"]]],
      ["video", "Video", "Video", "personal/video", [["title", "Title", "text", 1], ["link", "Video Link (https://...)", "url", 1], MSG]],
      ["voice", "Voice Note", "Voice Notes", "personal/voice-notes", [["file", "", "rec", 1], MSG]],
      ["drawing", "Drawing", "Drawing", "personal/drawing", [["file", "", "draw", 1], ["msg", "Additional Message (Optional)", "text"]]]]],
    ["Something Useful", [
      ["note", "Notes", "Notes & Study Materials", "useful/notes", [["title", "Note Title", "text", 1], ["text", "Write your note here...", "area", 1]]],
      ["reviewer", "Reviewer", "Reviewer", "useful/reviewer", [["file", "Attach photos of the written reviewers", "image", 1], ["caption", "Add a caption (Optional)", "text"], ["msg", "Additional Message (Optional)", "text"]]],
      ["guide", "Guide", "Guide", "useful/guide", [["title", "Location", "text", 1], ["link", "Apple / Google Map Link (https://maps.google.com)", "url", 1], MSG]],
      ["tip", "Tips", "Tip", "useful/tips", [["title", "Tip Title", "text", 1], ["text", "Write your tip here", "area", 1], MSG]],
      ["checklist", "Checklist", "Checklist", "useful/checklist", [["title", "Checklist Title", "text", 1], ["text", "", "checklist", 1]]],
      ["file", "File", "File", "useful/file", [["file", "Add documents or other useful resources", "any", 1], ["caption", "Give this file a short caption (Optional)", "text"], ["msg", "Additional Message (Optional)", "text"]]]]],
    ["Recommendations they might enjoy", [
      ["book", "Book", "Book Recommendation", "recommendations/books", [["title", "Book Title", "text", 1], ["file", "Attach an EPUB, MOBI, PDF, or TXT file of the book or novel you’re recommending.", "any", 0, ".epub,.mobi,.pdf,.txt"], ["genre", "Book Genre (Fantasy, Adventure, Horror...)", "text"], ["text", "Short summary: why it’s worth reading (Optional)", "area"]]],
      ["song", "Song", "Song Recommendation", "recommendations/songs", [["title", "Song Title", "text", 1], ["link", "Song Link (Spotify, Apple Music, YouTube Music...)", "url", 1], MSG]],
      ["movie", "Movie", "Movie Recommendation", "recommendations/movie", [["title", "Movie Title", "text", 1], ["genre", "Movie Genre (Sci-Fi, Documentary, Action...)", "text"], ["link", "Paste a streaming link (https://...)", "url"], ["text", "A short synopsis of the movie (Optional)", "area"]]],
      ["cafe", "Cafe", "Cafe Recommendation", "recommendations/cafe", [["title", "Cafe Name", "text", 1], ["link", "Location (Apple / Google Maps link)", "url", 1], ["text", "What to try (Iced latte, cheesecake...)", "text"], MSG]],
      ["place", "Place", "Place Recommendation", "recommendations/place", [["title", "Place Name", "text", 1], ["link", "Location (Apple / Google Maps link)", "url", 1], ["text", "What can you do or see here?", "text"], MSG]]]],
    ["Something Special", [
      ["coupon", "Coupon", "Coupon", "special/coupon", [["title", "Coupon Title", "text", 1], ["file", "Upload an image of the coupon", "image"], ["link", "...or paste a link (https://...)", "url"], ["date", "Expiry date (Optional)", "date"], MSG]],
      ["ticket", "Ticket", "Ticket", "special/ticket", [["title", "Ticket Title", "text", 1], ["file", "Upload an image of the ticket", "image"], ["link", "...or paste a link (https://...)", "url"], ["date", "Date and time of the event", "datetime-local"], MSG]],
      ["clip", "Newspaper clip", "Newspaper Clip", "special/newspaper-clip", [["title", "News Headline", "text", 1], ["file", "Upload a photo of the clipping", "image"], ["link", "...or paste the article link (https://...)", "url"], MSG]],
      ["memory", "Memory", "Memory", "special/memories", [["title", "Memory Title (Optional)", "text"], ["file", "Attach a photo", "image", 1], ["text", "Describe this memory (Optional)", "area"]]],
      ["card", "Custom Card", "Custom Card", "special/custom-card", [["card", "", "idcard", 1]]],
      ["flower", "Flower", "Flower", "special/flower", [["text", "", "flower", 1]]]]]
  ];
  const TYPES = {};
  CATS.forEach(function (c) { c[1].forEach(function (t) { TYPES[t[0]] = { id: t[0], label: t[1], name: t[2], img: I + t[3] + ".png", fields: t[4] }; }); });
  const MAX = 10, LETTER = "Dear Someone,\n\n\n\nKind Regards,\nSomeone Else";

  // ---------- tiny helpers ----------
  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function safeUrl(u) { try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x.href : ""; } catch (e) { return ""; } }
  function toast(msg) { const t = el("div", "toast", msg); t.setAttribute("role", "status"); document.body.append(t); setTimeout(function () { t.remove(); }, 2600); }
  function readFile(file) { return new Promise(function (ok, no) { const r = new FileReader(); r.onload = function () { ok(r.result); }; r.onerror = no; r.readAsDataURL(file); }); }
  function shrink(url) { // keep stored images small so localStorage does not fill up
    return new Promise(function (ok) {
      const img = new Image();
      img.onload = function () { const s = Math.min(1, 900 / Math.max(img.width, img.height)), c = document.createElement("canvas"); c.width = img.width * s; c.height = img.height * s; c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); ok(c.toDataURL("image/jpeg", 0.72)); };
      img.onerror = function () { ok(url); }; img.src = url;
    });
  }
  function link(url, text) { const a = el("a", "", text || url); a.href = safeUrl(url) || "#"; a.target = "_blank"; a.rel = "noopener noreferrer"; return a; }

  // ---------- bouquet: one flower per letter (repeats allowed), like a hand-tied bouquet ----------
  // FL[letter] = [where the stem touches the bottom edge (0-1 across), picture width, picture height, how far the
  // picture already leans (degrees) so every flower can be stood up before it is fanned out].
  // Every flower is turned around its own stem base, and all stem bases are lined up side by side at the bottom
  // centre, so the stems bunch together while the heads fan out. The whole bunch is scaled to always fit inside the frame.
  const FL = {"a":[0.342,284,500,4.1],"b":[0.775,325,500,-15.1],"c":[0.728,391,500,-16.0],"d":[0.513,153,500,-0.9],"e":[0.618,182,474,-1.9],"f":[0.563,414,423,3.8],"g":[0.019,160,500,11.5],"h":[0.038,236,500,18.3],"i":[0.464,182,500,0.3],"j":[0.982,363,500,-27.7],"k":[0.538,306,500,3.4],"l":[0.509,214,500,-0.5],"m":[0.89,218,500,-15.1],"n":[0.695,159,500,-2.4],"o":[0.32,500,321,22.6],"p":[0.187,500,458,28.8],"q":[0.619,164,500,-2.0],"r":[0.032,295,500,19.7],"s":[0.41,346,500,7.5],"t":[0.39,427,500,5.8],"u":[0.54,201,500,-0.7],"v":[0.36,146,500,2.6],"w":[0.079,491,500,34.3],"x":[0.531,261,500,-0.6],"y":[0.706,293,396,-11.3],"z":[0.477,149,500,0.1]};
  function bouquet(box, letters, bw, bh) {
    box.replaceChildren(); bw = bw || 250; bh = bh || 290;
    const n = letters.length; if (!n) return;
    const step = Math.min(9, 34 / Math.max(n - 1, 1)), s0 = bh * 0.68 / 500;           // px per picture pixel before fitting
    const items = letters.map(function (L, i) {
      const d = FL[L.toLowerCase()], mid = (i - (n - 1) / 2), t = n === 1 ? 0 : mid / ((n - 1) / 2), a = (mid * step - d[3]) * Math.PI / 180;
      const w = d[1] * s0, h = d[2] * s0, sx = d[0] * w, off = mid * 4;                  // stems sit 4px apart
      const xs = [-sx, w - sx], ys = [-h, 0]; let lo = 1e9, hi = -1e9, up = 0;
      xs.forEach(function (x) { ys.forEach(function (y) { const X = x * Math.cos(a) - y * Math.sin(a) + off, Y = x * Math.sin(a) + y * Math.cos(a); lo = Math.min(lo, X); hi = Math.max(hi, X); up = Math.max(up, -Y); }); });
      return { L: L, d: d, a: a, t: t, off: off, lo: lo, hi: hi, up: up };
    });
    const maxX = Math.max.apply(null, items.map(function (o) { return Math.max(Math.abs(o.lo), Math.abs(o.hi)); })), up = Math.max.apply(null, items.map(function (o) { return o.up; }));
    const k = Math.min(2, (bw * 0.46) / maxX, (bh * 0.88) / up);
    items.forEach(function (o) {
      const im = el("img"), sx = o.d[0] * 100;
      im.src = "../assets/images/flowers/" + o.L.toLowerCase() + ".png"; im.alt = "";
      im.style.bottom = Math.max(bh * 0.03, (bh - up * k) / 2) + "px";                      // keep the bunch centred in the frame
      im.style.height = (o.d[2] * s0 * k) + "px"; im.style.transformOrigin = sx + "% 100%"; im.style.zIndex = 100 - Math.round(Math.abs(o.t) * 50);
      im.style.transform = "translateX(calc(-" + sx + "% + " + (o.off * k) + "px)) rotate(" + (o.a * 180 / Math.PI) + "deg)";
      box.append(im);
    });
  }
  const SIL = "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#fff"/><circle cx="50" cy="38" r="15" fill="#868a99"/><path d="M18 100c0-22 14-34 32-34s32 12 32 34z" fill="#868a99"/></svg>');
  function prettyDate(v) { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || ""); return m ? new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : (v || ""); }
  function idCard(d) { // the ID-style custom card (matches the Add Custom Card mockup)
    const c = el("div", "idc"), top = el("div", "idc-top"), pic = el("img", "idc-pic"), f = el("div", "idc-fields");
    pic.src = d.file || SIL; pic.alt = "";
    [["Issued to", d.who], ["Date of birth", prettyDate(d.dob)], ["Date of issue", prettyDate(d.issued)]].forEach(function (r) { if (r[1]) { const p = el("p"); p.append(el("b", "", r[0] + ": "), document.createTextNode(r[1])); f.append(p); } });
    top.append(pic, f); c.append(el("div", "idc-head", d.title || "Custom Card"), top);
    if (d.text) { c.append(el("hr"), el("p", "idc-msg", d.text)); }
    return c;
  }
  // ---------- popup widgets: drawing canvas, voice recorder, flower letters ----------
  function widget(kind, values, m) {
    const w = el("div", "wdg");
    if (kind === "draw") {
      m.classList.add("draw-modal");
      const c = el("canvas"), cx = c.getContext("2d"), col = el("input"), size = el("input"), bar = el("div", "tools"); let down = false, drawn = false; const hist = [];
      c.width = 386; c.height = 218; c.className = "sketch"; cx.fillStyle = "#fff"; cx.fillRect(0, 0, 386, 218); cx.lineCap = cx.lineJoin = "round";
      col.type = "color"; col.value = "#ffd803"; col.setAttribute("aria-label", "Pen color"); size.type = "range"; size.min = 1; size.max = 30; size.value = 4; size.setAttribute("aria-label", "Pen size"); const fill = function () { size.style.setProperty("--p", ((size.value - size.min) / (size.max - size.min) * 100) + "%"); }; size.addEventListener("input", fill); fill();
      if (/^data:image/.test(values.file || "")) { const im = new Image(); im.onload = function () { cx.drawImage(im, 0, 0, 386, 218); drawn = true; }; im.src = values.file; }
      function pt(e) { const r = c.getBoundingClientRect(); return [(e.clientX - r.left) * c.width / r.width, (e.clientY - r.top) * c.height / r.height]; }
      function snap() { hist.push(cx.getImageData(0, 0, 386, 218)); if (hist.length > 40) hist.shift(); undo.disabled = false; }
      c.onpointerdown = function (e) { snap(); down = true; drawn = true; c.setPointerCapture(e.pointerId); const q = pt(e); cx.strokeStyle = col.value; cx.lineWidth = size.value; cx.beginPath(); cx.moveTo(q[0], q[1]); cx.lineTo(q[0] + .1, q[1]); cx.stroke(); };
      c.onpointermove = function (e) { if (!down) return; const q = pt(e); cx.lineTo(q[0], q[1]); cx.stroke(); };
      c.onpointerup = c.onpointercancel = function () { down = false; };
      const undo = el("button", "bt tool", "Undo"), clr = el("button", "bt tool", "Clear"); undo.type = clr.type = "button"; undo.disabled = true; undo.setAttribute("aria-label", "Undo last stroke");
      undo.onclick = function () { const h = hist.pop(); if (h) cx.putImageData(h, 0, 0); undo.disabled = !hist.length; if (!hist.length && !values.file) drawn = false; };
      clr.onclick = function () { snap(); cx.fillStyle = "#fff"; cx.fillRect(0, 0, 386, 218); drawn = false; };
      w.undoKey = function (e) { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); undo.onclick(); } };
      document.addEventListener("keydown", w.undoKey); w.stop = function () { document.removeEventListener("keydown", w.undoKey); };
      bar.append(el("span", "", "Colour"), col, el("span", "", "Size"), size); const bar2 = el("div", "tools"); bar2.append(undo, clr); w.append(el("p", "lbl", "Draw your sketch"), c, bar, bar2);
      w.get = function () { return drawn ? { file: c.toDataURL("image/png"), fileName: "drawing.png" } : null; }; w.miss = "Please draw your sketch first.";
    } else if (kind === "idcard") {
      let photo = values.file || "", fileName = values.fileName || ""; m.classList.add("card-modal");
      const c = el("div", "idc"), title = el("textarea", "idc-title"), top = el("div", "idc-top"), pic = el("img", "idc-pic"), left = el("div"), pick = el("input"), addp = el("button", "bt idc-add", "Add a photo (Optional)"), f = el("div", "idc-fields"), msg = el("textarea", "idc-msg-in");
      title.maxLength = 60; title.placeholder = "Card Title\n(e.g., Special Travel Card)"; title.addEventListener("keydown", function (e) { if (e.key === "Enter") e.preventDefault(); }); title.value = values.title || ""; title.setAttribute("aria-label", "Card Title");
      pic.src = photo || SIL; pic.alt = "Card photo"; pick.type = "file"; pick.accept = "image/*"; pick.hidden = true; addp.type = "button";
      addp.onclick = function () { pick.click(); };
      pick.onchange = async function () { const file = pick.files[0]; if (!file) return; if (file.size > 5 * 1024 * 1024) { addp.textContent = "File is over 5MB. Please choose a smaller photo."; return; } photo = await shrink(await readFile(file)); fileName = file.name; pic.src = photo; addp.textContent = "Change photo"; };
      function field(label, key, type, ph) { const l = el("label"), i = el("input"); i.type = type; i.value = values[key] || ""; if (ph) i.placeholder = ph; i.setAttribute("aria-label", label); l.append(el("b", "", label + ": "), i); f.append(l); return i; }
      const who = field("Issued to", "who", "text", "Name"), dob = field("Date of birth", "dob", "date"), iss = field("Date of issue", "issued", "date");
      msg.placeholder = "Card Message (Optional)"; msg.value = values.text || ""; msg.setAttribute("aria-label", "Card Message");
      left.append(pic, addp, pick); top.append(left, f); c.append(title, top, el("hr"), msg); w.append(c);
      w.get = function () { const t = title.value.trim(); if (!t) return null; const d = { title: t }; if (who.value.trim()) d.who = who.value.trim(); if (dob.value) d.dob = dob.value; if (iss.value) d.issued = iss.value; if (msg.value.trim()) d.text = msg.value.trim(); if (photo) { d.file = photo; d.fileName = fileName || "card-photo"; } return d; };
      w.miss = "Please give your card a title.";
    } else if (kind === "checklist") {
      const list = el("div", "cklist"), more = el("button", "bt tool", "Add more"), lines = (values.text || "").split("\n").filter(Boolean);
      function row(v) {
        const r = el("div", "ckrow"), inp = el("input"), x = el("button", "ckx", "×");
        inp.type = "text"; inp.value = v; inp.maxLength = 120; inp.placeholder = "Item " + (list.children.length + 1); inp.setAttribute("aria-label", "Checklist item");
        x.type = "button"; x.setAttribute("aria-label", "Remove item"); x.onclick = function () { if (list.children.length > 1) r.remove(); };
        r.append(el("span", "ckbox"), inp, x); list.append(r); return inp;
      }
      (lines.length ? lines : ["", "", ""]).forEach(row); more.type = "button"; more.onclick = function () { row("").focus(); };
      const frame = el("div", "ckframe"); frame.append(list, more); w.append(el("p", "lbl", "Checklist Items"), frame);
      w.get = function () { const v = Array.prototype.map.call(list.querySelectorAll("input"), function (i) { return i.value.trim(); }).filter(Boolean); return v.length ? { text: v.join("\n") } : null; };
      w.miss = "Add at least one checklist item.";
    } else if (kind === "rec") {
      const btn = el("button", "bt", "Start Recording"), au = el("audio"), st = el("p", "hint"); let mr = null, data = values.file || "", chunks = [], timer = 0; btn.type = "button"; au.controls = true; au.hidden = !data; au.src = data;
      w.stop = function () { clearTimeout(timer); if (mr && mr.state === "recording") { mr.onstop = null; mr.stream.getTracks().forEach(function (t) { t.stop(); }); mr.stop(); } };
      btn.onclick = async function () {
        if (mr && mr.state === "recording") return mr.stop();
        if (!navigator.mediaDevices || !window.MediaRecorder) return void (st.textContent = "Recording is not supported in this browser.");
        try { const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); chunks = []; mr = new MediaRecorder(stream);
          mr.ondataavailable = function (e) { chunks.push(e.data); };
          mr.onstop = async function () { clearTimeout(timer); stream.getTracks().forEach(function (t) { t.stop(); }); data = await readFile(new Blob(chunks, { type: mr.mimeType })); au.src = data; au.hidden = false; btn.textContent = "Record Again"; st.textContent = ""; };
          mr.start(); btn.textContent = "Stop Recording"; st.textContent = "Recording… (up to 60 seconds)"; timer = setTimeout(function () { if (mr.state === "recording") mr.stop(); }, 60000);
        } catch (e) { st.textContent = "We couldn’t use the microphone. Please allow access and try again."; }
      };
      w.append(btn, au, st); w.classList.add("recbox");
      w.get = function () { return data && data.length < 1500000 ? { file: data, fileName: "voice-note" } : null; }; w.miss = "Please record a voice note first (up to 60 seconds).";
    } else {
      const MAXF = 12, prev = el("div", "bq-box"), grid = el("div", "lgrid"), row = el("div", "fl"), side = el("div"), word = el("div", "wordrow"), chips = el("div", "chips"), on = (values.text || "").toUpperCase().split("").filter(function (L) { return /[A-Z]/.test(L); }).slice(0, MAXF), btns = {}, hint = el("p", "hint");
      const del = el("button", "bt tool", "⌫ Delete"), clr = el("button", "bt tool", "Clear all"); del.type = clr.type = "button"; del.setAttribute("aria-label", "Delete last letter");
      function paint() {
        bouquet(prev, on, 286, 304);
        Object.keys(btns).forEach(function (L) { const k = on.filter(function (x) { return x === L; }).length; btns[L].classList.toggle("on", k > 0); btns[L].setAttribute("aria-pressed", k > 0); btns[L].dataset.n = k > 1 ? k : ""; });
        chips.replaceChildren(); on.forEach(function (L, i) { const c = el("button", "chip", L); c.type = "button"; c.title = "Remove this letter"; c.setAttribute("aria-label", "Remove " + L); c.onclick = function () { on.splice(i, 1); paint(); }; chips.append(c); });
        del.disabled = clr.disabled = !on.length; hint.style.visibility = on.length ? "" : "hidden"; hint.textContent = on.length >= MAXF ? "A bouquet can hold up to " + MAXF + " flowers." : on.length + " flower" + (on.length === 1 ? "" : "s");
      }
      function add(L) { if (on.length >= MAXF) return paint(); on.push(L); paint(); }
      del.onclick = function () { on.pop(); paint(); }; clr.onclick = function () { on.length = 0; paint(); };
      "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").forEach(function (L) { const b = el("button", "lt", L); b.type = "button"; b.onclick = function () { add(L); }; btns[L] = b; grid.append(b); });
      function key(e) {
        if (e.ctrlKey || e.metaKey || /INPUT|TEXTAREA/.test(e.target.tagName)) return;
        if (/^[a-z]$/i.test(e.key)) add(e.key.toUpperCase()); else if (e.key === "Backspace") { e.preventDefault(); on.pop(); paint(); }
      }
      document.addEventListener("keydown", key); w.stop = function () { document.removeEventListener("keydown", key); };
      const acts = el("div", "wacts"); acts.append(del, clr); word.append(chips, acts);
      side.append(el("p", "lbl", "CHOOSE LETTERS"), grid, word, hint); row.append(prev, side); w.append(row); paint(); m.classList.add("wide");
      w.get = function () { return on.length ? { text: on.join("") } : null; }; w.miss = "Choose at least one letter.";
    }
    return w;
  }

  // ---------- show one item (used by Open, review and open.html) ----------
  function render(item) {
    const d = item.data, box = el("div", "vitem"), t = TYPES[item.type];
    if (item.type === "card") { box.append(idCard(d)); return box; }
    box.append(el("h3", "", d.title || t.name));
    if (item.type === "flower") { const bq = el("div", "bq-box big"); bouquet(bq, d.text.split(""), 300, 300); box.append(bq); }
    else if (item.type === "checklist") d.text.split("\n").filter(Boolean).forEach(function (line) { const l = el("label"), c = el("input"); c.type = "checkbox"; l.append(c, " " + line); l.style.display = "block"; box.append(l); });
    else if (d.text) { const p = el("pre", "", d.text); box.append(p); }
    if (d.file) {
      if (/^data:image/.test(d.file)) { const im = el("img"); im.src = d.file; im.alt = d.caption || t.name; box.append(im); }
      else if (/^data:audio/.test(d.file)) { const a = el("audio"); a.controls = true; a.src = d.file; box.append(a); }
      else if (/^data:/.test(d.file)) { const a = el("a", "", "Download " + (d.fileName || "file")); a.href = d.file; a.download = d.fileName || "file"; box.append(a); }
    } else if (d.fileName) box.append(el("p", "", "Attached: " + d.fileName));
    if (d.link) box.append(link(d.link));
    ["genre", "who", "dob", "issued", "date", "caption", "msg"].forEach(function (k) { if (d[k]) box.append(el("p", "", (k === "msg" || k === "caption" ? "" : k + ": ") + d[k])); });
    return box;
  }
  window.Axia = window.Axia || {};
  Axia.render = render; Axia.types = TYPES; Axia.toast = toast; Axia.safeUrl = safeUrl;

  const stage = document.getElementById("stage");
  if (!stage) return;                                   // open.html stops here

  // ---------- state ----------
  const state = { items: [], cat: 0, sel: {}, view: "create", pkg: null };
  const user = Axia.storage.currentUser(), purpose = new URLSearchParams(location.search).get("for") === "someone" ? "someone" : "me";
  const f = { to: user && purpose === "me" ? "Me" : "", by: "", title: "" };
  const $ = function (id) { return document.getElementById(id); };
  function counts() { const m = {}; state.items.forEach(function (i) { m[i.type] = (m[i.type] || 0) + 1; }); return m; }

  // ---------- invoice (left panel) ----------
  function drawInvoice() {
    const m = counts(), list = $("inv-list"), keys = Object.keys(m);
    list.replaceChildren();
    if (!keys.length) { list.append(el("li", "inv-empty", "No items added yet"), el("li", "inv-empty", "Choose an item from a category to begin.")); }
    keys.forEach(function (k) { const li = el("li", "inv-item"); li.append(el("span", "", TYPES[k].name), el("span", "", "x" + m[k])); list.append(li); });
    $("inv-sum").replaceChildren(el("div", "", keys.length + " content types"), el("div", "", state.items.length + " items included"));
    const has = state.items.length > 0, sealed = state.view === "sealed";
    $("btn-review").disabled = !has; $("btn-seal").disabled = !has;
    $("btn-review").classList.toggle("on", state.view === "review"); $("btn-seal").classList.toggle("on", sealed);
    $("inv-clear").hidden = !has || sealed;
    $("inv-note").textContent = has ? "Once sealed, your package will be ready to share with the recipient." : "Add at least one item before reviewing and sealing the package.";
  }
  [["f-to", "to"], ["f-by", "by"], ["f-title", "title"]].forEach(function (p) { $(p[0]).addEventListener("input", function (e) { f[p[1]] = e.target.value.trim(); if (state.view === "review") draw(); }); });
  $("inv-clear").addEventListener("click", function () { if (confirm("Remove all items from this package?")) { state.items = []; state.view = "create"; draw(); } });

  // ---------- popups ----------
  function letterBox(values) { // one bordered box: greeting on top, "write something" area in the middle, sign-off at the bottom
    const L = (values.text || LETTER).replace(/\r/g, "").split("\n"), full = L.length >= 4;
    const box = el("div", "ltr"), top = el("input", "ltr-top"), body = el("textarea", "ltr-body"), end = el("textarea", "ltr-end");
    top.type = "text"; top.value = full ? L[0] : "Dear Someone,"; top.setAttribute("aria-label", "Greeting");
    body.placeholder = "What is this letter about? Write your message here..."; body.setAttribute("aria-label", "Letter");
    body.value = full ? L.slice(1, -2).join("\n").trim() : (values.text || "").trim();
    end.rows = 2; end.value = full ? L.slice(-2).join("\n") : "Kind Regards,\nSomeone Else"; end.setAttribute("aria-label", "Sign-off");
    function grow() { body.style.height = "auto"; body.style.height = Math.min(body.scrollHeight, 180) + "px"; }
    body.addEventListener("input", grow); setTimeout(grow, 0);
    box.append(top, body, end);
    box.get = function () {
      const b = body.value.trim(); if (!b) return null;
      return { text: top.value.trim() + "\n\n" + b + "\n\n" + end.value.trim().split("\n").slice(0, 2).join("\n") };
    };
    box.miss = "Please write your letter first.";
    return box;
  }
  function openForm(typeId, editing) {
    const t = TYPES[typeId], values = editing ? Object.assign({}, editing.data) : {}, inputs = {}, widgets = {};
    const ov = el("div", "overlay"), m = el("div", "modal");
    m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true"); if (typeId === "video" || typeId === "voice" || typeId === "note" || typeId === "tip" || typeId === "checklist" || typeId === "book" || typeId === "movie") m.classList.add(typeId + "-modal"); if (typeId === "guide" || typeId === "song") m.classList.add("video-modal"); if (typeId === "cafe") m.classList.add("movie-modal"); if (typeId === "place") m.classList.add("place-modal"); if (typeId === "coupon" || typeId === "ticket" || typeId === "clip" || typeId === "memory") m.classList.add("coupon-modal"); if (typeId === "memory") m.classList.add("memory-modal"); if (typeId === "flower") m.classList.add("flower-modal");
    const x = el("button", "x", "X"); x.type = "button"; x.setAttribute("aria-label", "Close");
    m.append(x, el("h2", "", typeId === "flower" ? "Create Flower Bouquet" : (editing ? "Edit " : "Add ") + (typeId === "note" ? "Note" : typeId === "tip" ? "Tip" : typeId === "book" ? "Book Recommendation" : typeId === "song" ? "Song Recommendation" : typeId === "movie" ? "Movie Recommendation" : typeId === "cafe" ? "Coffee Shop Recommendation" : typeId === "place" ? "Place Recommendation" : t.label)));
    let cpRow = null;
    t.fields.forEach(function (fd) {
      const key = fd[0], kind = fd[2];
      if (typeId === "letter") { widgets[key] = letterBox(values); m.append(widgets[key]); return; }
      if (kind === "draw" || kind === "rec" || kind === "flower" || kind === "idcard" || kind === "checklist") { widgets[key] = widget(kind, values, m); m.append(widgets[key]); return; }
      if (kind === "image" || kind === "audio" || kind === "any") {
        const inp = el("input", "fld"); inp.type = "file"; inp.accept = fd[4] || (kind === "any" ? "" : kind + "/*"); inp.setAttribute("aria-label", fd[1]);
        if (typeId === "coupon" || typeId === "ticket" || typeId === "clip" || typeId === "memory") { // Add Coupon / Ticket / Newspaper Clip / Memory: one bordered box holding Choose File, OR, the link and the expiry date
          const mem = typeId === "memory", box = el("div", mem ? "cp-box cp-mem" : "cp-box"), row = el("div", "cp-file"), pick = el("button", "ph-pick", "Choose File"), name = el("span", "cp-name", editing && values.fileName ? values.fileName : ""), or = el("div", "cp-or", "OR");
          pick.type = "button"; pick.onclick = function () { inp.click(); };
          inp.addEventListener("change", function () { name.textContent = inp.files[0] ? inp.files[0].name : ""; });
          const note = el("span", "cp-note", mem ? "Add a memory image" : "Attach " + (typeId === "clip" ? "newspaper clip" : typeId) + " image");
          if (mem) box.append(inp, pick, note, name); else { row.append(pick, note, name); cpRow = el("div", "cp-row"); box.append(inp, row, or, cpRow); }
          m.append(box); inputs[key] = inp; return;
        }
        if (typeId === "photo" || typeId === "reviewer" || typeId === "file" || typeId === "book") { // Add Photo / Add Reviewer: bordered box with a "Choose File" button and the size note inside
          const box = el("div", "ph-file"), pick = el("button", "ph-pick", "Choose File"), name = el("p", "hint ph-name");
          pick.type = "button"; pick.onclick = function () { inp.click(); };
          inp.addEventListener("change", function () { name.textContent = inp.files[0] ? inp.files[0].name : ""; });
          m.classList.add("photo-modal"); if (typeId === "reviewer" || typeId === "file") m.classList.add("ph-lg"); box.append(inp, pick, el("p", "hint", fd[1] + (editing && values.fileName ? " (current: " + values.fileName + ")" : "")), name);
          m.append(box); inputs[key] = inp; return;
        }
        m.append(inp, el("p", "hint", fd[1] + (editing && values.fileName ? " (current: " + values.fileName + ")" : ""))); inputs[key] = inp; return;
      }
      const inp = el(kind === "area" ? "textarea" : "input", "fld");
      if (kind !== "area") inp.type = kind === "text" ? "text" : kind;
      inp.placeholder = fd[1] || ""; inp.setAttribute("aria-label", fd[1] || "Letter"); inp.value = values[key] || (typeId === "letter" ? LETTER : "");
      if (typeId === "memory" && key === "text") inp.placeholder = "Additional Message (Optional)";
      if ((typeId === "coupon" || typeId === "ticket" || typeId === "clip") && cpRow && (key === "link" || key === "date")) {
        if (key === "link") { inp.placeholder = typeId === "clip" ? "Paste the article link" : "Paste a link"; if (typeId === "clip") cpRow.style.marginRight = "7px"; }
        else { inp.placeholder = typeId === "ticket" ? "Select date and time" : "Expiry date (Optional)"; if (!inp.value) inp.type = "text"; inp.addEventListener("focus", function () { inp.type = kind; }); inp.addEventListener("blur", function () { if (!inp.value) inp.type = "text"; }); }
        cpRow.append(inp); inputs[key] = inp; return;
      }
      if (kind === "date" || kind === "datetime-local") m.append(el("p", "hint", fd[1]));
      m.append(inp); inputs[key] = inp;
    });
    const err = el("p", "err"); err.setAttribute("role", "alert");
    const add = el("button", "bt teal", editing ? "Save" : "Add"), cancel = el("button", "bt", "Cancel"), acts = el("div", "acts");
    add.type = cancel.type = "button"; acts.append(add, cancel); m.append(err, acts); ov.append(m); document.body.append(ov);
    const first = m.querySelector(".fld, .ltr-body"); if (first) first.focus();
    function close() { Object.keys(widgets).forEach(function (k) { if (widgets[k].stop) widgets[k].stop(); }); ov.remove(); document.removeEventListener("keydown", esc); }
    function esc(e) { if (e.key === "Escape") close(); }
    document.addEventListener("keydown", esc); x.onclick = cancel.onclick = close;
    add.onclick = async function () {
      const data = {};
      for (const fd of t.fields) {
        const key = fd[0], inp = inputs[key], kind = fd[2];
        if (widgets[key]) { const r = widgets[key].get(); if (!r) return void (err.textContent = widgets[key].miss); Object.assign(data, r); continue; }
        if (kind === "image" || kind === "audio" || kind === "any") {
          const file = inp.files[0];
          if (file) {
            if (file.size > 5 * 1024 * 1024) return void (err.textContent = "That file is over the 5MB limit.");
            let url = await readFile(file); if (kind === "image") url = await shrink(url);
            data.file = url.length < 1500000 ? url : ""; data.fileName = file.name;
          } else if (values.fileName) { data.file = values.file; data.fileName = values.fileName; }
          if (fd[3] && !data.fileName) return void (err.textContent = kind === "image" ? "Please choose a photo first." : "Please choose a file first.");
          continue;
        }
        const v = inp.value.trim();
        if (fd[3] && !v) return void (err.textContent = "Please fill in the required field: " + (fd[1] || "your letter") + ".");
        if (kind === "url" && v && !safeUrl(v)) return void (err.textContent = "Please enter a full link starting with https://");
        if (v) data[key] = v;
      }
      if (typeId === "letter" && data.text.replace(/Dear Someone,|Kind Regards,|Someone Else/g, "").trim() === "") return void (err.textContent = "Please write your letter first.");
      if (!editing && state.items.length >= MAX) return void (err.textContent = "A package can hold up to " + MAX + " items.");
      if (["coupon", "ticket", "clip"].includes(typeId) && !data.file && !data.link) return void (err.textContent = "Add an image or a link.");
      if (editing) editing.data = data; else state.items.push({ id: Math.random().toString(36).slice(2, 9), type: typeId, data: data });
      close(); draw();
    };
  }
  function showList(typeId) { // "Open" / "View all": each item can be viewed, edited or removed
    const ov = el("div", "overlay"), m = el("div", "modal");
    m.style.width = "min(560px,100%)"; m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true");
    const x = el("button", "x", "X"); x.type = "button"; x.setAttribute("aria-label", "Close"); x.onclick = function () { ov.remove(); };
    m.append(x, el("h2", "", TYPES[typeId].name));
    state.items.filter(function (i) { return i.type === typeId; }).forEach(function (it) {
      const row = render(it), edit = el("button", "link-btn", "Edit"), rem = el("button", "link-btn", "Remove");
      edit.onclick = function () { ov.remove(); openForm(typeId, it); }; rem.onclick = function () { state.items = state.items.filter(function (i) { return i !== it; }); ov.remove(); if (!state.items.length) state.view = "create"; draw(); };
      row.append(edit, document.createTextNode(" · "), rem); m.append(row);
    });
    ov.append(m); document.body.append(ov);
  }

  // ---------- right side ----------
  function drawInvoiceView() { stage.replaceChildren(); }
  function drawCreate() {
    const cat = CATS[state.cat], panel = el("div", "panel"), pick = el("div", "picker"), tiles = el("div", "tiles"), m = counts();
    const prev = el("button", "arrow" + (state.cat > 0 ? " live" : ""), user ? "" : "‹"), next = el("button", "arrow" + (state.cat < CATS.length - 1 ? " live" : ""), user ? "" : "›");
    prev.type = next.type = "button"; prev.disabled = state.cat === 0; next.disabled = state.cat === CATS.length - 1;
    prev.setAttribute("aria-label", "Previous category"); next.setAttribute("aria-label", "Next category");
    prev.onclick = function () { state.cat--; draw(); }; next.onclick = function () { state.cat++; draw(); };
    cat[1].forEach(function (t) {
      const tile = el("div", "tile"), b = el("button", "tile-btn"), im = el("img");
      im.src = TYPES[t[0]].img; im.alt = "";
      b.type = "button"; b.setAttribute("aria-label", "Add " + t[1]); b.append(im); if (m[t[0]]) b.append(el("span", "badge", "x" + m[t[0]]));
      const plus = el("button", "plus", user ? "" : "+"); plus.type = "button"; plus.setAttribute("aria-label", "Add " + t[1]);
      function go() { state.sel[t[0]] = true; if (state.items.length >= MAX) return toast("A package can hold up to " + MAX + " items."); openForm(t[0]); }
      b.onclick = plus.onclick = go; tile.append(el("div", "", t[1]), b, plus); tiles.append(tile);
    });
    pick.append(prev, tiles, next); panel.append(pick, el("div", "cat-name", cat[0]));
    if (user) { // logged-in mockup: just the centred card grid, then a hint (or a way to the invoice) underneath
      const hint = el("div", "ws-hint");
      if (state.items.length) {
        const n = state.items.length, go = el("button", "bt big", "Check your invoice ›"); go.type = "button";
        go.setAttribute("aria-label", "Check your invoice (" + n + (n === 1 ? " item" : " items") + " added)");
        go.onclick = function () { state.view = "invoice"; draw(); }; hint.append(go);
      }
      else hint.append(el("p", "", "Add at least one item."));
      stage.replaceChildren(panel, hint); return;
    }
    const head = el("div"); head.append(el("h1", "", "Axia"), el("p", "tag", "You can begin without an account. Create one later to save your packages."));
    stage.replaceChildren(head, panel);
  }
  function snippet(type, list) {
    if (list.length > 1) return list.length + " " + TYPES[type].name.toLowerCase() + " included";
    const d = list[0].data; return (d.text || d.title || d.caption || d.fileName || "").slice(0, 50);
  }
  function drawReview() {
    const box = el("div", "review"), m = counts(), cards = el("div", "rcards"), to = el("p");
    to.append(document.createTextNode("A package prepared for"), el("br"), document.createTextNode(f.to || "[Someone]"));
    box.append(el("h2", "", f.title || "Untitled package"), to);
    Object.keys(m).forEach(function (k) {
      const list = state.items.filter(function (i) { return i.type === k; }), c = el("div", "rcard"), top = el("b");
      top.append(el("span", "", TYPES[k].name), el("span", "", "x" + m[k])); c.append(top, el("p", "", snippet(k, list)));
      if (list.length > 1) { const v = el("button", "bt", "View all"); v.onclick = function () { showList(k); }; c.append(v); }
      else { const o = el("button", "bt", "Open"), e = el("button", "bt", "Edit"); o.onclick = function () { showList(k); }; e.onclick = function () { openForm(k, list[0]); }; c.append(o, e); }
      cards.append(c);
    });
    const back = el("button", "bt", "‹ Back to create"); back.onclick = function () { state.view = "create"; draw(); };
    box.append(cards); const bk = el("div", "review-back"); bk.append(back);
    if (user) stage.replaceChildren(box, bk);
    else { const head = el("div"); head.append(el("h1", "", "Axia"), el("p", "tag", "You can begin without an account. Create one later to save your packages.")); stage.replaceChildren(head, box, bk); }
  }
  function seal() {
    const id = Math.random().toString(36).slice(2, 10), pkg = { id: id, title: f.title || "Untitled package", to: f.to, by: f.by, items: state.items, made: Date.now() };
    if (user) { pkg.owner = user.email; pkg.purpose = purpose; }
    if (!Axia.storage.savePackage(pkg)) return toast("Your browser has no space left to save this package. Try removing large photos.");
    state.pkg = pkg; state.view = "sealed"; draw();
  }
  function drawSealed() {
    const url = new URL("open.html?p=" + state.pkg.id, location.href).href, box = el("div", "sealed");
    const mineNow = user && purpose === "me", done = el("a", mineNow ? "bt on" : "bt done", mineNow ? "Understood" : "Done"); done.href = user ? (purpose === "me" ? "for-me.html" : "for-someone.html") : "../index.html";
    const img = el("img"); img.src = "../assets/images/package/gift-box.png"; img.alt = "A wrapped gift box";
    const copy = el("button", "bt on", "Copy Package Link"); copy.type = "button";
    copy.onclick = function () {
      const ok = function () { toast("Link copied. Send it to the person you made this package for."); };
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(ok, function () { window.prompt("Copy this link:", url); });
      else window.prompt("Copy this link:", url);
    };
    const mine = user && purpose === "me";
    if (!mine) box.append(done);
    box.append(el("p", "", "Package Sealed!"), el("h2", "", state.pkg.title), el("p", "", mine ? "Your package is ready to keep" : "Your package is ready to share"), img,
      el("p", "warn", !user ? "Please copy your package link before closing this page. As a guest, you may not be able to access this package again after leaving." : mine ? "Since you chose to keep it for yourself, this package is accessible anytime from the For Me section." : "Since you chose to send it for someone, this package is accessible anytime from the For Someone section, or you can copy the link and share it with them."));
    if (!mine) box.append(copy); else { done.style.display = "inline-block"; done.style.marginTop = "6px"; box.append(done); }
    if (user) stage.replaceChildren(box);
    else { const head = el("div"); head.append(el("h1", "", "Axia"), el("p", "tag", "You can begin without an account. Create one later to save your packages.")); stage.replaceChildren(head, box); }
  }
  const ws = $("ws"), bar = $("bar");
  function draw() {
    if (ws) { ws.className = "ws ws-user v-" + state.view; }
    if (bar) { bar.textContent = state.view === "create" ? "+ CREATE" : "‹ CREATE"; bar.disabled = state.view === "create"; bar.setAttribute("aria-label", state.view === "create" ? "Create" : "Back to create"); }
    drawInvoice(); ({ create: drawCreate, invoice: drawInvoiceView, review: drawReview, sealed: drawSealed })[state.view]();
  }
  if (bar) bar.onclick = function () { if (state.view !== "create") { state.view = "create"; draw(); } };
  $("btn-review").onclick = function () { state.view = "review"; draw(); };
  $("btn-seal").onclick = seal;
  if (!user) Axia.storage.startGuestSession();
  draw();
})();