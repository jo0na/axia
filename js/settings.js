/* settings.js - Settings page (notification + light/dark), Profile page, Email & Password page */
(function () {
  const S = Axia.storage, user = S.currentUser(), view = document.body.dataset.view, page = document.body.dataset.page;
  if (!user) return;
  const $ = function (id) { return document.getElementById(id); };
  function say(id, t, ok) { const m = $(id); m.textContent = t; m.className = "fmsg" + (ok ? " ok" : ""); }

  if (page === "settings" && view === "settings") {
    const cfg = S.getSettings(), sw = $("notif"), lt = $("th-light"), dk = $("th-dark");
    function paint() {
      const c = S.getSettings();
      sw.setAttribute("aria-checked", c.notifications); sw.classList.toggle("on", c.notifications);
      lt.classList.toggle("on", c.theme === "light"); dk.classList.toggle("on", c.theme === "dark");
      lt.setAttribute("aria-pressed", c.theme === "light"); dk.setAttribute("aria-pressed", c.theme === "dark");
      document.documentElement.dataset.theme = c.theme;
    }
    sw.onclick = function () { S.saveSettings({ notifications: !S.getSettings().notifications }); paint(); Axia.toast(S.getSettings().notifications ? "Notifications are ON" : "Notifications are OFF"); };
    lt.onclick = function () { S.saveSettings({ theme: "light" }); paint(); };
    dk.onclick = function () { S.saveSettings({ theme: "dark" }); paint(); };
    paint();
  }

  if (page === "profile") {
    let photo = "", avatar = user.avatar; const prev = $("pf-photo"), box = $("pf-avatars"), note = $("pf-file-note"), NOTE = note.textContent;
    $("pf-name").value = user.username; prev.src = user.avatar;
    for (let i = 1; i <= 6; i++) {
      const src = "../assets/images/avatars/avatar-" + i + ".png", b = document.createElement("button"), im = document.createElement("img");
      b.type = "button"; b.className = "av" + (src === user.avatar ? " on" : ""); b.setAttribute("aria-label", "Avatar " + i); im.src = src; im.alt = ""; b.append(im);
      b.onclick = function () { avatar = src; photo = ""; prev.src = src; $("pf-file").value = ""; note.textContent = NOTE; box.querySelectorAll(".av").forEach(function (x) { x.classList.toggle("on", x === b); }); };
      box.append(b);
    }
    $("pf-file").onchange = function (e) {
      const file = e.target.files[0]; if (!file) return;
      if (file.size > 5 * 1024 * 1024) { e.target.value = ""; return say("pf-msg", "That photo is over 5MB."); }
      const r = new FileReader();
      r.onload = function () {
        const img = new Image();
        img.onload = function () {
          const c = document.createElement("canvas"), s = Math.min(1, 240 / Math.min(img.width, img.height));
          c.width = img.width * s; c.height = img.height * s; c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
          photo = c.toDataURL("image/jpeg", 0.8); prev.src = photo; note.textContent = file.name; say("pf-msg", "");
          box.querySelectorAll(".av").forEach(function (x) { x.classList.remove("on"); });
        };
        img.onerror = function () { say("pf-msg", "This file couldn’t be read as an image."); };
        img.src = r.result;
      };
      r.readAsDataURL(file);
    };
    $("pf-save").onclick = function () {
      const name = $("pf-name").value.trim();
      if (name.length < 3) return say("pf-msg", "Please enter a username (at least 3 characters).");
      if (!S.updateAccount(user.email, { username: name, avatar: photo || avatar })) return say("pf-msg", "Your browser has no space left to save this change.");
      say("pf-msg", "Profile updated!", true);
      setTimeout(function () { location.reload(); }, 600);
    };
  }

  if (page === "account") {
    $("ac-email").value = user.email;
    $("ac-save").onclick = function () {
      const email = $("ac-email").value.trim().toLowerCase(), oldPw = $("ac-old").value, pw = $("ac-new").value, changes = {};
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return say("ac-msg", "Please enter a valid email address.");
      if (email !== user.email) { if (S.findAccount(email)) return say("ac-msg", "That email already has an account."); changes.email = email; }
      if (pw || $("ac-new2").value) {
        if (oldPw !== user.password) return say("ac-msg", "Your current password is incorrect.");
        if (pw.length < 6) return say("ac-msg", "Your new password needs at least 6 characters.");
        if (pw !== $("ac-new2").value) return say("ac-msg", "The two new passwords do not match.");
        changes.password = pw;
      }
      if (!Object.keys(changes).length) return say("ac-msg", "Nothing to change yet.");
      if (!S.updateAccount(user.email, changes)) return say("ac-msg", "Your browser has no space left to save this change.");
      if (changes.email) S.startUserSession(changes.email, false);
      say("ac-msg", "Saved!", true); $("ac-old").value = $("ac-new").value = $("ac-new2").value = "";
    };
  }
})();