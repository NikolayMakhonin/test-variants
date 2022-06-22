!function(e){"use strict"
;e.createTestVariants=function(e){
return function(n){return function(t){
var o=void 0===t?{}:t,r=o.pauseInterval,u=void 0===r?1e3:r,a=o.pauseTime,i=void 0===a?10:a,f=o.logInterval,c=void 0===f?1e4:f,v=o.logCompleted,l=void 0===v||v,s=Object.keys(n),p=Object.values(n),y=s.length,g={}
;function h(e){var n=p[e]
;return"function"==typeof n&&(n=n(g)),n}
for(var b=[],d=[],m=0;m<y;m++)b[m]=-1,d[m]=[]
;function w(){for(var e=y-1;e>=0;e--){var n=b[e]+1
;if(n<d[e].length){
for(b[e]=n,g[s[e]]=d[e][n],e++;e<y;e++){var t=h(e)
;if(0===t.length)break;b[e]=0,d[e]=t,g[s[e]]=t[0]}
if(e>=y)return!0}}return!1}d[0]=h(0)
;var D=0,j=!1,O=0;function T(e){
console.error(JSON.stringify(g,null,2)),console.error(e)
;var n=Date.now()
;throw Date.now()-n>50&&O<5&&(console.log("DEBUG ITERATION: "+O),
j=!0,P(0),O++),e}var I=Date.now();function P(n){
var t=(c||u)&&Date.now()
;t&&t-I>=c&&(console.log(D),I=t),D+="number"==typeof n?n:1
;for(var o=u&&t,r=function(){try{var n=e(g)
;if("object"==typeof n&&n&&"function"==typeof n.then)return{
value:n.catch(T).then(P)}
;if(o&&Date.now()-o>=u)return{
value:(i?new Promise((function(e){
setTimeout((function(){e(n)}),i)
})):Promise.resolve(n)).then(P)}
;D+="number"==typeof n?n:1}catch(e){T(e)}
};j||w();){var a=r()
;if("object"==typeof a)return a.value}
return l&&console.log("variants: "+D),D}
return P(0)}}
},Object.defineProperty(e,"__esModule",{value:!0})
}({});
