/* ==========================================================================
   Shared site chrome.

   There is no nav bar. Each page gets a near-invisible top row (back on the
   left, name on the right) plus a footer carrying a quiet section list.
   Both are defined here once and injected, so adding a page means adding a
   single entry to PAGES below.
   ========================================================================== */

(function () {
  "use strict";

  var SITE_NAME = "Benjamin Ward";
  var HOME = "index.html";

  /* Single source of truth: drives the footer list and the back-link labels. */
  var PAGES = [
    { href: "index.html", label: "Home" },
    { href: "education.html", label: "Education" },
    { href: "work-experience.html", label: "Work Experience" },
    { href: "work-projects.html", label: "Work Projects" },
    { href: "personal-projects.html", label: "Personal Projects" },
    { href: "certifications.html", label: "Certifications" },
    { href: "skills.html", label: "Skills & Tech" },
    { href: "extracurricular.html", label: "Extracurricular" },
    { href: "cv.html", label: "CV" }
  ];

  var CONTACT = [
    { href: "mailto:Benjaminward2405@gmail.com", label: "Email" },
    {
      href: "https://www.linkedin.com/in/benjamin-ward-256851217",
      label: "LinkedIn"
    },
    { href: "https://github.com/Benjamin2244", label: "GitHub" }
  ];

  /* ------------------------------------------------------------------------
     Helpers
     ------------------------------------------------------------------------ */

  /* Last path segment. Paths stay relative and flat, so the filename alone
     identifies a page — and this keeps working under the GitHub Pages
     /laptop-api-demo/ prefix, where a leading-slash path would not. */
  function fileOf(pathname) {
    var segment = pathname.split("/").pop();
    return segment === "" ? HOME : segment;
  }

  function labelFor(file) {
    for (var i = 0; i < PAGES.length; i++) {
      if (PAGES[i].href === file) return PAGES[i].label;
    }
    return null;
  }

  function currentFile() {
    return fileOf(window.location.pathname);
  }

  function isHome() {
    return currentFile() === HOME;
  }

  function el(tag, props, children) {
    var node = document.createElement(tag);
    Object.keys(props || {}).forEach(function (key) {
      if (key === "class") node.className = props[key];
      else if (key === "text") node.textContent = props[key];
      else node.setAttribute(key, props[key]);
    });
    (children || []).forEach(function (child) {
      node.appendChild(child);
    });
    return node;
  }

  function link(href, label, className) {
    var a = el("a", { href: href, class: className || "" , text: label });
    if (/^https?:/.test(href)) {
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener");
    }
    return a;
  }

  /* ------------------------------------------------------------------------
     Back-link resolution

     A project page can be reached from several sections, so back is resolved
     at runtime rather than hardcoded:

       1. A same-origin referrer is the real previous page — use it, and label
          it by name so the reader knows where they are returning to.
       2. Otherwise (deep link, shared URL, new tab, off-site referrer) fall
          back to the parent this page declares via data-back on <main>.

     history.back() is only used in case 1, where the referrer proves there is
     a same-origin entry in this tab's history — so it can never bounce the
     visitor off the site.
     ------------------------------------------------------------------------ */

  function referrerTarget() {
    if (!document.referrer) return null;

    var ref;
    try {
      ref = new URL(document.referrer);
    } catch (err) {
      return null;
    }

    if (ref.origin !== window.location.origin) return null;

    var file = fileOf(ref.pathname);

    /* A referrer pointing at this same page (self-link, form post, some
       reloads) would make back a no-op — treat it as no referrer. */
    if (file === currentFile()) return null;

    return { href: ref.href, file: file };
  }

  function resolveBack(main) {
    var fromReferrer = referrerTarget();

    if (fromReferrer) {
      return {
        href: fromReferrer.href,
        label: labelFor(fromReferrer.file) || "Back",
        useHistory: window.history.length > 1
      };
    }

    var declared = (main && main.getAttribute("data-back")) || HOME;
    return {
      href: declared,
      label: labelFor(fileOf(declared)) || "Home",
      useHistory: false
    };
  }

  /* ------------------------------------------------------------------------
     Topbar
     ------------------------------------------------------------------------ */

  function renderTopbar() {
    var mount = document.querySelector("[data-topbar]");
    if (!mount) return;

    /* Home is the destination — nothing to go back to, and the hero already
       carries the name. */
    if (isHome()) {
      mount.remove();
      return;
    }

    var back = resolveBack(document.querySelector("main"));

    var backLink = el("a", {
      href: back.href,
      class: "topbar__back",
      text: "← " + back.label
    });

    if (back.useHistory) {
      backLink.addEventListener("click", function (event) {
        /* Let modified clicks (new tab, download) use the real href. */
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        if (event.button !== 0) return;
        event.preventDefault();
        window.history.back();
      });
    }

    var row = el("div", { class: "topbar container" }, [
      backLink,
      el("a", { href: HOME, class: "topbar__home", text: SITE_NAME })
    ]);

    mount.replaceChildren(row);
  }

  /* ------------------------------------------------------------------------
     Footer
     ------------------------------------------------------------------------ */

  function renderFooter() {
    var mount = document.querySelector("[data-site-footer]");
    if (!mount) return;

    var here = currentFile();

    var sectionItems = PAGES.filter(function (page) {
      return page.href !== HOME;
    }).map(function (page) {
      var a = link(page.href, page.label);
      if (page.href === here) a.setAttribute("aria-current", "page");
      return el("li", {}, [a]);
    });

    var sections = el("nav", { "aria-label": "Sections" }, [
      el("h2", { class: "footer__heading", text: "Sections" }),
      el("ul", { class: "footer__links" }, sectionItems)
    ]);

    var contact = el("div", {}, [
      el("h2", { class: "footer__heading", text: "Contact" }),
      el(
        "ul",
        { class: "footer__links" },
        CONTACT.map(function (item) {
          return el("li", {}, [link(item.href, item.label)]);
        })
      )
    ]);

    var bottom = el("div", { class: "footer__bottom" }, [
      el("span", {
        text: "© " + new Date().getFullYear() + " " + SITE_NAME
      }),
      el("div", { "data-api-status": "" })
    ]);

    mount.className = "site-footer";
    mount.replaceChildren(
      el("div", { class: "container" }, [
        el("div", { class: "footer__grid" }, [sections, contact]),
        bottom
      ])
    );

    /* The API widget mounts into the footer, so it can only run once the
       footer exists. */
    if (window.initApiStatus) window.initApiStatus();
  }

  renderTopbar();
  renderFooter();
})();
