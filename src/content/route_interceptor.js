// Classroom Suite - Route Interceptor (Runs in MAIN world)
// Intercepts HTML5 history navigation in Google Classroom SPA without CSP restrictions
(function () {
  'use strict';
  if (window.__CLASSROOM_SUITE_INTERCEPTOR__) return;
  window.__CLASSROOM_SUITE_INTERCEPTOR__ = true;

  const notifyRouteChange = () => {
    try {
      window.dispatchEvent(new CustomEvent('__CLASSROOM_SUITE_ROUTE_CHANGE__', {
        detail: { url: window.location.href }
      }));
    } catch (e) {}
  };

  const origPushState = history.pushState;
  if (typeof origPushState === 'function') {
    history.pushState = function () {
      const result = origPushState.apply(this, arguments);
      notifyRouteChange();
      return result;
    };
  }

  const origReplaceState = history.replaceState;
  if (typeof origReplaceState === 'function') {
    history.replaceState = function () {
      const result = origReplaceState.apply(this, arguments);
      notifyRouteChange();
      return result;
    };
  }

  window.addEventListener('popstate', notifyRouteChange);
  window.addEventListener('hashchange', notifyRouteChange);
  window.addEventListener('pageshow', notifyRouteChange);
})();
