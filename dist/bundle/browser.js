!function(n){"use strict";function e(n){
if(null==n||n<=0)throw new Error("Iterations = ".concat(n))
;n--;var t=new Promise((function(e){
setTimeout((function(){e(n)}),100)}))
;return n<=0?t:t.then(e)}
n.createTestVariants=function(n){
return function(t){return function(o){
var r=void 0===o?{}:o,i=r.GC_Iterations,u=void 0===i?1e6:i,f=r.GC_IterationsAsync,a=void 0===f?1e4:f,c=r.GC_Interval,l=void 0===c?1e3:c,v=r.logInterval,s=void 0===v?5e3:v,h=r.logCompleted,y=void 0===h||h,g=Object.keys(t),d=Object.values(t),b=g.length,p={}
;function w(n){var e=d[n]
;return"function"==typeof e&&(e=e(p)),e}
for(var I=[],m=[],D=0;D<b;D++)I[D]=-1,m[D]=[]
;function O(){for(var n=b-1;n>=0;n--){var e=I[n]+1
;if(e<m[n].length){
for(I[n]=e,p[g[n]]=m[n][e],n++;n<b;n++){var t=w(n)
;if(0===t.length)break;I[n]=0,m[n]=t,p[g[n]]=t[0]}
if(n>=b)return!0}}return!1}m[0]=w(0)
;var _=0,j=0,C=!1,G=0;function T(n){
console.error(JSON.stringify(p,null,2)),console.error(n)
;var e=Date.now()
;throw Date.now()-e>50&&G<5&&(console.log("DEBUG ITERATION: "+G),
C=!0,P(0),G++),n}var E=Date.now(),k=E,A=_,N=j
;function P(t){
for(j+="number"==typeof t?t:1,_+="number"==typeof t?t:1;C||O();)try{
var o=(s||l)&&Date.now()
;if(s&&o-E>=s&&(console.log(_),E=o),u&&_-A>=u||a&&j-N>=a||l&&o-k>=l)return A=_,
N=j,k=o,console.log(_),e(2).then(P);var r=n(p)
;if("object"==typeof r&&r&&"function"==typeof r.then)return r.then(P,T)
;_+="number"==typeof r?r:1}catch(n){T(n)}
return y&&console.log("variants: "+_),e(2).then((function(n){
return _}))}return P(0)}}
},Object.defineProperty(n,"__esModule",{value:!0})
}({});
