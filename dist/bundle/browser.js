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
var i=void 0===a?{}:a,u=i.GC_Iterations,c=void 0===u?1e6:u,l=i.GC_IterationsAsync,s=void 0===l?1e4:l,f=i.GC_Interval,v=void 0===f?1e3:f,h=i.logInterval,b=void 0===h?5e3:h,d=i.logCompleted,p=void 0===d||d,y=i.onError,w=void 0===y?null:y,g=i.abortSignal,m=Object.keys(o),I=Object.values(o),k=m.length,x={}
;function D(e){var n=I[e]
;return"function"==typeof n&&(n=n(x)),n}
for(var E=[],G=[],O=0;O<k;O++)E[O]=-1,G[O]=[]
;G[0]=D(0);var T=0,_=0,j=!1,C=0;function S(e){
return n(this,void 0,void 0,(function(){var n
;return t(this,(function(t){switch(t.label){
case 0:
return console.error("error variant: ".concat(T,"\r\n").concat(JSON.stringify(x,null,2))),
console.error(e),
n=Date.now(),Date.now()-n>50&&C<5?(console.log("DEBUG ITERATION: "+C),
j=!0,[4,J()]):[3,2];case 1:t.sent(),C++,t.label=2
;case 2:throw w&&w({iteration:T,variant:x,error:e
}),e}}))}))}var P=Date.now(),A=P,N=T,B=_
;function J(){
return n(this,void 0,void 0,(function(){
var n,o,a,i;return t(this,(function(t){
switch(t.label){case 0:
t.trys.push([0,7,,9]),t.label=1;case 1:
return(null==g?void 0:g.aborted)||!j&&!function(){
for(var e=k-1;e>=0;e--){var n=E[e]+1
;if(n<G[e].length){
for(E[e]=n,x[m[e]]=G[e][n],e++;e<k;e++){var t=D(e)
;if(0===t.length)break;E[e]=0,G[e]=t,x[m[e]]=t[0]}
if(e>=k)return!0}}return!1
}()?[3,6]:(n=(b||v)&&Date.now(),b&&n-P>=b&&(console.log(T),
P=n),c&&T-N>=c||s&&_-B>=s||v&&n-A>=v?(N=T,
B=_,A=n,[4,r(1)]):[3,3]);case 2:
return t.sent(),[3,1];case 3:
return"object"==typeof(o=e(x))&&o&&"function"==typeof o.then?[4,o]:[3,5]
;case 4:
return a=t.sent(),_+=i="number"==typeof a?a:1,T+=i,[3,1]
;case 5:return T+="number"==typeof o?o:1,[3,1]
;case 6:return[3,9];case 7:return[4,S(t.sent())]
;case 8:return t.sent(),[3,9];case 9:
if(null==g?void 0:g.aborted)throw g.reason
;return p&&console.log("variants: "+T),[4,r(1)]
;case 10:return t.sent(),[2,T]}}))}))}return J()}}
},Object.defineProperty(e,"__esModule",{value:!0})
}({});
