(function () {
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var candidates = Array.prototype.slice.call(document.querySelectorAll(
    '.home-hero, .content-section, .page-heading, .archive-item, .category-group, .project-card, .post-hero, .post-content > *, .chapter-navigation'
  ));

  candidates.forEach(function (element, index) {
    if (element.closest('.post-content') && !/^(H2|H3|P|FIGURE|BLOCKQUOTE|PRE|TABLE|UL|OL|DIV)$/.test(element.tagName)) return;
    element.classList.add('desk-reveal');
    element.style.setProperty('--desk-delay', Math.min(index % 6, 5) * 45 + 'ms');
  });

  if (reduceMotion || !('IntersectionObserver' in window)) {
    candidates.forEach(function (element) { element.classList.add('is-revealed'); });
    return;
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-revealed');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.08 });

  candidates.forEach(function (element) { observer.observe(element); });
})();
