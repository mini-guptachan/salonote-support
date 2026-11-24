/* Ohm Software: the publisher's portfolio page view, for a product website that already runs its own,
   disclosed Google Analytics (salonote, Kanji Bento). Loaded on the home page only, with its two companions
   ohm-portfolio-frame.html and ohm-portfolio-frame.js in the same folder:

     <script src="/assets/ohm-portfolio-view.js" defer data-ga-id="G-…" data-page="https://host/canonical/path/"
             data-group="salonote" data-site-ga-id="G-… (the site's own property)" data-cookie-days="180"></script>

   Rules this file keeps:
   - It follows the site's own analytics switch: it sends only while the site's own tag is running, and stops
     (and deletes its cookies) when the visitor turns that off. Global Privacy Control or Do Not Track keeps it off.
   - It never touches the site's own tag. Google's tag for the portfolio runs inside a hidden same-origin frame,
     in a window of its own, so the site's events never reach the portfolio property, this page view never
     reaches the site's property, and the site's own queue, configuration and cookies are left alone.
     (Loading a second tag in the same window, even with its own queue, made Google's tag send an extra page view
     with the full address. Measured on 2026-11-24; see reports/ohm-product-seo/direct-analytics.md.)
   - One page_view per page load, with the canonical address (data-page: no query string, no fragment) and only
     the origin of the referrer. No other event. Named destination (send_to) and product group (content_group).
   - Advertising storage, ad user data, ad personalisation and Google signals stay off.
   - Cookies are host-only and prefixed "ohm". */
(function () {
  'use strict';
  var script = document.currentScript;
  if (!script) return;
  var ID = script.getAttribute('data-ga-id') || '';
  var SITE_ID = script.getAttribute('data-site-ga-id') || '';
  var PAGE = script.getAttribute('data-page') || '';
  var GROUP = script.getAttribute('data-group') || '';
  var DAYS = parseInt(script.getAttribute('data-cookie-days'), 10) || 180;
  var valid = /^G-[A-Z0-9]{6,14}$/;
  if (!valid.test(ID) || !valid.test(SITE_ID) || ID === SITE_ID || !GROUP) return;

  // Only the page this tag was written for is measured (not a preview host, not another path).
  var page;
  try { page = new URL(PAGE); } catch (error) { return; }
  var trim = function (path) { return path.replace(/(index\.html|\/)$/, '') || '/'; };
  if (page.protocol !== 'https:' || location.protocol !== 'https:' || location.hostname !== page.hostname || trim(location.pathname) !== trim(page.pathname)) return;
  PAGE = page.origin + page.pathname;

  var REFERRER = '';
  try {
    var from = new URL(document.referrer);
    if (/^https?:$/.test(from.protocol)) REFERRER = from.origin + '/';
  } catch (error) { /* no referrer */ }

  var signal = function () {
    return navigator.globalPrivacyControl === true || navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.msDoNotTrack === '1';
  };
  // The site's own analytics is running: its gtag exists and it has not been switched off.
  var siteOn = function () {
    return typeof window.gtag === 'function' && window['ga-disable-' + SITE_ID] !== true;
  };
  var clearCookies = function () {
    document.cookie.split(';').forEach(function (part) {
      var name = part.split('=')[0].trim();
      if (name.indexOf('ohm_ga') === 0) document.cookie = name + '=; Max-Age=0; Path=/; SameSite=Lax; Secure';
    });
  };

  // The page view is sent from a hidden same-origin frame (ohm-portfolio-frame.html next to this file). The frame
  // exists only while analytics is on, and at most once per page load.
  var FRAME = new URL('ohm-portfolio-frame.html', script.src).href;
  var frame = null, viewed = false;

  var sync = function () {
    var on = siteOn() && !signal();
    if (!on) {
      if (frame) {
        try { frame.contentWindow.ohmPortfolioStop(); } catch (error) { /* frame not ready */ }
        frame.remove();
        frame = null;
      }
      clearCookies();
      return;
    }
    if (viewed) return;
    viewed = true;
    frame = document.createElement('iframe');
    frame.hidden = true;
    frame.tabIndex = -1;
    frame.title = '';
    frame.setAttribute('aria-hidden', 'true');
    frame.referrerPolicy = 'no-referrer';
    frame.dataset.gaId = ID;
    frame.dataset.page = PAGE;
    frame.dataset.group = GROUP;
    frame.dataset.title = document.title;
    frame.dataset.referrer = REFERRER;
    frame.dataset.cookieDays = String(DAYS);
    frame.src = FRAME;
    document.body.appendChild(frame);
  };

  var init = function () {
    sync();
    // The site's switch (where it has one) is a button: look again after any click has been handled.
    document.addEventListener('click', function () { setTimeout(sync, 0); });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
