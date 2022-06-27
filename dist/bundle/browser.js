!function(e){"use strict";function n(e,n,t,r){
return new(t||(t=Promise))((function(o,a){
function i(e){try{c(r.next(e))}catch(e){a(e)}}
function u(e){try{c(r.throw(e))}catch(e){a(e)}}
function c(e){var n
;e.done?o(e.value):(n=e.value,n instanceof t?n:new t((function(e){
e(n)}))).then(i,u)}c((r=r.apply(e,n||[])).next())
}))}function t(e,n){var t,r,o,a,i={label:0,
sent:function(){if(1&o[0])throw o[1];return o[1]},
trys:[],ops:[]};return a={next:u(0),throw:u(1),
return:u(2)
},"function"==typeof Symbol&&(a[Symbol.iterator]=function(){
return this}),a;function u(a){return function(u){
return function(a){
if(t)throw new TypeError("Generator is already executing.")
;for(;i;)try{
if(t=1,r&&(o=2&a[0]?r.return:a[0]?r.throw||((o=r.return)&&o.call(r),
0):r.next)&&!(o=o.call(r,a[1])).done)return o
;switch(r=0,o&&(a=[2&a[0],o.value]),a[0]){case 0:
case 1:o=a;break;case 4:return i.label++,{
value:a[1],done:!1};case 5:i.label++,r=a[1],a=[0]
;continue;case 7:a=i.ops.pop(),i.trys.pop()
;continue;default:
if(!(o=i.trys,(o=o.length>0&&o[o.length-1])||6!==a[0]&&2!==a[0])){
i=0;continue}
if(3===a[0]&&(!o||a[1]>o[0]&&a[1]<o[3])){
i.label=a[1];break}if(6===a[0]&&i.label<o[1]){
i.label=o[1],o=a;break}if(o&&i.label<o[2]){
i.label=o[2],i.ops.push(a);break}
o[2]&&i.ops.pop(),i.trys.pop();continue}
a=n.call(e,i)}catch(e){a=[6,e],r=0}finally{t=o=0}
if(5&a[0])throw a[1];return{
value:a[0]?a[1]:void 0,done:!0}}([a,u])}}}
function r(e){
if(null==e||e<=0)throw new Error("Iterations = ".concat(e))
;e--;var n=new Promise((function(n){
setTimeout((function(){n(e)}),1)}))
;return e<=0?n:n.then(r)}
e.createTestVariants=function(e){
return function(o){return function(a){
var i=void 0===a?{}:a,u=i.GC_Iterations,c=void 0===u?1e6:u,l=i.GC_IterationsAsync,s=void 0===l?1e4:l,f=i.GC_Interval,v=void 0===f?1e3:f,h=i.logInterval,b=void 0===h?5e3:h,p=i.logCompleted,y=void 0===p||p,d=i.onError,w=void 0===d?null:d,g=Object.keys(o),m=Object.values(o),I=g.length,k={}
;function x(e){var n=m[e]
;return"function"==typeof n&&(n=n(k)),n}
for(var D=[],E=[],G=0;G<I;G++)D[G]=-1,E[G]=[]
;E[0]=x(0);var O=0,T=0,_=!1,j=0;function C(e){
return n(this,void 0,void 0,(function(){var n
;return t(this,(function(t){switch(t.label){
case 0:
return console.error("error variant: ".concat(O,"\r\n").concat(JSON.stringify(k,null,2))),
console.error(e),
n=Date.now(),Date.now()-n>50&&j<5?(console.log("DEBUG ITERATION: "+j),
_=!0,[4,B()]):[3,2];case 1:t.sent(),j++,t.label=2
;case 2:throw w&&w({iteration:O,variant:k,error:e
}),e}}))}))}var P=Date.now(),S=P,A=O,N=T
;function B(){
return n(this,void 0,void 0,(function(){
var n,o,a,i;return t(this,(function(t){
switch(t.label){case 0:
t.trys.push([0,7,,9]),t.label=1;case 1:
return _||function(){for(var e=I-1;e>=0;e--){
var n=D[e]+1;if(n<E[e].length){
for(D[e]=n,k[g[e]]=E[e][n],e++;e<I;e++){var t=x(e)
;if(0===t.length)break;D[e]=0,E[e]=t,k[g[e]]=t[0]}
if(e>=I)return!0}}return!1
}()?(n=(b||v)&&Date.now(),b&&n-P>=b&&(console.log(O),P=n),
c&&O-A>=c||s&&T-N>=s||v&&n-S>=v?(A=O,
N=T,S=n,[4,r(1)]):[3,3]):[3,6];case 2:
return t.sent(),[3,1];case 3:
return"object"==typeof(o=e(k))&&o&&"function"==typeof o.then?[4,o]:[3,5]
;case 4:
return a=t.sent(),T+=i="number"==typeof a?a:1,O+=i,[3,1]
;case 5:return O+="number"==typeof o?o:1,[3,1]
;case 6:return[3,9];case 7:return[4,C(t.sent())]
;case 8:return t.sent(),[3,9];case 9:
return y&&console.log("variants: "+O),[4,r(1)]
;case 10:return t.sent(),[2,O]}}))}))}return B()}}
},Object.defineProperty(e,"__esModule",{value:!0})
}({});
