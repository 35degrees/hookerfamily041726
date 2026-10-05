(function(){ var fl=document.querySelector('.featured-flight'); var n=0; window.__tg=[];
  var iv=setInterval(function(){ fl.classList.toggle('flat'); window.__tg.push(Math.round(performance.now())+(fl.classList.contains('flat')?' on':' off')); if(++n>=8){ clearInterval(iv); fl.classList.remove('flat'); } },500); return 'ok'; })();
