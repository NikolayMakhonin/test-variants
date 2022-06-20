!function(r){"use strict"
;r.createTestVariants=function(r){
return function(e){return function(t){
var n=(void 0===t?{}:t).forceAwaitInterval,o=Object.keys(e),f=Object.values(e),u=o.length,a={}
;function c(r){var e=f[r]
;return"function"==typeof e&&(e=e(a)),e}
for(var i=[],v=[],l=0;l<u;l++)i[l]=-1,v[l]=[]
;function s(){for(var r=u-1;r>=0;r--){var e=i[r]+1
;if(e<v[r].length){
for(i[r]=e,a[o[r]]=v[r][e],r++;r<u;r++){var t=c(r)
;if(0===t.length)break;i[r]=0,v[r]=t,a[o[r]]=t[0]}
if(r>=u)return!0}}return!1}v[0]=c(0)
;var h=0,y=!1,b=0;function p(r){
console.error(JSON.stringify(a,null,2)),console.error(r)
;var e=Date.now()
;throw Date.now()-e>50&&b<5&&(y=!0,w(0),b++),r}
function w(e){h+="number"==typeof e?e:1
;for(var t=n&&Date.now();y||s();)try{var o=r(a)
;if("object"==typeof o&&o&&"function"==typeof o.then)return o.then(w).catch(p)
;if(n&&Date.now()-t>=n)return Promise.resolve(o).then(w)
;h+="number"==typeof o?o:1}catch(r){p(r)}return h}
return w(0)}}
},Object.defineProperty(r,"__esModule",{value:!0})
}({});
