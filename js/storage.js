/* =========================================================
   storage.js  -  saves and loads data in the browser (localStorage)
   There is no server in this prototype, so everything the
   website "remembers" lives here.

   HOW TO USE it in any other JS file:
       Axia.storage.getSettings();
       Axia.storage.saveSettings({ theme: "dark" });

   It must be loaded BEFORE the other scripts, because they use it.
   Accounts and packages will be added here later, when we build
   the register/login and package pages.
   ========================================================= */

window.Axia = window.Axia || {};   // one shared "box" for all our code

Axia.storage = (function () {
  // names of the entries we keep in localStorage
  const KEYS = {
    settings: "axia_settings",
    session: "axia_session"
  };

  // used until the user changes something in Settings
  const DEFAULT_SETTINGS = {
    theme: "light",          // "light" or "dark"
    notifications: true      // on or off
  };

  // read a value; if anything goes wrong, return the fallback instead
  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (error) {
      return fallback;
    }
  }

  // save a value; returns true if it worked
  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      return false;
    }
  }

  function remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      /* nothing to do */
    }
  }

  // ----- settings (theme, notifications) -----
  function getSettings() {
    return Object.assign({}, DEFAULT_SETTINGS, read(KEYS.settings, {}));
  }

  function saveSettings(changes) {
    const updated = Object.assign(getSettings(), changes);
    write(KEYS.settings, updated);
    return updated;
  }

  // ----- session (who is using the website right now) -----
  // null = nobody yet, { type: "guest" } = guest
  function getSession() {
    return read(KEYS.session, null);
  }

  function startGuestSession() {
    write(KEYS.session, { type: "guest" });
  }

  function endSession() {
    remove(KEYS.session);
  }

  // ----- accounts + saved packages (prototype only: no server, passwords are NOT encrypted) -----
  function accounts() { return read("axia_accounts", []); }
  function findAccount(email) { return accounts().find(function (a) { return a.email === String(email).trim().toLowerCase(); }) || null; }
  function addAccount(acc) { const all = accounts(); all.push(acc); return write("axia_accounts", all); }
  function updateAccount(email, changes) {          // profile / email / password changes (prototype: plain storage)
    const all = accounts(), i = all.findIndex(function (a) { return a.email === String(email).trim().toLowerCase(); });
    if (i < 0) return false;
    all[i] = Object.assign({}, all[i], changes); return write("axia_accounts", all);
  }
  function startUserSession(email, isNew) { write(KEYS.session, { type: "user", email: email, isNew: !!isNew }); }
  function currentUser() { const s = getSession(); return s && s.type === "user" ? findAccount(s.email) : null; }
  function savePackage(pkg) {                      // new or edited package, shared by link + kept in the owner's collection
    try {
      const all = JSON.parse(localStorage.getItem("axia_shared") || "{}"); all[pkg.id] = pkg;
      localStorage.setItem("axia_shared", JSON.stringify(all)); return true;
    } catch (e) { return false; }
  }
  function deletePackages(ids) {                   // remove one or more saved packages (also stops their share links working)
    try {
      const all = JSON.parse(localStorage.getItem("axia_shared") || "{}");
      ids.forEach(function (id) { delete all[id]; });
      localStorage.setItem("axia_shared", JSON.stringify(all)); return true;
    } catch (e) { return false; }
  }
  function myPackages(email, purpose) {
    try { return Object.values(JSON.parse(localStorage.getItem("axia_shared") || "{}")).filter(function (p) { return p.owner === email && p.purpose === purpose; }).sort(function (a, b) { return b.made - a.made; }); }
    catch (e) { return []; }
  }

  // everything other files are allowed to use
  return {
    accounts: accounts, findAccount: findAccount, addAccount: addAccount, updateAccount: updateAccount, startUserSession: startUserSession,
    currentUser: currentUser, savePackage: savePackage, deletePackages: deletePackages, myPackages: myPackages,
    getSettings: getSettings,
    saveSettings: saveSettings,
    getSession: getSession,
    startGuestSession: startGuestSession,
    endSession: endSession
  };
})();