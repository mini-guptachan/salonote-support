/* Ohm Software: the publisher's portfolio page view, for a product website that already runs its own,
   disclosed Google Analytics (salonote, Kanji Bento). Loaded on the home page only, with its two companions
   ohm-portfolio-frame.html and ohm-portfolio-frame.js in the same folder, and with the footer control
   (<details class="ohm-measure">, see reports/ohm-product-seo/consent-followup.md):

     <script src="/assets/ohm-portfolio-view.js" defer data-ga-id="G-…" data-page="https://host/canonical/path/"
             data-group="salonote" data-site-ga-id="G-… (the site's own property)" data-cookie-days="180"
             data-frame="ohm-portfolio-frame"></script>

   Rules this file keeps:
   - Off until the visitor chooses "allow" in the footer control on this site. That the site's own analytics is
     running is not a choice for this second destination, and neither is a choice made on ohm.software or on
     another product site (the choice is kept in this site's own localStorage, under "ohm-portfolio-choice").
     Before "allow": no frame, no request to Google for the portfolio property, no cookie.
   - It also follows the site's own analytics switch: it sends only while the site's own tag is running, and stops
     when the visitor turns that off. Global Privacy Control or Do Not Track keeps it off, even over an earlier "allow".
   - "Turn off" stops it, deletes only its own cookies ("ohm_ga…") and is remembered, so later pages stay off.
   - It never touches the site's own tag. Google's tag for the portfolio runs inside a hidden same-origin frame,
     in a window of its own, so the site's events never reach the portfolio property, this page view never
     reaches the site's property, and the site's own queue, configuration, switch and cookies are left alone.
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
  var KEY = 'ohm-portfolio-choice';
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

  // The visitor's choice for the portfolio view, on this site only: "granted", "denied" or none (which means off).
  var memory = null;
  var readChoice = function () {
    if (memory) return memory;
    try {
      var saved = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!saved || (saved.choice !== 'granted' && saved.choice !== 'denied')) return null;
      if (typeof saved.at !== 'number' || Date.now() - saved.at > DAYS * 864e5 || saved.at > Date.now() + 864e5) return null;
      return saved.choice;
    } catch (error) { return null; }
  };
  var saveChoice = function (choice) {
    // Where storage is blocked the choice lasts for this page.
    try { localStorage.setItem(KEY, JSON.stringify({ choice: choice, at: Date.now() })); memory = null; } catch (error) { memory = choice; }
  };

  var clearCookies = function () {
    document.cookie.split(';').forEach(function (part) {
      var name = part.split('=')[0].trim();
      if (name.indexOf('ohm_ga') === 0) document.cookie = name + '=; Max-Age=0; Path=/; SameSite=Lax; Secure';
    });
  };

  // "signal": the browser refuses; "off": not allowed (the default); "site": allowed here, but the site's own
  // analytics is turned off; "on": allowed and running.
  var state = function () {
    if (signal()) return 'signal';
    if (readChoice() !== 'granted') return 'off';
    return siteOn() ? 'on' : 'site';
  };

  var all = function (selector) { return Array.prototype.slice.call(document.querySelectorAll(selector)); };
  var render = function (now, announce) {
    all('[data-ohm-portfolio="status"]').forEach(function (node) {
      var text = node.getAttribute('data-' + now) || node.getAttribute('data-off') || '';
      if (announce || node.textContent !== text) node.textContent = text;
    });
    all('[data-ohm-portfolio="controls"]').forEach(function (node) { node.hidden = now === 'signal'; });
    var choice = readChoice();
    all('button[data-ohm-portfolio="allow"]').forEach(function (node) { node.setAttribute('aria-pressed', String(now !== 'signal' && choice === 'granted')); });
    all('button[data-ohm-portfolio="deny"]').forEach(function (node) { node.setAttribute('aria-pressed', String(now !== 'signal' && choice === 'denied')); });
  };

  // The page view is sent from a hidden same-origin frame (ohm-portfolio-frame.html next to this file). The frame
  // exists only while the view is allowed and on, and at most once per page load.
  // data-frame names the frame document where the host serves it without ".html" (a redirect inside the frame would
  // carry the page's own frame-ancestors policy and be refused).
  var FRAME = new URL(script.getAttribute('data-frame') || 'ohm-portfolio-frame.html', script.src).href;
  var frame = null, viewed = false;

  var sync = function (announce) {
    var now = state();
    if (now !== 'on') {
      if (frame) {
        try { frame.contentWindow.ohmPortfolioStop(); } catch (error) { /* frame not ready */ }
        frame.remove();
        frame = null;
      }
      clearCookies();
    } else if (!viewed) {
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
    }
    render(now, announce === true);
  };

  var init = function () {
    sync(false);
    document.addEventListener('click', function (event) {
      var button = event.target && event.target.closest ? event.target.closest('button[data-ohm-portfolio]') : null;
      var kind = button ? button.getAttribute('data-ohm-portfolio') : '';
      if (kind === 'allow' || kind === 'deny') {
        if (!signal()) saveChoice(kind === 'allow' ? 'granted' : 'denied');
        sync(true);
        return;
      }
      // The site's own switch (where it has one) is a button: look again after any click has been handled.
      setTimeout(sync, 0);
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
