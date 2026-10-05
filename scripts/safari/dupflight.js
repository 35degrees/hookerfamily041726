(function () {
  var seq = ['spouse', 'spouse', 'parent', 'child', 'sibling', 'child', 'parent'];
  var log = []; var i = 0;
  function vis(e) { var o = 1, n = e; while (n && n !== document.body) { o *= parseFloat(getComputedStyle(n).opacity || 1); n = n.parentElement; } var r = e.getBoundingClientRect(); return o > 0.5 && r.width > 4; }
  function dups() {
    var m = {}; Array.prototype.forEach.call(document.querySelectorAll('[data-flight-id]'), function (e) { if (vis(e)) { var k = e.dataset.flightId; m[k] = (m[k] || 0) + 1; } });
    return Object.keys(m).filter(function (k) { return m[k] > 1; }).map(function (k) { return k + 'x' + m[k]; });
  }
  function step() {
    if (i >= seq.length) { window.__dup = log.join(' | '); return; }
    var rel = seq[i++]; var a = document.querySelector('.page-container a[data-relation="' + rel + '"]');
    if (!a) { log.push(rel + ':none'); return setTimeout(step, 100); }
    a.click(); var mid={}; var t0=performance.now(); (function samp(){ dups().forEach(function(k){ mid[k]=1; }); if (performance.now()-t0<1800) requestAnimationFrame(samp); })();
    setTimeout(function () { var d = dups(); log.push(rel + ' -> ' + location.pathname.slice(1, 24) + ' cards=' + document.querySelectorAll('.featured-flight').length + ' dupChips=' + (d.length ? d.join(',') : 'none') + ' midFlightDups=' + (Object.keys(mid).length ? Object.keys(mid).join(',') : 'none')); step(); }, 2000);
  }
  window.__dup = null; step(); return 'ok';
})();
