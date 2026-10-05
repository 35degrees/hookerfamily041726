(function(){
  var rel=window.__rel||'parent'; window.__bud=null; var T0=performance.now(); var r={};
  var pings=[], stop=false; var ch=new MessageChannel(); ch.port1.onmessage=function(){pings.push(performance.now()-T0); if(!stop) ch.port2.postMessage(0);}; ch.port2.postMessage(0);
  var mo=new MutationObserver(function(){ if(r.mount==null && document.querySelectorAll('.featured-flight').length>1){ r.mount=performance.now()-T0;
      var t=performance.now(); document.body.getBoundingClientRect(); var x=document.querySelectorAll('.featured-flight'); x[x.length-1].getBoundingClientRect(); r.layoutAtMount=+(performance.now()-t).toFixed(1); r.afterLayout=performance.now()-T0;
      requestAnimationFrame(function(ts){ r.raf1=performance.now()-T0; var t2=performance.now(); document.body.getBoundingClientRect(); r.layoutInRaf=+(performance.now()-t2).toFixed(1);
        requestAnimationFrame(function(){ r.raf2=performance.now()-T0; }); });
      mo.disconnect(); } });
  mo.observe(document.body,{childList:true,subtree:true});
  var frames=[]; function raf(n){ frames.push(Math.round(n-T0)); if(n-T0<400) requestAnimationFrame(raf); else fin(); } requestAnimationFrame(raf);
  var a=document.querySelector('.page-container a[data-relation="'+rel+'"]'); T0=performance.now(); a.click();
  function fin(){ stop=true; var g=[]; for(var i=1;i<pings.length;i++){var d=pings[i]-pings[i-1]; if(d>6) g.push(Math.round(pings[i-1])+'-'+Math.round(pings[i]));}
    for (var k in r) if (typeof r[k]==='number') r[k]=Math.round(r[k]*10)/10;
    window.__bud=JSON.stringify({path:location.pathname, r:r, frames:frames.slice(0,9), busy:g.slice(0,6)}); }
  return 'ok'; })();
