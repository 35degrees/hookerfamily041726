(function () {
  var rel = window.__rel || 'child';
  window.__m = null;
  var a = document.querySelector('.page-container a[data-relation="' + rel + '"]');
  if (!a) { window.__m = JSON.stringify({ err: 'no chip ' + rel }); return 'nochip'; }
  var f = []; var t0 = performance.now(); var id = 0;
  function tick(now) {
    f.push({ t: now - t0, r: Array.prototype.map.call(document.querySelectorAll('.featured-flight'), function (e) { if (!e.__id) e.__id = ++id; var r = e.getBoundingClientRect(); return [e.__id, Math.round(r.left), Math.round(r.top), Math.round(r.width)]; }) });
    if (now - t0 < 2200) requestAnimationFrame(tick); else finish();
  }
  function rep(fid) {
    var tr = f.map(function (x) { return { t: x.t, r: x.r.find(function (r) { return r[0] === fid; }) }; }).filter(function (x) { return x.r; });
    var mv = tr.filter(function (x, i) { return i > 0 && (x.r[1] !== tr[i-1].r[1] || x.r[2] !== tr[i-1].r[2] || x.r[3] !== tr[i-1].r[3]); });
    if (!mv.length) return 'no motion';
    var mg = 0; for (var i = 1; i < mv.length; i++) mg = Math.max(mg, mv[i].t - mv[i-1].t);
    return mv.length + ' frames / ' + Math.round(mv[mv.length-1].t - mv[0].t) + 'ms, longest gap ' + Math.round(mg) + 'ms, first width ' + mv[0].r[3];
  }
  function finish() {
    var ids = []; f.forEach(function (x) { x.r.forEach(function (r) { if (ids.indexOf(r[0]) < 0) ids.push(r[0]); }); });
    var surv = f[f.length-1].r[0][0]; var out = ids.filter(function (i) { return i !== surv; });
    window.__m = JSON.stringify({ webkit: document.documentElement.classList.contains('webkit'), rafFps: Math.round(f.length / (f[f.length-1].t / 1000)), arriving: rep(surv), departing: out.length ? rep(out[0]) : 'n/a' });
  }
  requestAnimationFrame(tick); a.click();
  return 'started';
})();
