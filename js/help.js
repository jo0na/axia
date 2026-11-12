/* =========================================================
   help.js  -  Help page only
   1) Clicking a category shows that category's questions.
   2) The search button turns into a text box and filters
      every question as you type.

   TODO (your team): the questions and answers below are
   starting text written from the mockups. Edit, add or remove
   any of them. Each one is { q: "question", a: "answer" }.
   ========================================================= */

(function () {
  const FAQ = {
    "getting-started": {
      title: "Getting Started",
      questions: [
        { q: "What is Axia?",
          a: "Axia is a space where you can gather letters, photos, notes, recommendations and other items into one personalized collection, for yourself or for someone special." },
        { q: "Do I need an account to begin?",
          a: "No. Choose Continue as a Guest to start right away. An account lets you save your packages and come back to them later." },
        { q: "How do I start a collection?",
          a: "Choose whether it is for yourself or for someone else, add items from the content categories, then review your package." }
      ]
    },
    "creating-collections": {
      title: "Creating Collections",
      questions: [
        { q: "What can I add to a collection?",
          a: "Letters, photos, videos, voice notes, drawings, study notes, recommendations, coupons, tickets, flowers and more." },
        { q: "Can I add more than one of the same kind of item?",
          a: "Yes. Your Package Summary shows how many items of each type you have added." },
        { q: "Can I change my collection before I finish?",
          a: "Yes. Use Review Package to open or edit any item before you choose Finish and Seal." }
      ]
    },
    "saving-and-sharing": {
      title: "Saving and Sharing",
      questions: [
        { q: "What does Finish and Seal do?",
          a: "It completes your package. Once it is sealed, your package is ready to keep or to share with the recipient." },
        { q: "How do I share a package with someone?",
          a: "After you seal a package made for someone else, choose Copy Package Link and send that link to them." },
        { q: "Can a guest open their package again later?",
          a: "Guests may not be able to access a package again after leaving, so copy the package link before you close the page." }
      ]
    },
    "account-and-access": {
      title: "Account and Access",
      questions: [
        { q: "Why should I create an account?",
          a: "An account saves your packages, so you can find them again under For Me and For Someone." },
        { q: "How do I change my email or password?",
          a: "Open Settings, choose your profile at the bottom of the sidebar, then pick Email & Password." },
        { q: "How do I switch between light and dark mode?",
          a: "In Settings, under Appearance, choose Light or Dark." }
      ]
    }
  };

  // parts of the page we need to find
  const searchForm = document.getElementById("help-search");
  const searchButton = document.getElementById("search-toggle");
  const heading = document.getElementById("faq-heading");
  const grid = document.getElementById("category-grid");
  const panel = document.getElementById("faq-panel");

  // if something is missing in the HTML, do nothing instead of crashing
  if (!searchForm || !searchButton || !heading || !grid || !panel) return;

  let searchInput = null;   // created when the search button is clicked

  // ----- helpers -----

  // one question = a <details> that opens and closes by itself
  function buildQuestion(item) {
    const li = document.createElement("li");
    li.className = "faq-item";

    const details = document.createElement("details");
    const summary = document.createElement("summary");
    summary.textContent = item.q;

    const answer = document.createElement("p");
    answer.textContent = item.a;

    details.append(summary, answer);
    li.append(details);
    return li;
  }

  // show a title, a back button and a list of questions
  function showList(titleText, items, emptyMessage) {
    grid.hidden = true;
    heading.hidden = true;
    panel.hidden = false;
    panel.replaceChildren();

    const title = document.createElement("h2");
    title.className = "help-subtitle";
    title.textContent = titleText;

    const back = document.createElement("button");
    back.className = "faq-back";
    back.type = "button";
    back.textContent = "< All categories";
    back.addEventListener("click", function () {
      if (searchInput) searchInput.value = "";
      showCategories();
    });

    panel.append(back, title);

    if (items.length === 0) {
      const empty = document.createElement("p");
      empty.className = "faq-empty";
      empty.textContent = emptyMessage;
      panel.append(empty);
      return;
    }

    const list = document.createElement("ul");
    list.className = "faq-list";
    items.forEach(function (item) {
      list.append(buildQuestion(item));
    });
    panel.append(list);
  }

  // back to the 4 category buttons
  function showCategories() {
    panel.hidden = true;
    panel.replaceChildren();
    grid.hidden = false;
    heading.hidden = false;
  }

  // ----- category buttons -----
  grid.addEventListener("click", function (event) {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    const category = FAQ[button.dataset.category];
    if (!category) return;
    showList(category.title, category.questions, "");
  });

  // ----- search -----
  function runSearch() {
    const term = searchInput.value.trim().toLowerCase();
    if (term === "") {
      showCategories();
      return;
    }

    const matches = [];
    Object.keys(FAQ).forEach(function (key) {
      FAQ[key].questions.forEach(function (item) {
        if ((item.q + " " + item.a).toLowerCase().includes(term)) {
          matches.push(item);
        }
      });
    });

    showList("Search results", matches, "No questions match your search. Try a different word.");
  }

  // clicking the button swaps it for a text box
  searchButton.addEventListener("click", function () {
    searchInput = document.createElement("input");
    searchInput.className = "help-search-input";
    searchInput.type = "search";
    searchInput.placeholder = "Search for a question or topic";
    searchInput.setAttribute("aria-label", "Search for a question or topic");

    searchInput.addEventListener("input", runSearch);
    searchInput.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        searchInput.value = "";
        showCategories();
      }
    });

    searchForm.replaceChildren(searchInput);
    searchInput.focus();
  });

  // pressing Enter in the box should not reload the page
  searchForm.addEventListener("submit", function (event) {
    event.preventDefault();
  });
})();
