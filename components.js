/* =========================================================
   components.js  -  parts that appear on many pages
   1) builds the navbar inside <header id="site-header">
   2) applies the saved light/dark theme

   Each HTML page tells this file two things on its <body> tag:
     data-page="home"   -> which navbar link is the "current" one
     data-root=""       -> how to get back to the main folder
                           ("" for index.html, "../" for files in /pages)

   Load order at the bottom of every page:
     storage.js  ->  components.js  ->  the page's own js
   ========================================================= */

(function () {
  const root = document.body.dataset.root || "";
  const spa = document.body.dataset.spa === "true";   // index.html: links scroll to sections
  const currentPage = document.body.dataset.page || "";

  // the four navbar links (same as the mockups)
  const NAV_LINKS = [
    { id: "home",         label: "Home",         href: "index.html" },
    { id: "how-it-works", label: "How It Works", href: "pages/how-it-works.html" },
    { id: "help",         label: "Help",         href: "pages/help.html" },
    { id: "about",        label: "About",        href: "pages/about.html" }
  ];

  // light or dark, from the saved settings
  function applySavedTheme() {
    document.documentElement.dataset.theme = Axia.storage.getSettings().theme;
  }

  function renderHeader() {
    const header = document.getElementById("site-header");
    if (!header) return;

    // one <li><a> per link; the current page gets aria-current="page"
    const linksHtml = NAV_LINKS.map(function (link) {
      const current = link.id === currentPage ? ' aria-current="page"' : "";
      return '<li><a href="' + (spa ? "#" + link.id : root + link.href) + '"' + current + ">" + link.label + "</a></li>";
    }).join("");

    /* TODO (your team): the logo is plain text for now.
       To use your logo file, replace the word Axia below with:
       <img src="${root}assets/images/logo.png" alt="Axia" height="40"> */
    header.innerHTML =
      '<a class="site-logo" href="' + root + 'index.html">Axia</a>' +
      '<nav class="site-nav" aria-label="Main navigation"><ul>' + linksHtml + "</ul></nav>" +
      '<a class="btn btn-small" href="' + root + 'pages/create.html" data-action="guest">' +
      "Continue as a Guest &gt;</a>";

    // clicking "Continue as a Guest" remembers that this visitor is a guest,
    // then the link itself takes them to the create page
    header.querySelector('[data-action="guest"]').addEventListener("click", function () {
      Axia.storage.startGuestSession();
    });
  }

  // on the single scrolling page, the navbar pill follows whichever section is on screen,
  // and the Create an Account / Log In band is hidden while About is showing
  function watchSections() {
    const band = document.querySelector(".cta-band"), links = document.querySelectorAll(".site-nav a");
    const secs = Array.prototype.slice.call(document.querySelectorAll(".page-section"));
    const about = document.getElementById("about");
    function update() {
      const line = window.innerHeight * 0.4, atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      let cur = secs[0];
      secs.forEach(function (sec) { if (sec.getBoundingClientRect().top <= line) cur = sec; });
      if (atEnd) cur = secs[secs.length - 1];
      links.forEach(function (a) { const on = a.getAttribute("href") === "#" + cur.id; if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
      // Create an Account / Log In bar: sticky at the bottom, gone once About starts to show
      if (band && about) band.classList.toggle("is-hidden", about.getBoundingClientRect().top < window.innerHeight * 0.75 || atEnd);
    }
    window.addEventListener("scroll", update, { passive: true }); window.addEventListener("resize", update); update();
  }

  applySavedTheme();
  renderHeader();
  if (spa) watchSections();
})();
