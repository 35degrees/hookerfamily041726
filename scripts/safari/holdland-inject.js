(function(){
  window.__hold=[];
  document.addEventListener('introend', function(e){
    var el=e.target; if(!el || !el.classList || !el.classList.contains('featured-flight')) return;
    var src=el.getAnimations().find(function(a){ return a.effect && a.effect.getKeyframes().length>2; });
    if(!src){ window.__hold.push('no-src'); return; }
    var k=src.effect.getKeyframes(); var L=k[k.length-1];
    var f={transform:L.transform, transformOrigin:L.transformOrigin||'top left'};
    el.animate([f,f], {duration: 1e9, fill:'both'});
    window.__hold.push(JSON.stringify(f));
  }, true);
  return 'ok';
})();
