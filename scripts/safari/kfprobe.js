(function(){
  window.__kfl=[];
  if(!window.__kfP){ window.__kfP=1; var oa=Element.prototype.animate;
    Element.prototype.animate=function(k,o){ var a=oa.call(this,k,o);
      try{ if(this.classList&&this.classList.contains('featured-flight')&&Array.isArray(k)&&k.length>2){
        var L=k[k.length-1], P=k[k.length-2];
        window.__kfl.push(JSON.stringify({n:k.length,dur:Math.round((o&&o.duration)||0),fill:o&&o.fill,lastOff:L.offset,last:L.transform,prev:P.transform,origin:L.transformOrigin||''}));
      } }catch(e){}
      return a; }; }
  return 'ok';
})();
