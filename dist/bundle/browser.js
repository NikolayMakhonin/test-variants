!function(n){"use strict";function e(n){
if(null==n||n<=0)throw new Error("Iterations = ".concat(n))
;n--;var t=Date.now(),o=new Promise((function(e){
setTimeout((function(){e(n)}),1)}))
;return n<=0?o:o.then((function(n){
var o=Date.now()-t
;return o>50&&(console.log("GC time: "+o),n++),e(n)
}))}n.createTestVariants=function(n){
return function(t){return function(o){
var r=void 0===o?{}:o,i=r.GC_Iterations,u=void 0===i?1e6:i,a=r.GC_IterationsAsync,f=void 0===a?1e4:a,c=r.GC_Interval,v=void 0===c?1e3:c,l=r.logInterval,s=void 0===l?5e3:l,d=r.logCompleted,y=void 0===d||d,g=Object.keys(t),h=Object.values(t),w=g.length,b={}
;function m(n){var e=h[n]
;return"function"==typeof e&&(e=e(b)),e}
for(var p=[],D=[],I=0;I<w;I++)p[I]=-1,D[I]=[]
;function C(){for(var n=w-1;n>=0;n--){var e=p[n]+1
;if(e<D[n].length){
for(p[n]=e,b[g[n]]=D[n][e],n++;n<w;n++){var t=m(n)
;if(0===t.length)break;p[n]=0,D[n]=t,b[g[n]]=t[0]}
if(n>=w)return!0}}return!1}D[0]=m(0)
;var G,O,_=0,j=0,T=!1,E=0,P=new Promise((function(n,e){
G=n,O=e}));function k(n){
console.error(JSON.stringify(b,null,2)),console.error(n)
;var e=Date.now()
;Date.now()-e>50&&E<5&&(console.log("DEBUG ITERATION: "+E),T=!0,
M(0),E++),O(n)}var A=Date.now(),N=A,B=_,J=j
;function M(t){
j+="number"==typeof t?t:1,_+="number"==typeof t?t:1
;try{for(;T||C();){var o=(s||v)&&Date.now()
;if(s&&o-A>=s&&(console.log(_),A=o),u&&_-B>=u||f&&j-J>=f||v&&o-N>=v)return B=_,
J=j,N=o,void e(1).then(M);var r=n(b)
;if("object"==typeof r&&r&&"function"==typeof r.then)return void r.then(M,k)
;_+="number"==typeof r?r:1}}catch(n){
return void k(n)}
y&&console.log("variants: "+_),e(1).then((function(){
G(_)}))}return M(0),P}}
},Object.defineProperty(n,"__esModule",{value:!0})
}({});
