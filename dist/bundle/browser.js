!function(e){"use strict"
;e.createTestVariants=function(e){
return function(t){return function(n){
var o=void 0===n?{}:n,r=o.pauseInterval,u=void 0===r?1e3:r,a=o.pauseTime,i=void 0===a?10:a,f=o.logInterval,c=void 0===f?1e4:f,v=o.logCompleted,l=void 0===v||v,s=Object.keys(t),p=Object.values(t),y=s.length,g={}
;function h(e){var t=p[e]
;return"function"==typeof t&&(t=t(g)),t}
for(var b=[],d=[],m=0;m<y;m++)b[m]=-1,d[m]=[]
;function w(){for(var e=y-1;e>=0;e--){var t=b[e]+1
;if(t<d[e].length){
for(b[e]=t,g[s[e]]=d[e][t],e++;e<y;e++){var n=h(e)
;if(0===n.length)break;b[e]=0,d[e]=n,g[s[e]]=n[0]}
if(e>=y)return!0}}return!1}d[0]=h(0)
;var D=0,j=!1,O=0;function T(e){
console.error(JSON.stringify(g,null,2))
;var t=Date.now()
;throw Date.now()-t>50&&O<5&&(console.log("DEBUG ITERATION: "+O),
j=!0,P(0),O++),e}var I=Date.now();function P(t){
var n=(c||u)&&Date.now()
;n&&n-I>=c&&(console.log(D),I=n),D+="number"==typeof t?t:1
;for(var o=u&&n,r=function(){try{var t=e(g)
;if("object"==typeof t&&t&&"function"==typeof t.then)return{
value:t.catch(T).then(P)}
;if(o&&Date.now()-o>=u)return{
value:(i?new Promise((function(e){
setTimeout((function(){e(t)}),i)
})):Promise.resolve(t)).then(P)}
;D+="number"==typeof t?t:1}catch(e){T(e)}
};j||w();){var a=r()
;if("object"==typeof a)return a.value}
return l&&console.log("variants: "+D),D}
return P(0)}}
},Object.defineProperty(e,"__esModule",{value:!0})
}({});
