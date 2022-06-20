!function(e){"use strict"
;e.createTestVariants=function(e){
return function(t){return function(n){
var r=void 0===n?{}:n,o=r.pauseInterval,u=void 0===o?1e3:o,a=r.pauseTime,i=void 0===a?10:a,f=r.logInterval,c=void 0===f?1e4:f,v=Object.keys(t),l=Object.values(t),s=v.length,y={}
;function h(e){var t=l[e]
;return"function"==typeof t&&(t=t(y)),t}
for(var p=[],b=[],w=0;w<s;w++)p[w]=-1,b[w]=[]
;function d(){for(var e=s-1;e>=0;e--){var t=p[e]+1
;if(t<b[e].length){
for(p[e]=t,y[v[e]]=b[e][t],e++;e<s;e++){var n=h(e)
;if(0===n.length)break;p[e]=0,b[e]=n,y[v[e]]=n[0]}
if(e>=s)return!0}}return!1}b[0]=h(0)
;var g=0,m=!1,j=0;function D(e){
console.error(JSON.stringify(y,null,2)),console.error(e)
;var t=Date.now()
;throw Date.now()-t>50&&j<5&&(m=!0,P(0),j++),e}
var O=Date.now();function P(t){
var n=(c||u)&&Date.now()
;n&&n-O>=c&&(console.log(g),O=n),g+="number"==typeof t?t:1
;for(var r=u&&n,o=function(){try{var t=e(y)
;if("object"==typeof t&&t&&"function"==typeof t.then)return{
value:t.then(P).catch(D)}
;if(r&&Date.now()-r>=u)return{
value:(i?new Promise((function(e){
setTimeout((function(){e(t)}),i)
})):Promise.resolve(t)).then(P)}
;g+="number"==typeof t?t:1}catch(e){D(e)}
};m||d();){var a=o()
;if("object"==typeof a)return a.value}return g}
return P(0)}}
},Object.defineProperty(e,"__esModule",{value:!0})
}({});
