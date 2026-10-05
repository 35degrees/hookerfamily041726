(function(){
  var rel=window.__rel||'parent'; window.__calls=null; var T0=performance.now(); var win=false; var acc={};
  function add(k,d,stack){ if(!win) return; var e=acc[k]||(acc[k]={n:0,ms:0,top:{}}); e.n++; e.ms+=d; if(d>0.5&&stack){ var s=(new Error().stack||'').split('\n')[2]||''; s=s.replace(/https?:\/\/[^/]+\//,'').replace(/\?[^:]*/,'').slice(0,90); e.top[s]=(e.top[s]||0)+d; } }
  if(!window.__callsP){ window.__callsP=1; window.__add=null;
    [['getBoundingClientRect',Element.prototype],['getClientRects',Element.prototype],['animate',Element.prototype]].forEach(function(p){ var o=p[1][p[0]]; p[1][p[0]]=function(){ var t=performance.now(); try{ return o.apply(this,arguments);} finally{ window.__add&&window.__add(p[0],performance.now()-t,true);} }; });
    var gcs=window.getComputedStyle; window.getComputedStyle=function(){ var t=performance.now(); try{ return gcs.apply(window,arguments);} finally{ window.__add&&window.__add('getComputedStyle',performance.now()-t,true);} };
    ['offsetWidth','offsetHeight','offsetTop','offsetLeft','clientWidth','clientHeight','scrollHeight','scrollWidth'].forEach(function(k){ var proto=k.indexOf('offset')===0?HTMLElement.prototype:Element.prototype; var d=Object.getOwnPropertyDescriptor(proto,k); if(!d) return; Object.defineProperty(proto,k,{configurable:true,get:function(){ var t=performance.now(); try{ return d.get.call(this);} finally{ window.__add&&window.__add(k,performance.now()-t,true);} }}); });
  }
  window.__add=add;
  var r={}; var mo=new MutationObserver(function(){ if(r.mount==null && document.querySelectorAll('.featured-flight').length>1){ r.mount=Math.round(performance.now()-T0); mo.disconnect(); requestAnimationFrame(function(){ r.raf1=Math.round(performance.now()-T0); win=false; setTimeout(fin,300); }); } });
  mo.observe(document.body,{childList:true,subtree:true});
  var a=document.querySelector('.page-container a[data-relation="'+rel+'"]'); T0=performance.now(); win=true; a.click();
  function fin(){ var out={}; for(var k in acc){ var e=acc[k]; var tops=Object.entries(e.top).sort(function(x,y){return y[1]-x[1];}).slice(0,4).map(function(x){return Math.round(x[1]*10)/10+'ms '+x[0].trim();}); out[k]={n:e.n,ms:Math.round(e.ms*10)/10,top:tops}; }
    window.__calls=JSON.stringify({path:location.pathname,r:r,calls:out}); }
  return 'ok'; })();
