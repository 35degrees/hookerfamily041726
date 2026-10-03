(function () {
  // experiment only: drop the inherited custom properties the flights write every frame
  var oa = Element.prototype.animate;
  Element.prototype.animate = function (kf, o) {
    if (this.classList && this.classList.contains('featured-flight') && Array.isArray(kf)) {
      kf = kf.map(function (k) { var c = {}; for (var p in k) if (p.indexOf('--') !== 0) c[p] = k[p]; return c; });
    }
    return oa.call(this, kf, o);
  };
  var sp = CSSStyleDeclaration.prototype.setProperty;
  CSSStyleDeclaration.prototype.setProperty = function (n, v, pr) { if (n && n.indexOf('--') === 0 && (n === '--r-kx' || n === '--r-ky' || n === '--shadow-k' || n === '--shadow-fade')) return; return sp.call(this, n, v, pr); };
  return 'patched';
})();
