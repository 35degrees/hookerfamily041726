(function () {
  var rel = window.__rel || 'parent'; window.__busy = null;
  var a = document.querySelector('.page-container a[data-relation="' + rel + '"]');
  var t0 = performance.now(); var pings = []; var frames = []; var mountAt = null; var stop = false;
  var mo = new MutationObserver(function () { if (mountAt === null && document.querySelectorAll('.featured-flight').length > 1) mountAt = performance.now() - t0; });
  mo.observe(document.body, { childList: true, subtree: true });
  // main-thread availability: a MessageChannel ping loop; a gap between pings = the main thread was busy
  var ch = new MessageChannel(); ch.port1.onmessage = function () { pings.push(performance.now() - t0); if (!stop) ch.port2.postMessage(0); };
  ch.port2.postMessage(0);
  function raf(now) { frames.push(now - t0); if (now - t0 < 700) requestAnimationFrame(raf); else finish(); }
  requestAnimationFrame(raf);
  a.click();
  function finish() {
    stop = true; mo.disconnect();
    var gaps = []; for (var i = 1; i < pings.length; i++) { var g = pings[i] - pings[i - 1]; if (g > 8) gaps.push(Math.round(pings[i - 1]) + '→' + Math.round(pings[i]) + ' (' + Math.round(g) + 'ms busy)'); }
    window.__busy = JSON.stringify({ mount: mountAt && Math.round(mountAt), frames: frames.slice(0, 14).map(Math.round), mainThreadBusy: gaps.slice(0, 12) });
  }
  return 'ok';
})();
