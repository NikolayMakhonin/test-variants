!function(r){"use strict"
;r.createTestVariants=function(r){
return function(e){return function(t){
var n=(void 0===t?{}:t).forceAwaitInterval,o=Object.keys(e),a=Object.values(e),f=o.length,u={}
;function c(r){var e=a[r]
;return"function"==typeof e&&(e=e(u)),e}
for(var i=[],v=[],l=0;l<f;l++)i[l]=-1,v[l]=[]
;function s(){for(var r=f-1;r>=0;r--){var e=i[r]+1
;if(e<v[r].length){
for(i[r]=e,u[o[r]]=v[r][e],r++;r<f;r++){var t=c(r)
;if(0===t.length)break;i[r]=0,v[r]=t,u[o[r]]=t[0]}
if(r>=f)return!0}}return!1}v[0]=c(0)
;var h=0,y=!1,b=0;function w(r){
console.error(JSON.stringify(u,null,2)),console.error(r)
;var e=Date.now()
;throw Date.now()-e>50&&b<5&&(y=!0,g(0),b++),r}
var p=Date.now();function g(e){var t=n&&Date.now()
;t&&t-p>=n&&(console.log(h),p=t),
h+="number"==typeof e?e:1;for(var o=t;y||s();)try{
var a=r(u)
;if("object"==typeof a&&a&&"function"==typeof a.then)return a.then(g).catch(w)
;if(o&&Date.now()-o>=n)return Promise.resolve(a).then(g)
;h+="number"==typeof a?a:1}catch(r){w(r)}return h}
return g(0)}}
},Object.defineProperty(r,"__esModule",{value:!0})
}({});
