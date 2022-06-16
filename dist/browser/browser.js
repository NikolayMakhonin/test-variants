!function(r){"use strict";function n(r,n){
return function(t){
var e=Object.keys(t),o=Object.values(t),c=e.length,u={}
;function f(r){var n=o[r]
;return"function"==typeof n&&(n=n(u)),n}
for(var i=[],a=[],s=0;s<c;s++)i[s]=-1,a[s]=[]
;function l(){for(var r=c-1;r>=0;r--){var n=i[r]+1
;if(n<a[r].length){
for(i[r]=n,u[e[r]]=a[r][n],r++;r<c;r++){var t=f(r)
;if(0===t.length)break;i[r]=0,a[r]=t,u[e[r]]=t[0]}
if(r>=c)return!0}}return!1}a[0]=f(0)
;var v=0,h=!1,y=0;function b(r){
console.error(JSON.stringify(u,null,2)),console.error(r)
;var n=Date.now()
;throw Date.now()-n>5&&y<5&&(h=!0,g(),y++),r}
function g(){for(;h||l();)try{v++;var t=r(u)
;if(t&&"function"==typeof t.then)return n&&b(new Error("Unexpected Promise result for sync test function")),
t.then(g).catch(b)}catch(r){b(r)}return v}
return g()}}r.createTestVariants=function(r){
return n(r,!1)
},r.createTestVariantsSync=function(r){
return n(r,!0)
},Object.defineProperty(r,"__esModule",{value:!0})
}({});
