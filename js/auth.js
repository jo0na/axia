/* auth.js - register.html, profile-setup.html, login.html (prototype: accounts live in this browser only) */
(function () {
  const page = document.body.dataset.page, S = Axia.storage;
  const $ = function (id) { return document.getElementById(id); };
  const msg = $("msg");
  function say(t, ok) { msg.textContent = t; msg.className = "auth-msg" + (ok ? " ok" : ""); }
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  document.querySelectorAll("[data-oauth]").forEach(function (b) {
    b.addEventListener("click", function () { say("Apple and Google sign-in are not available in this prototype. Please use your email.", false); });
  });

  // ---- show / hide password: adds an eye button inside every password box (no layout change) ----
  (function () {
    const fields = document.querySelectorAll('.auth-box input[type="password"]');
    if (!fields.length) return;
    const css = document.createElement("style");
    css.textContent =
      ".pw-wrap{position:relative}" +
      ".pw-wrap input[type=password],.pw-wrap input[type=text]{padding-right:56px !important}" +
      ".pw-eye{position:absolute;top:50%;right:18px;transform:translateY(-50%);display:flex;align-items:center;justify-content:center;width:28px;height:28px;margin:0;padding:0;border:0;background:none;color:var(--color-text);cursor:pointer}" +
      ".pw-eye svg{width:22px;height:22px;display:block}" +
      ".pw-eye:focus-visible{outline:2px solid var(--color-heading);outline-offset:2px;border-radius:6px}";
    document.head.append(css);
    const NS = "http://www.w3.org/2000/svg";
    const EYE = ["M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z", "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"];
    const SLASH = "M3 3l18 18";
    function icon(hidden) {              // hidden = password is hidden -> show an open eye; shown -> eye with a line through it
      const svg = document.createElementNS(NS, "svg");
      svg.setAttribute("viewBox", "0 0 24 24"); svg.setAttribute("aria-hidden", "true"); svg.setAttribute("focusable", "false");
      (hidden ? EYE : EYE.concat([SLASH])).forEach(function (d) {
        const path = document.createElementNS(NS, "path");
        path.setAttribute("d", d); path.setAttribute("fill", "none"); path.setAttribute("stroke", "currentColor");
        path.setAttribute("stroke-width", "2"); path.setAttribute("stroke-linecap", "round"); path.setAttribute("stroke-linejoin", "round");
        svg.append(path);
      });
      return svg;
    }
    fields.forEach(function (input) {
      const wrap = document.createElement("div"), btn = document.createElement("button");
      wrap.className = "pw-wrap"; input.parentNode.insertBefore(wrap, input); wrap.append(input);
      btn.type = "button"; btn.className = "pw-eye";
      function paint() {
        const hidden = input.type === "password";
        btn.replaceChildren(icon(hidden));
        btn.setAttribute("aria-label", hidden ? "Show password" : "Hide password");
        btn.setAttribute("aria-pressed", String(!hidden));
      }
      btn.addEventListener("click", function () {
        input.type = input.type === "password" ? "text" : "password"; paint(); input.focus();
      });
      paint(); wrap.append(btn);
    });
  })();

  if (page === "register") {
    $("form").addEventListener("submit", function (e) {
      e.preventDefault();
      const email = $("email").value.trim().toLowerCase(), pw = $("pw").value;
      if (!EMAIL.test(email)) return say("Please enter a valid email address.");
      if (S.findAccount(email)) return say("That email already has an account. Try logging in instead.");
      if (pw.length < 6) return say("Your password needs at least 6 characters.");
      if (pw !== $("pw2").value) return say("The two passwords do not match.");
      sessionStorage.setItem("axia_pending", JSON.stringify({ name: $("name").value.trim(), email: email, password: pw }));
      location.href = "profile-setup.html";
    });
  }

  if (page === "profile-setup") {
    let pending = null, photo = "", avatar = "";
    try { pending = JSON.parse(sessionStorage.getItem("axia_pending")); } catch (err) {}
    if (!pending) { location.replace("register.html"); return; }
    const preview = $("preview"), box = $("avatars");
    for (let i = 1; i <= 6; i++) {
      const src = "../assets/images/avatars/avatar-" + i + ".png", b = document.createElement("button"), im = document.createElement("img");
      b.type = "button"; b.className = "av"; b.setAttribute("aria-label", "Avatar " + i); im.src = src; im.alt = ""; b.append(im);
      b.addEventListener("click", function () {
        avatar = src; photo = ""; preview.src = src;
        box.querySelectorAll(".av").forEach(function (x) { x.classList.toggle("on", x === b); });
      });
      box.append(b);
    }
    $("photo").addEventListener("change", function (e) {          // shrink the photo so it fits in browser storage
      const file = e.target.files[0]; if (!file) return;
      if (file.size > 5 * 1024 * 1024) { e.target.value = ""; return say("That photo is over 5MB."); }
      const r = new FileReader();
      r.onload = function () {
        const img = new Image();
        img.onload = function () {
          const c = document.createElement("canvas"), s = Math.min(1, 240 / Math.min(img.width, img.height));
          c.width = img.width * s; c.height = img.height * s; c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
          photo = c.toDataURL("image/jpeg", 0.8); avatar = ""; preview.src = photo; say("");
          box.querySelectorAll(".av").forEach(function (x) { x.classList.remove("on"); });
        };
        img.onerror = function () { say("That file is not a picture we can read."); };
        img.src = r.result;
      };
      r.readAsDataURL(file);
    });
    $("form").addEventListener("submit", function (e) {
      e.preventDefault();
      const username = $("username").value.trim();
      if (username.length < 3) return say("Please enter a username (at least 3 characters).");
      const ok = S.addAccount({ email: pending.email, password: pending.password, name: pending.name, username: username, avatar: photo || avatar || "../assets/images/avatars/default-profile.png" });
      if (!ok) return say("Your browser has no space left to save the account.");
      sessionStorage.removeItem("axia_pending");
      S.startUserSession(pending.email, true);
      location.href = "start.html";
    });
  }

  if (page === "login") {
    $("form").addEventListener("submit", function (e) {
      e.preventDefault();
      const acc = S.findAccount($("email").value);
      if (!acc || acc.password !== $("pw").value) return say("That email or password is not right. Please try again.");
      S.startUserSession(acc.email, false);
      location.href = "start.html";
    });
    $("forgot").addEventListener("click", function (e) { e.preventDefault(); say("Password reset is not available in this prototype.", true); });
  }
})();