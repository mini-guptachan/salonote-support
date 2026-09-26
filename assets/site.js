(() => {
  "use strict";
  // Send a GA4 event when gtag is available (no-op otherwise).
  const track = (name, params) => {
    if (typeof window.gtag === "function") window.gtag("event", name, params || {});
  };
  window.salonoteTrack = track;

  // Every App Store link carries data-cta="<location>".
  document.addEventListener("click", (event) => {
    const link = event.target.closest && event.target.closest("a.js-store-link");
    if (!link) return;
    track("app_store_click", { cta_location: link.dataset.cta || "unknown", link_url: link.href });
  });
})();
