!function(e){"use strict"
;e.createTestVariants=function(e){
return function(t){return function(n){
var r=void 0===n?{}:n,o=r.pauseInterval,u=r.pauseTime,a=void 0===u?10:u,f=Object.keys(t),i=Object.values(t),c=f.length,v={}
;function l(e){var t=i[e]
;return"function"==typeof t&&(t=t(v)),t}
for(var s=[],y=[],h=0;h<c;h++)s[h]=-1,y[h]=[]
;function p(){for(var e=c-1;e>=0;e--){var t=s[e]+1
;if(t<y[e].length){
for(s[e]=t,v[f[e]]=y[e][t],e++;e<c;e++){var n=l(e)
;if(0===n.length)break;s[e]=0,y[e]=n,v[f[e]]=n[0]}
if(e>=c)return!0}}return!1}y[0]=l(0)
;var b=0,w=!1,m=0;function g(e){
console.error(JSON.stringify(v,null,2)),console.error(e)
;var t=Date.now()
;throw Date.now()-t>50&&m<5&&(w=!0,D(0),m++),e}
var j=Date.now();function D(t){var n=o&&Date.now()
;n&&n-j>=o&&(console.log(b),j=n),
b+="number"==typeof t?t:1
;for(var r=n,u=function(){try{var t=e(v)
;if("object"==typeof t&&t&&"function"==typeof t.then)return{
value:t.then(D).catch(g)}
;if(r&&Date.now()-r>=o)return{
value:(a?new Promise((function(e){
setTimeout((function(){e(t)}),a)
})):Promise.resolve(t)).then(D)}
;b+="number"==typeof t?t:1}catch(e){g(e)}
};w||p();){var f=u()
;if("object"==typeof f)return f.value}return b}
return D(0)}}
},Object.defineProperty(e,"__esModule",{value:!0})
}({});
