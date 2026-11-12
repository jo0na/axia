/* =========================================================
   landing.js  -  Home page only
   Makes the left/right arrows of the category carousel work.

   How it works: the cards are <li> items inside one <ul>.
   - Right arrow: the FIRST card moves to the END of the list.
   - Left arrow:  the LAST card moves to the FRONT of the list.
   The staggered heights come from the card's position (see
   landing.css), so the pattern stays the same after moving.
   ========================================================= */

(function () {
  const list = document.getElementById("category-list");
  const prevButton = document.getElementById("carousel-prev");
  const nextButton = document.getElementById("carousel-next");

  // if something is missing in the HTML, do nothing instead of crashing
  if (!list || !prevButton || !nextButton) return;

  nextButton.addEventListener("click", function () {
    list.appendChild(list.firstElementChild);
  });

  prevButton.addEventListener("click", function () {
    list.insertBefore(list.lastElementChild, list.firstElementChild);
  });
})();
