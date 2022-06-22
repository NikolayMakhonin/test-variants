!function(e){"use strict"
;e.createTestVariants=function(e){
return function(n){return function(o){
var t=void 0===o?{}:o,r=t.pauseIterationsAsync,i=void 0===r?1e4:r,u=t.pauseInterval,a=void 0===u?1e3:u,f=t.pauseTime,c=void 0===f?10:f,s=t.logInterval,v=void 0===s?1e4:s,l=t.logCompleted,p=void 0===l||l,y=Object.keys(n),d=Object.values(n),g=y.length,b={}
;function h(e){var n=d[e]
;return"function"==typeof n&&(n=n(b)),n}
for(var m=[],w=[],D=0;D<g;D++)m[D]=-1,w[D]=[]
;function I(){for(var e=g-1;e>=0;e--){var n=m[e]+1
;if(n<w[e].length){
for(m[e]=n,b[y[e]]=w[e][n],e++;e<g;e++){var o=h(e)
;if(0===o.length)break;m[e]=0,w[e]=o,b[y[e]]=o[0]}
if(e>=g)return!0}}return!1}w[0]=h(0)
;var O=0,T=0,j=!1,P=0;function k(e){
console.error(JSON.stringify(b,null,2)),console.error(e)
;var n=Date.now()
;throw Date.now()-n>50&&P<5&&(console.log("DEBUG ITERATION: "+P),
j=!0,_(0),P++),e}var A=Date.now(),E=A,N=T
;function _(n){
for(T+="number"==typeof n?n:1,O+="number"==typeof n?n:1;j||I();)try{
var o=(v||a)&&Date.now()
;if(v&&o-A>=v&&(console.log(O),A=o),i&&T-N>=i||a&&o-E>=a)return E=o,
N=T,(c?new Promise((function(e){
setTimeout((function(){e(0)}),c)
})):Promise.resolve(0)).then(_);var t=e(b)
;if("object"==typeof t&&t&&"function"==typeof t.then)return t.then(_,k)
;O+="number"==typeof t?t:1}catch(e){k(e)}
return p&&console.log("variants: "+O),O}
return _(0)}}
},Object.defineProperty(e,"__esModule",{value:!0})
}({});
