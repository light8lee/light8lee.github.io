(function () {
  "use strict";

  function slugify(text, index) {
    var slug = text
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\p{Letter}\p{Number}\-_]+/gu, "");

    return slug || "section-" + (index + 1);
  }

  function uniqueHeadingId(heading, index, used) {
    var base = heading.id || slugify(heading.textContent, index);
    var id = base;
    var suffix = 2;

    while (used[id]) {
      id = base + "-" + suffix;
      suffix += 1;
    }

    used[id] = true;
    return id;
  }

  function initPostNavigation() {
    var layout = document.querySelector("[data-post-layout]");
    if (!layout) {
      return;
    }

    var content = layout.querySelector("[data-post-content]");
    var toc = layout.querySelector("[data-post-toc]");
    var list = layout.querySelector("[data-post-toc-list]");
    var toggle = layout.querySelector("[data-post-toc-toggle]");
    var headings = Array.prototype.slice.call(
      content.querySelectorAll("h1, h2, h3")
    );

    if (!headings.length) {
      return;
    }

    var used = Object.create(null);
    headings.forEach(function (heading, index) {
      var id = uniqueHeadingId(heading, index, used);
      var link = document.createElement("a");

      heading.id = id;
      link.href = "#" + encodeURIComponent(id);
      link.className =
        "post-toc-link post-toc-level-" + heading.tagName.slice(1);
      link.textContent = heading.textContent.trim();
      link.dataset.tocTarget = id;
      list.appendChild(link);
    });

    toc.hidden = false;

    toggle.addEventListener("click", function () {
      var open = toc.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
    });

    list.addEventListener("click", function () {
      toc.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    });

    if (!("IntersectionObserver" in window)) {
      return;
    }

    var links = Array.prototype.slice.call(list.querySelectorAll("a"));
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) {
            return;
          }

          links.forEach(function (link) {
            link.classList.toggle(
              "is-active",
              link.dataset.tocTarget === entry.target.id
            );
          });
        });
      },
      { rootMargin: "-15% 0px -70% 0px" }
    );

    headings.forEach(function (heading) {
      observer.observe(heading);
    });
  }

  document.addEventListener("DOMContentLoaded", initPostNavigation);
})();
