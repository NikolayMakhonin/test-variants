!function(r){"use strict";function t(r,t){
return function(n){
var e=Object.keys(n),o=Object.values(n),c=e.length,f={}
;function u(r){var t=o[r]
;return"function"==typeof t&&(t=t(f)),t}
for(var a=[],i=[],s=0;s<c;s++)a[s]=-1,i[s]=[]
;function v(){for(var r=c-1;r>=0;r--){var t=a[r]+1
;if(t<i[r].length){
for(a[r]=t,f[e[r]]=i[r][t],r++;r<c;r++){var n=u(r)
;if(0===n.length)break;a[r]=0,i[r]=n,f[e[r]]=n[0]}
if(r>=c)return!0}}return!1}i[0]=u(0);var l=0
;function h(t){
console.error(JSON.stringify(f,null,2)),console.error(t)
;var n=Date.now()
;if(Date.now()-n>5)for(var e=0;e<5;e++)try{r(f)
}catch(r){}throw t}return function n(){
for(;v();)try{l++;var e=r(f)
;if(e&&"function"==typeof e.then)return t&&h(new Error("Unexpected Promise result for sync test function")),
e.then(n).catch(h)}catch(r){h(r)}return l}()}}
r.createTestVariants=function(r){return t(r,!1)
},r.createTestVariantsSync=function(r){
return t(r,!0)
},Object.defineProperty(r,"__esModule",{value:!0})
}({});
