/* Google Analytics (gtag.js). Lifted out of every page head so the
   measurement ID lives in one place. */

(function () {
  "use strict";

  var MEASUREMENT_ID = "G-36P5QKRMDY";

  var tag = document.createElement("script");
  tag.async = true;
  tag.src = "https://www.googletagmanager.com/gtag/js?id=" + MEASUREMENT_ID;
  document.head.appendChild(tag);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {
    window.dataLayer.push(arguments);
  };

  window.gtag("js", new Date());
  window.gtag("config", MEASUREMENT_ID);
})();
