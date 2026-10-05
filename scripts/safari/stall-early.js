(function(){ var fired=false; var mo=new MutationObserver(function(){ if(!fired && document.querySelectorAll('.featured-flight').length>1){ fired=true; mo.disconnect(); setTimeout(function(){ var t=performance.now(); while(performance.now()-t<150){} window.__stalled=Math.round(t); },70);} }); mo.observe(document.body,{childList:true,subtree:true}); })();
window.__rel="parent"; window.__patched=true; (function () {
  window.__hl = []; var T0 = performance.now(); var L = function (m) { window.__hl.push(Math.round(performance.now() - T0) + ' ' + m); };
  if (!window.__patched) {
    window.__patched = true;
    var oa = Element.prototype.animate;
    Element.prototype.animate = function (kf, o) { var a = oa.apply(this, arguments); if (this.classList && this.classList.contains('featured-flight')) { var n = Array.isArray(kf) ? kf.length : -1; L('animate n=' + n + ' dur=' + Math.round(o && o.duration || 0)); a.__n = n; } return a; };
    var op = Animation.prototype.pause; Animation.prototype.pause = function () { L('pause at currentTime=' + Math.round(this.currentTime || 0) + ' n=' + this.__n); return op.apply(this, arguments); };
    var ol = Animation.prototype.play; Animation.prototype.play = function () { if (this.__n > 2) L('play at currentTime=' + Math.round(this.currentTime || 0)); return ol.apply(this, arguments); };
  }
  var a = document.querySelector('.page-container a[data-relation="' + (window.__rel || 'parent') + '"]');
  var r = a.getBoundingClientRect(); var opt = { bubbles: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, pointerType: 'mouse' };
  ['pointerover', 'pointerenter', 'mouseover', 'mouseenter', 'pointermove', 'mousemove'].forEach(function (t) { a.dispatchEvent(t.indexOf('pointer') === 0 ? new PointerEvent(t, opt) : new MouseEvent(t, opt)); });
  L('hovered');
  setTimeout(function () {
    ['pointerdown', 'mousedown'].forEach(function (t) { a.dispatchEvent(t.indexOf('pointer') === 0 ? new PointerEvent(t, opt) : new MouseEvent(t, opt)); });
    L('click'); a.click();
    var old = document.querySelector('.featured-flight'); var t1 = performance.now();
    (function tick() { var cards = document.querySelectorAll('.featured-flight'); var inc = cards[cards.length - 1];
      if (inc && inc !== old) { var w = Math.round(inc.getBoundingClientRect().width); L('rAF arriving width=' + w); }
      if (performance.now() - t1 < 260) requestAnimationFrame(tick); else window.__hres = window.__hl.join('\n'); })();
  }, 700);
  return 'ok';
})();
