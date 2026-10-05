// Films a zone path in ONE take (the X's door lives in page memory, so a reload would lose it).
// window.__chain = ['cc:john-talcott-1594', 'cc:john-davenport-1597', 'x'] (also 'rel:child' / 'rel:spouse' …) — each step is hovered, then
// clicked 600ms later, then the next step starts 2600ms after that. Log in window.__chainLog.
(function () {
  var steps = window.__chain || ['cc:john-talcott-1594', 'cc:john-davenport-1597', 'x'];
  var T0 = performance.now(); var log = window.__chainLog = [];
  function L(m) { log.push(Math.round(performance.now() - T0) + ' ' + m); }
  function find(s) {
    if (s === 'x') return document.querySelector('button[aria-label="Return to the card you came from"]');
    if (s.indexOf('rel:') === 0) return document.querySelector('.page-container a[data-relation="' + s.slice(4) + '"]');
    var slug = s.slice(3); return document.querySelector('a.cc-link[href="/' + slug + '"]');
  }
  function fire(el, types) { var r = el.getBoundingClientRect(); var o = { bubbles: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, pointerType: 'mouse' };
    types.forEach(function (t) { el.dispatchEvent(t.indexOf('pointer') === 0 ? new PointerEvent(t, o) : new MouseEvent(t, o)); }); }
  var i = 0;
  (function next() {
    if (i >= steps.length) { L('done ' + location.pathname); return; }
    var s = steps[i++]; var el = find(s);
    if (!el) { L('MISSING ' + s + ' on ' + location.pathname); return; }
    fire(el, ['pointerover', 'pointerenter', 'mouseover', 'mouseenter', 'pointermove', 'mousemove']); L('hover ' + s);
    setTimeout(function () { fire(el, ['pointerdown', 'mousedown']); el.click(); L('click ' + s + ' from ' + location.pathname); setTimeout(next, 2600); }, 600);
  })();
  return 'ok';
})();
