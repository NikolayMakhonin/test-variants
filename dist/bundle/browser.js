!function(e){"use strict"
;e.createTestVariants=function(e){
return function(t){return function(n){
var r=void 0===n?{}:n,o=r.pauseInterval,u=void 0===o?1e3:o,a=r.pauseTime,i=void 0===a?10:a,f=r.logInterval,c=void 0===f?1e4:f,v=r.logCompleted,l=void 0===v||v,s=Object.keys(t),p=Object.values(t),y=s.length,h={}
;function b(e){var t=p[e]
;return"function"==typeof t&&(t=t(h)),t}
for(var d=[],g=[],m=0;m<y;m++)d[m]=-1,g[m]=[]
;function w(){for(var e=y-1;e>=0;e--){var t=d[e]+1
;if(t<g[e].length){
for(d[e]=t,h[s[e]]=g[e][t],e++;e<y;e++){var n=b(e)
;if(0===n.length)break;d[e]=0,g[e]=n,h[s[e]]=n[0]}
if(e>=y)return!0}}return!1}g[0]=b(0)
;var j=0,D=!1,O=0;function P(e){
console.error(JSON.stringify(h,null,2)),console.error(e)
;var t=Date.now()
;throw Date.now()-t>50&&O<5&&(D=!0,k(0),O++),e}
var T=Date.now();function k(t){
var n=(c||u)&&Date.now()
;n&&n-T>=c&&(console.log(j),T=n),j+="number"==typeof t?t:1
;for(var r=u&&n,o=function(){try{var t=e(h)
;if("object"==typeof t&&t&&"function"==typeof t.then)return{
value:t.then(k).catch(P)}
;if(r&&Date.now()-r>=u)return{
value:(i?new Promise((function(e){
setTimeout((function(){e(t)}),i)
})):Promise.resolve(t)).then(k)}
;j+="number"==typeof t?t:1}catch(e){P(e)}
};D||w();){var a=o()
;if("object"==typeof a)return a.value}
return l&&console.log("variants: "+j),j}
return k(0)}}
},Object.defineProperty(e,"__esModule",{value:!0})
}({});
