!function(e){"use strict";function n(e,n,t,r){
return new(t||(t=Promise))((function(o,u){
function a(e){try{c(r.next(e))}catch(e){u(e)}}
function i(e){try{c(r.throw(e))}catch(e){u(e)}}
function c(e){var n
;e.done?o(e.value):(n=e.value,n instanceof t?n:new t((function(e){
e(n)}))).then(a,i)}c((r=r.apply(e,n||[])).next())
}))}function t(e,n){var t,r,o,u,a={label:0,
sent:function(){if(1&o[0])throw o[1];return o[1]},
trys:[],ops:[]};return u={next:i(0),throw:i(1),
return:i(2)
},"function"==typeof Symbol&&(u[Symbol.iterator]=function(){
return this}),u;function i(u){return function(i){
return function(u){
if(t)throw new TypeError("Generator is already executing.")
;for(;a;)try{
if(t=1,r&&(o=2&u[0]?r.return:u[0]?r.throw||((o=r.return)&&o.call(r),
0):r.next)&&!(o=o.call(r,u[1])).done)return o
;switch(r=0,o&&(u=[2&u[0],o.value]),u[0]){case 0:
case 1:o=u;break;case 4:return a.label++,{
value:u[1],done:!1};case 5:a.label++,r=u[1],u=[0]
;continue;case 7:u=a.ops.pop(),a.trys.pop()
;continue;default:
if(!(o=a.trys,(o=o.length>0&&o[o.length-1])||6!==u[0]&&2!==u[0])){
a=0;continue}
if(3===u[0]&&(!o||u[1]>o[0]&&u[1]<o[3])){
a.label=u[1];break}if(6===u[0]&&a.label<o[1]){
a.label=o[1],o=u;break}if(o&&a.label<o[2]){
a.label=o[2],a.ops.push(u);break}
o[2]&&a.ops.pop(),a.trys.pop();continue}
u=n.call(e,a)}catch(e){u=[6,e],r=0}finally{t=o=0}
if(5&u[0])throw u[1];return{
value:u[0]?u[1]:void 0,done:!0}}([u,i])}}}
function r(e){
if(null==e||e<=0)throw new Error("Iterations = ".concat(e))
;e--;var n=new Promise((function(n){
setTimeout((function(){n(e)}),1)}))
;return e<=0?n:n.then(r)}
e.createTestVariants=function(e){
return function(o){return function(u){
var a=void 0===u?{}:u,i=a.GC_Iterations,c=void 0===i?1e6:i,s=a.GC_IterationsAsync,l=void 0===s?1e4:s,f=a.GC_Interval,v=void 0===f?1e3:f,h=a.logInterval,b=void 0===h?5e3:h,p=a.logCompleted,y=void 0===p||p,d=Object.keys(o),w=Object.values(o),g=d.length,m={}
;function I(e){var n=w[e]
;return"function"==typeof n&&(n=n(m)),n}
for(var k=[],x=[],D=0;D<g;D++)k[D]=-1,x[D]=[]
;x[0]=I(0);var G=0,O=0,T=!1,_=0;function j(e){
return n(this,void 0,void 0,(function(){var n
;return t(this,(function(t){switch(t.label){
case 0:
return console.error(JSON.stringify(m,null,2)),console.error(e),n=Date.now(),
Date.now()-n>50&&_<5?(console.log("DEBUG ITERATION: "+_),
T=!0,[4,A()]):[3,2];case 1:t.sent(),_++,t.label=2
;case 2:throw e}}))}))}
var C=Date.now(),E=C,P=G,S=O;function A(){
return n(this,void 0,void 0,(function(){
var n,o,u,a;return t(this,(function(t){
switch(t.label){case 0:
t.trys.push([0,7,,9]),t.label=1;case 1:
return T||function(){for(var e=g-1;e>=0;e--){
var n=k[e]+1;if(n<x[e].length){
for(k[e]=n,m[d[e]]=x[e][n],e++;e<g;e++){var t=I(e)
;if(0===t.length)break;k[e]=0,x[e]=t,m[d[e]]=t[0]}
if(e>=g)return!0}}return!1
}()?(n=(b||v)&&Date.now(),b&&n-C>=b&&(console.log(G),C=n),
c&&G-P>=c||l&&O-S>=l||v&&n-E>=v?(P=G,
S=O,E=n,[4,r(1)]):[3,3]):[3,6];case 2:
return t.sent(),[3,1];case 3:
return"object"==typeof(o=e(m))&&o&&"function"==typeof o.then?[4,o]:[3,5]
;case 4:
return u=t.sent(),O+=a="number"==typeof u?u:1,G+=a,[3,1]
;case 5:return G+="number"==typeof o?o:1,[3,1]
;case 6:return[3,9];case 7:return[4,j(t.sent())]
;case 8:return t.sent(),[3,9];case 9:
return y&&console.log("variants: "+G),[4,r(1)]
;case 10:return t.sent(),[2,G]}}))}))}return A()}}
},Object.defineProperty(e,"__esModule",{value:!0})
}({});
