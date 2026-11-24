/* Ohm Software: runs inside the hidden same-origin frame that ohm-portfolio-view.js adds to a product home page.
   The frame gives Google's tag a window of its own, so it shares nothing with the site's own Google Analytics tag:
   no queue, no configuration, no events. It sends exactly one page_view, with the values the parent page wrote on
   the frame element (canonical address, origin-only referrer, product group), and nothing else. */
(function () {
  'use strict';
  var frame = window.frameElement;
  if (!frame || window.parent === window) return;
  var data = frame.dataset;
  var ID = data.gaId || '', PAGE = data.page || '', GROUP = data.group || '', TITLE = data.title || '', REFERRER = data.referrer || '';
  var DAYS = parseInt(data.cookieDays, 10) || 180;
  if (!/^G-[A-Z0-9]{6,14}$/.test(ID) || !/^https:\/\/[^?#]+$/.test(PAGE) || !GROUP) return;
  if (REFERRER && !/^https?:\/\/[^\/?#]+\/$/.test(REFERRER)) REFERRER = '';
  // The frame is requested with referrerpolicy="no-referrer", so the tag cannot fall back to the parent's address.
  if (document.referrer) return;

  window.dataLayer = [];
  var gtag = function () { window.dataLayer.push(arguments); };
  gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'granted' });
  // As in ohm-analytics.js: the settings go in `set` first, because the portfolio property's Google tag ignores the
  // parameters of an on-page `config` (it would send its own page view with this frame's address and use `_ga`
  // cookies). `set` is global to a window, which is one more reason this runs in a window of its own.
  var settings = {
    send_page_view: false,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    cookie_domain: 'none',
    cookie_prefix: 'ohm',
    cookie_expires: DAYS * 86400,
    cookie_flags: 'SameSite=Lax;Secure',
    page_location: PAGE,
    page_title: TITLE
  };
  if (REFERRER) settings.page_referrer = REFERRER;
  gtag('set', settings);
  gtag('js', new Date());
  gtag('config', ID, settings);
  var view = { send_to: ID, page_location: PAGE, page_title: TITLE, content_group: GROUP, site_role: 'product_site' };
  if (REFERRER) view.page_referrer = REFERRER;
  gtag('event', 'page_view', view);

  window.ohmPortfolioStop = function () {
    window['ga-disable-' + ID] = true;
    gtag('consent', 'update', { analytics_storage: 'denied' });
  };

  var tag = document.createElement('script');
  tag.async = true;
  tag.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(ID);
  document.head.appendChild(tag);
})();
