!function(r){"use strict";function t(r,t){
return function(e){
var n=Object.keys(e),o=Object.values(e),u=n.length,c={}
;function f(r){var t=o[r]
;return"function"==typeof t&&(t=t(c)),t}
for(var i=[],a=[],s=0;s<u;s++)i[s]=-1,a[s]=[]
;function l(){for(var r=u-1;r>=0;r--){var t=i[r]+1
;if(t<a[r].length){
for(i[r]=t,c[n[r]]=a[r][t],r++;r<u;r++){var e=f(r)
;if(0===e.length)break;i[r]=0,a[r]=e,c[n[r]]=e[0]}
if(r>=u)return!0}}return!1}a[0]=f(0)
;var v=0,y=!1,h=0;function b(r){
console.error(JSON.stringify(c,null,2)),console.error(r)
;var t=Date.now()
;throw Date.now()-t>50&&h<5&&(y=!0,p(0),h++),r}
function p(e){
for(v+="number"==typeof e?e:1;y||l();)try{
var n=r(c)
;if("object"==typeof n&&n&&"function"==typeof n.then)return t&&b(new Error("Unexpected Promise result for sync test function")),
n.then(p).catch(b);v+="number"==typeof n?n:1
}catch(r){b(r)}return v}return p(0)}}
r.createTestVariants=function(r){return t(r,!1)
},r.createTestVariantsSync=function(r){
return t(r,!0)
},Object.defineProperty(r,"__esModule",{value:!0})
}({});
