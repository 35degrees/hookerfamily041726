(function(){ var d=document.createElement('div'); d.style.cssText='position:fixed;left:40px;top:40px;width:200px;height:200px;background:#e11;z-index:99999;will-change:transform'; document.body.appendChild(d);
 setTimeout(function(){ var a=d.animate([{transform:'translateX(0px)'},{transform:'translateX(1200px)'}],{duration:1000,fill:'both'});
   setTimeout(function(){ var t=performance.now(); while(performance.now()-t<300){} },300);
   setTimeout(function(){ d.remove(); },1600); },300); return 'ok'; })();
