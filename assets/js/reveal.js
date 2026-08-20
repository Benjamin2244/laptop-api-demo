/* ==========================================================================
   Scroll reveal.

   Elements marked [data-reveal] fade and rise into place as they enter the
   viewport, staggered within their group. Purely decorative:

   - The hidden state is defined under `.js [data-reveal]`, and this file is
     what sets `.js` — so with JavaScript off, nothing is ever hidden.
   - The hidden state also sits inside a prefers-reduced-motion:no-preference
     query, so motion-sensitive visitors get everything immediately.
   - No IntersectionObserver (or anything already scrolled past) means the
     content is simply shown.
   ========================================================================== */

(function () {
  "use strict";

  /* Kept short: with a denser grid, more items reveal at once, and a long
     cascade would read as the page being slow rather than as polish. */
  var STAGGER_MS = 45;
  var MAX_STAGGER_MS = 200;

  var motionOK =
    !window.matchMedia ||
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function showAll(nodes) {
    nodes.forEach(function (node) {
      node.classList.add("is-revealed");
    });
  }

  function init() {
    var nodes = Array.prototype.slice.call(
      document.querySelectorAll("[data-reveal]")
    );
    if (!nodes.length) return;

    if (!motionOK || !("IntersectionObserver" in window)) {
      showAll(nodes);
      return;
    }

    /* Stagger is per group, so each grid or list cascades from its own first
       item rather than inheriting a delay from everything above it. */
    var counters = {};

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;

          var node = entry.target;
          var group = node.getAttribute("data-reveal") || "default";
          counters[group] = (counters[group] || 0) + 1;

          var delay = Math.min(
            (counters[group] - 1) * STAGGER_MS,
            MAX_STAGGER_MS
          );
          node.style.setProperty("--reveal-delay", delay + "ms");
          node.classList.add("is-revealed");

          observer.unobserve(node);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }
    );

    nodes.forEach(function (node) {
      observer.observe(node);
    });

    /* Safety net: if anything is still hidden shortly after load — an observer
       that never fired, a zero-height container — just show it. Content must
       never be stuck invisible. */
    window.setTimeout(function () {
      nodes.forEach(function (node) {
        if (!node.classList.contains("is-revealed")) {
          var box = node.getBoundingClientRect();
          if (box.top < window.innerHeight) node.classList.add("is-revealed");
        }
      });
    }, 1200);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
