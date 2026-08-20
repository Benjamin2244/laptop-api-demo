/* ==========================================================================
   Laptop API status widget.

   The site used to lead with a big "Check API" button. The demo is still here,
   just demoted to a quiet dot in the footer: it reports whether the Flask app
   tunnelled off the laptop is reachable, and reveals the raw JSON on click.

   Loaded BEFORE site.js — site.js calls initApiStatus() once it has built the
   footer that this mounts into.
   ========================================================================== */

(function () {
  "use strict";

  var ENDPOINT = "https://measured-boar-awaited.ngrok-free.app/api/data";
  var TIMEOUT_MS = 4000;
  var CACHE_KEY = "laptop-api-status";

  var LABELS = {
    checking: "Laptop API: checking…",
    online: "Laptop API: online",
    offline: "Laptop API: offline"
  };

  /* sessionStorage may throw in private modes — never let that break the page. */
  function readCache() {
    try {
      var raw = window.sessionStorage.getItem(CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  }

  function writeCache(value) {
    try {
      window.sessionStorage.setItem(CACHE_KEY, JSON.stringify(value));
    } catch (err) {
      /* Not worth surfacing — the widget just re-checks next page. */
    }
  }

  function fetchStatus() {
    var controller = new AbortController();
    /* A sleeping laptop should fail fast rather than spin forever. */
    var timer = setTimeout(function () {
      controller.abort();
    }, TIMEOUT_MS);

    return fetch(ENDPOINT, {
      /* Skips ngrok's free-tier browser interstitial, which would otherwise
         return HTML instead of our JSON. */
      headers: { "ngrok-skip-browser-warning": "1" },
      signal: controller.signal
    })
      .then(function (response) {
        if (!response.ok) throw new Error("HTTP " + response.status);
        return response.json();
      })
      .then(function (data) {
        return { state: "online", data: data };
      })
      .catch(function () {
        /* Offline is the normal resting state here, not an error worth
           showing the reader. */
        return { state: "offline", data: null };
      })
      .finally(function () {
        clearTimeout(timer);
      });
  }

  function build(mount) {
    var widget = document.createElement("div");
    widget.className = "api-status";
    widget.setAttribute("data-state", "offline");

    var toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "api-status__toggle";
    toggle.setAttribute("aria-expanded", "false");

    var dot = document.createElement("span");
    dot.className = "api-status__dot";

    var label = document.createElement("span");
    label.textContent = LABELS.offline;

    toggle.append(dot, label);

    var output = document.createElement("pre");
    output.className = "api-status__output";
    output.hidden = true;

    widget.append(toggle, output);
    mount.replaceChildren(widget);

    return { widget: widget, toggle: toggle, label: label, output: output };
  }

  function render(ui, result) {
    ui.widget.setAttribute("data-state", result.state);
    ui.label.textContent = LABELS[result.state];
    ui.output.textContent =
      result.state === "online"
        ? JSON.stringify(result.data, null, 2)
        : "No response from the laptop — it is probably off or the tunnel is down.";
  }

  function init() {
    var mount = document.querySelector("[data-api-status]");
    if (!mount || mount.dataset.mounted === "true") return;
    mount.dataset.mounted = "true";

    var ui = build(mount);
    var expanded = false;

    function check() {
      ui.widget.setAttribute("data-state", "checking");
      ui.label.textContent = LABELS.checking;

      return fetchStatus().then(function (result) {
        writeCache(result);
        render(ui, result);
        return result;
      });
    }

    ui.toggle.addEventListener("click", function () {
      expanded = !expanded;
      ui.output.hidden = !expanded;
      ui.toggle.setAttribute("aria-expanded", String(expanded));
      /* Opening it is also how you force a re-check. */
      if (expanded) check();
    });

    /* Check once per session — moving between pages shouldn't re-hit the
       tunnel on every load. */
    var cached = readCache();
    if (cached) render(ui, cached);
    else check();
  }

  window.initApiStatus = init;

  /* If the footer already exists (script order changed), mount immediately. */
  if (document.querySelector("[data-api-status]")) init();
})();
