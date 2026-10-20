/**
 * promotion-sampler.js — one parent-chip promotion, every element's rect and opacity on every frame (Oct 19, 2026).
 * Runs IN THE PAGE, identically in Chrome (scripts/safari/chrome-sample.mjs) and in Safari (AppleScript
 * "do JavaScript"), so the two engines can be compared curve for curve (roadmap §62). Edit the three things
 * marked EDIT for another click: the clicked parent's href, the arriving children to track, the demoted seat.
 * Result: window.__S = { ok, rows: [{ t, <child>: [top, opacity], card: [l,t,w,h,op], seat: [l,t,w,h,op] }] }.
 */
(function(){
  /* EDIT: the parent chip clicked */ var S=window.__S={ok:false,rows:[]}; var a=document.querySelector('.page-container a[href="/sarah-dwight-1764"]'); if(!a){S.err='nolink';return;}
  var r=a.getBoundingClientRect(); var opt={bubbles:true,clientX:r.left+r.width/2,clientY:r.top+r.height/2,pointerType:'mouse'};
  ['pointerover','pointerenter','mouseover','mouseenter','pointermove','mousemove'].forEach(function(t){a.dispatchEvent(t.indexOf('pointer')===0?new PointerEvent(t,opt):new MouseEvent(t,opt));});
  setTimeout(function(){ var t0=performance.now(); a.click();
    var chipOf=function(slug){ var x=document.querySelector('.children-slot a[href="/'+slug+'"]'); return x? x.closest('.flight'):null; };
    var op=function(el){ var o=1; while(el&&el!==document.body){ o*=parseFloat(getComputedStyle(el).opacity); el=el.parentElement; } return o; };
    (function f(){ var t=performance.now()-t0; var row={t:Math.round(t)};
      /* EDIT: arriving children */ ['george-hooker-1793','worthington-hooker-1806','clarissa-hooker-1804'].forEach(function(s){ var c=chipOf(s); if(c){ var b=c.getBoundingClientRect(); row[s.split('-')[0]]=[+b.top.toFixed(1), +op(c).toFixed(2)]; } });
      var lv=[].filter.call(document.querySelectorAll('.featured-flight'),function(e){return e.classList.contains('leaving')||e.hasAttribute('data-leaving');})[0];
      if(lv){ var b=lv.getBoundingClientRect(); row.card=[+b.left.toFixed(1),+b.top.toFixed(1),+b.width.toFixed(1),+b.height.toFixed(1),+op(lv).toFixed(2)]; }
      /* EDIT: the demoted card's seat */ var seat=chipOf('john-hooker-1791-2'); if(seat){ var b2=seat.getBoundingClientRect(); row.seat=[+b2.left.toFixed(1),+b2.top.toFixed(1),+b2.width.toFixed(1),+b2.height.toFixed(1),+op(seat).toFixed(2)]; }
      S.rows.push(row); if(t<1600) requestAnimationFrame(f); else S.ok=true; })();
  },700);
})();
