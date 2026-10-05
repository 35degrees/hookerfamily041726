(function(){
  window.__lp=[]; var T0=performance.now(); var last=null;
  var a=document.querySelector('a.cc-link[href="/samuel-clemens-1835"]');
  var r=a.getBoundingClientRect(); var o={bubbles:true,clientX:r.left+r.width/2,clientY:r.top+r.height/2,pointerType:'mouse'};
  ['pointerover','pointerenter','mouseover','mouseenter','pointermove','mousemove'].forEach(function(t){a.dispatchEvent(t.indexOf('pointer')===0?new PointerEvent(t,o):new MouseEvent(t,o));});
  setTimeout(function(){
    ['pointerdown','mousedown'].forEach(function(t){a.dispatchEvent(t.indexOf('pointer')===0?new PointerEvent(t,o):new MouseEvent(t,o));});
    a.click(); T0=performance.now();
    (function tick(){
      var h=[...document.querySelectorAll('.featured-card h1')].find(function(e){return /Clemens/.test(e.textContent);});
      if(h){ var card=h.closest('.featured-card'); var fl=h.closest('.featured-flight');
        var hb=h.getBoundingClientRect(), nb=card.querySelector('.narrative-blocks h3'), nbb=nb?nb.getBoundingClientRect():null, cb=card.getBoundingClientRect();
        var row=Math.round(performance.now()-T0)+' h1top='+(hb.top-cb.top).toFixed(2)+' h1H='+hb.height.toFixed(2)+' h1fs='+getComputedStyle(h.parentElement).fontSize+'/'+getComputedStyle(h).fontSize+' nbTop='+(nbb?(nbb.top-cb.top).toFixed(2):'-')+' cardTop='+cb.top.toFixed(2)+' scale='+(cb.width/925).toFixed(4)+' tf='+getComputedStyle(fl).transform.slice(0,22)+' flat='+fl.classList.contains('flat');
        var key=row.replace(/^\d+ /,''); if(key!==last){ window.__lp.push(row); last=key; } }
      if(performance.now()-T0<3000) requestAnimationFrame(tick);
    })();
  },700);
  return 'ok';
})();
