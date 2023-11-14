!function(t){"use strict";var e=function(){
return e=Object.assign||function(t){
for(var e,n=1,r=arguments.length;n<r;n++)for(var s in e=arguments[n])Object.prototype.hasOwnProperty.call(e,s)&&(t[s]=e[s])
;return t},e.apply(this,arguments)}
;function n(t,e,n,r){
return new(n||(n=Promise))((function(s,i){
function o(t){try{c(r.next(t))}catch(t){i(t)}}
function l(t){try{c(r.throw(t))}catch(t){i(t)}}
function c(t){var e
;t.done?s(t.value):(e=t.value,e instanceof n?e:new n((function(t){
t(e)}))).then(o,l)}c((r=r.apply(t,e||[])).next())
}))}function r(t,e){var n,r,s,i,o={label:0,
sent:function(){if(1&s[0])throw s[1];return s[1]},
trys:[],ops:[]};return i={next:l(0),throw:l(1),
return:l(2)
},"function"==typeof Symbol&&(i[Symbol.iterator]=function(){
return this}),i;function l(i){return function(l){
return function(i){
if(n)throw new TypeError("Generator is already executing.")
;for(;o;)try{
if(n=1,r&&(s=2&i[0]?r.return:i[0]?r.throw||((s=r.return)&&s.call(r),
0):r.next)&&!(s=s.call(r,i[1])).done)return s
;switch(r=0,s&&(i=[2&i[0],s.value]),i[0]){case 0:
case 1:s=i;break;case 4:return o.label++,{
value:i[1],done:!1};case 5:o.label++,r=i[1],i=[0]
;continue;case 7:i=o.ops.pop(),o.trys.pop()
;continue;default:
if(!(s=o.trys,(s=s.length>0&&s[s.length-1])||6!==i[0]&&2!==i[0])){
o=0;continue}
if(3===i[0]&&(!s||i[1]>s[0]&&i[1]<s[3])){
o.label=i[1];break}if(6===i[0]&&o.label<s[1]){
o.label=s[1],s=i;break}if(s&&o.label<s[2]){
o.label=s[2],o.ops.push(i);break}
s[2]&&o.ops.pop(),o.trys.pop();continue}
i=e.call(t,o)}catch(t){i=[6,t],r=0}finally{n=s=0}
if(5&i[0])throw i[1];return{
value:i[0]?i[1]:void 0,done:!0}}([i,l])}}}
function s(t){
if(null==t||t<=0)throw new Error("Iterations = ".concat(t))
;t--;var e=new Promise((function(e){
setTimeout((function(){e(t)}),1)}))
;return t<=0?e:e.then(s)}class i extends Error{
constructor(t,e){
super(t),Object.setPrototypeOf(this,i.prototype),this.reason=e,
this.name="AbortError",this._internal=!1}}
const o=()=>{};class l{constructor(){
this.aborted=!1,this.reason=void 0,this._callbacks=void 0
}subscribe(t){var e
;if(null===(e=this._callbacks)||void 0===e?void 0:e.has(t))throw new Error("Already subscribed: "+t)
;return this.aborted?(t.call(this,this.reason),
o):(this._callbacks||(this._callbacks=new Set),
this._callbacks.add(t),()=>{var e
;null===(e=this._callbacks)||void 0===e||e.delete(t)
})}abort(t){var e
;this.aborted=!0,this.reason=t,null===(e=this._callbacks)||void 0===e||e.forEach((t=>{
t.call(this,this.reason)})),this._callbacks=void 0
}throwIfAborted(){
if(this.aborted)throw this.reason}}class c{
constructor(){this.signal=new l}abort(t){
this.signal.aborted||(void 0===t&&((t=new i("Aborted with no reason",t))._internal=!0),
this.signal.abort(t))}}function u(t,e){return t<e}
class a{
constructor({objectPool:t,lessThanFunc:e}={}){
this._size=0,this._root=null,this.merge=h,
this.collapse=f,this._objectPool=t,this._lessThanFunc=e||u
}clear(){this._root=null,this._size=0}get size(){
return this._size}add(t){
let e=null!=this._objectPool?this._objectPool.get():null
;return null==e?e={child:null,next:null,prev:null,
item:t
}:e.item=t,this._size++,this._root=h(this._root,e,this._lessThanFunc),e
}getMin(){const{_root:t}=this
;return null==t?void 0:t.item}getMinNode(){
return this._root}deleteMin(){const{_root:t}=this
;if(null==t)return;const e=t.item
;return this.delete(t),e}delete(t){var e
;if(t===this._root)this._root=f(t.child,this._lessThanFunc);else{
if(null==t.prev){
if(this._objectPool)throw new Error("The node is already deleted. Don't use the objectPool to prevent this error.")
;return}
t.prev.child===t?t.prev.child=t.next:t.prev.next=t.next,null!=t.next&&(t.next.prev=t.prev),
this._root=h(this._root,f(t.child,this._lessThanFunc),this._lessThanFunc)
}
t.child=null,t.prev=null,t.next=null,t.item=void 0,null===(e=this._objectPool)||void 0===e||e.release(t),
this._size--}decreaseKey(t){
t!==this._root&&(t.prev.child===t?t.prev.child=t.next:t.prev.next=t.next,
null!=t.next&&(t.next.prev=t.prev),
this._root=h(this._root,t,this._lessThanFunc))}
get isEmpty(){return null==this._root}
[Symbol.iterator](){return this._iterate(!1)}
nodes(){return{
[Symbol.iterator]:()=>this._iterate(!0)}}
_iterate(t){const e=this._lessThanFunc
;return function*n(r){
r&&(t?yield r:yield r.item,r.child&&(null!=r.child.next&&(r.child=f(r.child,e),
r.child.prev=r),yield*n(r.child)))}(this._root)}}
function h(t,e,n){let r,s
;return null==t?e:null==e||t===e?t:(n(e.item,t.item)?(r=e,
s=t):(r=t,s=e),s.next=r.child,
null!=r.child&&(r.child.prev=s),s.prev=r,r.child=s,
r.next=null,r.prev=null,r)}function f(t,e){
let n,r,s,i,o;if(null==t)return null
;for(i=t,n=null;null!=i;){
if(r=i,s=r.next,null==s){r.prev=n,n=r;break}
i=s.next,o=h(r,s,e),o.prev=n,n=o}
for(o=null;null!=n;)i=n.prev,o=h(o,n,e),n=i
;return o}function d(t,e){t(function(t){return{
then(e,n){n(t)}}}(e))}function _(t){
return null!=t&&"object"==typeof t&&"function"==typeof t.then
}let v,b=[];function p(t){
b.push(t),v||(v=function(){
return n(this,void 0,void 0,(function*(){
for(;b.length>0;){yield 0;const t=b
;b=[],t.forEach((t=>{try{t()}catch(t){
console.error("Unhandled promise rejection",t)}}))
}v=null}))}())}function y(t,e,n){p((()=>{try{
const r=e?e(t):t;n._resolve(r)}catch(t){
n._reject(t)}}))}function w(t,e,n){p((()=>{
if(e)try{const r=e(t);n._resolve(r)}catch(t){
n._reject(t)}else n._reject(t)}))}
const g=function(){};class m{constructor(t){
this.status="pending",this.value=void 0,
this.reason=void 0,this._handlers=null
;const e=this._resolve,n=this._reject,r=this._resolveAsync,s=this._rejectAsync,i=this
;this._resolve=function(t){e.call(i,t)
},this._reject=function(t){n.call(i,t)
},this._resolveAsync=function(t){r.call(i,t)
},this._rejectAsync=function(t){s.call(i,t)
},t(this._resolve,this._reject)}_resolve(t){
"pending"===this.status&&(this.status="fulfilled",
this._resolveAsync(t))}_resolveAsync(t){
_(t)?t.then(this._resolveAsync,this._rejectAsync):this._resolveSync(t)
}_resolveSync(t){const e=this._handlers
;if(this.value=t,null!=e){this._handlers=null
;for(let n=0,r=e.length;n<r;n++){const[r,,s]=e[n]
;y(t,r,s)}}}_reject(t){
"pending"===this.status&&this._rejectAsync(t)}
_rejectAsync(t){
this.status="rejected",_(t)?t.then(this._rejectAsync,this._rejectAsync):this._rejectSync(t)
}_rejectSync(t){const e=this._handlers
;if(this.reason=t,null!=e){this._handlers=null
;for(let n=0,r=e.length;n<r;n++){const[,r,s]=e[n]
;w(t,r,s)}}}then(t,e){const n=new m(g)
;return"pending"===this.status?(null==this._handlers&&(this._handlers=[]),
this._handlers.push([t,e,n])):"fulfilled"===this.status?y(this.value,t,n):w(this.reason,e,n),
n}catch(t){return this.then(void 0,t)}finally(t){
const e=t&&function(e){const n=t()
;return _(n)?n.then((()=>e)):m.resolve(e)
},n=t&&function(e){const n=t()
;return _(n)?n.then((()=>m.reject(e))):m.reject(e)
};return this.then(e,n)}static resolve(t){
const e=new m(g);return e._resolve(t),e}
static reject(t){const e=new m(g)
;return e._reject(t),e}get[Symbol.toStringTag](){
return"Promise"}static get[Symbol.species](){
return m}static all(t){return function(t,e){
let n,r;e||(e=Promise);const s=new e(((t,e)=>{
n=t,r=e}));let i=t.length;const o=[]
;return t.forEach(((t,e)=>{_(t)?t.then((t=>{
o[e]=t,0==--i&&n(o)}),r):(o[e]=t,0==--i&&n(o))
})),s}(t,m)}static allSettled(t){
return function(t,e){let n;e||(e=Promise)
;const r=new e(((t,e)=>{n=t}));let s=t.length
;const i=[];return t.forEach(((t,e)=>{
_(t)?t.then((t=>{i[e]={status:"fulfilled",value:t
},0==--s&&n(i)}),(t=>{i[e]={status:"rejected",
reason:t},0==--s&&n(i)})):(i[e]={
status:"fulfilled",value:t},0==--s&&n(i))})),r
}(t,m)}static any(t){return function(t,e){let n,r
;e||(e=Promise);const s=new e(((t,e)=>{n=t,r=e}))
;let i=t.length;const o=[]
;return t.forEach(((t,e)=>{_(t)?t.then(n,(t=>{
o[e]=t,0==--i&&r(new AggregateError(o))})):n(t)
})),s}(t,m)}static race(t){return function(t,e){
let n,r;e||(e=Promise);const s=new e(((t,e)=>{
n=t,r=e}));return t.forEach((t=>{
_(t)?t.then(n,r):n(t)})),s}(t,m)}}
const j=function(){};class x{constructor(t){
if(this._status="pending",t&&t.aborted)this.promise=m.reject(t.reason),
this.resolve=j,this.reject=j;else{let e,n
;if(this.promise=new Promise((function(t){
e=t,n=function(e){d(t,e)}})),t){
const r=t.subscribe((function(t){n(t)}))
;this.resolve=function(t){r(),e(t)
},this.reject=function(t){r(),n(t)}
}else this.resolve=e,this.reject=n}
this.promise.then((()=>{this._status="resolved"
}),(()=>{this._status="rejected"}))}get state(){
return this._status}}class P{constructor(t,e){
this._branch=null,this.order=t,this.parent=e}
get branch(){if(!this._branch){
const t=[this.order];let e=this.parent
;for(;null!=e;)t.push(e.order),e=e.parent
;this._branch=t}return this._branch}}
function S(t,e){return function(t,e){
const n=t&&t.branch,r=e&&e.branch,s=n?n.length:0,i=r?r.length:0,o=s>i?s:i
;for(let t=0;t<o;t++){
const e=t>=s?0:n[s-1-t],o=t>=i?0:r[i-1-t]
;if(e!==o)return e>o?1:-1}return 0
}(t.priority,e.priority)<0}let k=1;class z{
constructor(){this._queue=new a({lessThanFunc:S})}
run(t,e,n){return this._run(!1,t,e,n)}
runTask(t,e,n){return this._run(!0,t,e,n)}
_run(t,e,n,r){const s=new x(r),i={
priority:(o=k++,l=n,null==o?null==l?null:l:new P(o,l)),
func:e,abortSignal:r,resolve:s.resolve,
reject:s.reject,readyToRun:!t};var o,l
;if(this._queue.add(i),t){const t=this;return{
result:s.promise,setReadyToRun(e){
i.readyToRun=e,e&&!t._inProcess&&(t._inProcess=!0,
t._process())}}}
return this._inProcess||(this._inProcess=!0,this._process()),s.promise
}_process(){
return n(this,void 0,void 0,(function*(){
const t=this._queue;for(;;){if(yield 0,t.isEmpty){
this._inProcess=!1;break}let e=t.getMin()
;if(e.readyToRun)t.deleteMin();else{let n
;for(const e of t.nodes())if(e.item.readyToRun){
n=e;break}if(!n){this._inProcess=!1;break}
e=n.item,t.delete(n)}
if(e.abortSignal&&e.abortSignal.aborted)e.reject(e.abortSignal.reason);else try{
let t=e.func&&e.func(e.abortSignal)
;t&&"function"==typeof t.then&&(t=yield t),e.resolve(t)
}catch(t){e.reject(t)}}}))}}const E=function(){
const t=new z;return function(e,n){
return t.run(void 0,e,n)}}();class T{
constructor(t){
if(this._maxSize=0,this._size=0,this._tickPromise=new x,!t)throw new Error("maxSize should be > 0")
;this._maxSize=t,
this._size=t,this._priorityQueue=new z}
get maxSize(){return this._maxSize}get size(){
return this._size}get holdAvailable(){
return this._size}hold(t){const e=this._size
;return!(t>e)&&(this._size=e-t,!0)}
get releaseAvailable(){
return this.maxSize-this._size}release(t,e){
const n=this._size,r=this.maxSize-n;if(t>r){
if(!e)throw new Error(`count (${t} > maxReleaseCount (${r}))`)
;t=r}if(t>0&&(this._size=n+t,this._tickPromise)){
const t=this._tickPromise
;this._tickPromise=null,t.resolve()}return t}
tick(t){
if(!(this._size>=this._maxSize))return this._tickPromise||(this._tickPromise=new x),
function(t,e){return t?new Promise((function(n){
if(t&&t.aborted)return void d(n,t.reason);let r,s
;function i(t){s||(s=!0,r&&r(),d(n,t))}
e.then((function(t){r&&r(),n(t)
})).catch(i),t&&(r=t.subscribe(i))})):e
}(t,this._tickPromise.promise)}holdWait(t,e,r,s){
if(t>this.maxSize)throw new Error(`holdCount (${t} > maxSize (${this.maxSize}))`)
;return s||(s=E),
this._priorityQueue.run((r=>n(this,void 0,void 0,(function*(){
for(;t>this._size;)yield this.tick(r),yield s(e,r)
;if(!this.hold(t))throw new Error("Unexpected behavior")
}))),e,r)}}t.createTestVariants=function(t){
return function(i){return function(o){
var l=void 0===o?{}:o,u=l.GC_Iterations,a=void 0===u?1e6:u,h=l.GC_IterationsAsync,f=void 0===h?1e4:h,d=l.GC_Interval,_=void 0===d?1e3:d,v=l.logInterval,b=void 0===v?5e3:v,p=l.logCompleted,y=void 0===p||p,w=l.onError,g=void 0===w?null:w,m=l.abortSignal,j=void 0===m?null:m,x=l.parallel,P=new c,S=function(...t){
let e,n;function r(t){e.abort(t)}
for(let s=0;s<t.length;s++){const i=t[s];if(i){
if(i.aborted){r.call(i);break}
n?(e||(e=new c,n.subscribe(r)),i.subscribe(r)):n=i
}}return e?e.signal:n||(new c).signal
}(j,P.signal),k=S,z=Object.keys(i),E=Object.values(i),A=z.length,O={}
;function F(t){var e=E[t]
;return"function"==typeof e&&(e=e(O)),e}
for(var I=[],R=[],C=0;C<A;C++)I[C]=-1,R[C]=[]
;R[0]=F(0);var D=0,M=0,G=!1,$=0;function q(t,e,s){
return n(this,void 0,void 0,(function(){var n
;return r(this,(function(r){switch(r.label){
case 0:
return P.abort(t),console.error("error variant: ".concat(e,"\r\n").concat(JSON.stringify(s,null,2))),
console.error(t),
n=Date.now(),Date.now()-n>50&&$<5?(console.log("DEBUG ITERATION: "+$),
G=!0,[4,K()]):[3,2];case 1:r.sent(),$++,r.label=2
;case 2:throw g&&g({iteration:e,variant:s,error:t
}),t}}))}))}
var N=Date.now(),U=N,W=D,Q=M,B=null==x||x<=1?null:new T(x)
;function J(e,s,i){
return n(this,void 0,void 0,(function(){var n,o,l
;return r(this,(function(r){switch(r.label){
case 0:return r.trys.push([0,3,,5]),function(t){
return"object"==typeof t&&t&&"function"==typeof t.then
}(n=t(s,i))?[4,n]:[3,2];case 1:
return o=r.sent(),M+=l="number"==typeof o?o:1,D+=l,
[2];case 2:return D+="number"==typeof n?n:1,[3,5]
;case 3:return[4,q(r.sent(),e,s)];case 4:
return r.sent(),[3,5];case 5:return[2]}}))}))}
function K(){
return n(this,void 0,void 0,(function(){
var t,i=this;return r(this,(function(o){
switch(o.label){case 0:t=function(){var t,o,l
;return r(this,(function(c){switch(c.label){
case 0:
return t=D,o=B?e({},O):O,l=(b||_)&&Date.now(),b&&l-N>=b&&(console.log(D),
N=l),a&&D-W>=a||f&&M-Q>=f||_&&l-U>=_?(W=D,
Q=M,U=l,[4,s(1)]):[3,2];case 1:
return c.sent(),[2,"continue"];case 2:
return(null==j?void 0:j.aborted)?[2,"continue"]:B&&!S.aborted?[3,4]:[4,J(t,o,j)]
;case 3:return c.sent(),[3,7];case 4:
return B.hold(1)?[3,6]:[4,B.holdWait(1)];case 5:
c.sent(),c.label=6;case 6:
n(i,void 0,void 0,(function(){
return r(this,(function(e){switch(e.label){case 0:
return e.trys.push([0,,2,3]),(null==S?void 0:S.aborted)?[2]:[4,J(t,o,S)]
;case 1:return e.sent(),[3,3];case 2:
return B.release(1),[7];case 3:return[2]}}))
})),c.label=7;case 7:return[2]}}))},o.label=1
;case 1:
return(null==j?void 0:j.aborted)||!G&&!function(){
for(var t=A-1;t>=0;t--){var e=I[t]+1
;if(e<R[t].length){
for(I[t]=e,O[z[t]]=R[t][e],t++;t<A;t++){var n=F(t)
;if(0===n.length)break;I[t]=0,R[t]=n,O[z[t]]=n[0]}
if(t>=A)return!0}}return!1}()?[3,3]:[5,t()]
;case 2:return o.sent(),[3,1];case 3:
return B?[4,B.holdWait(x)]:[3,5];case 4:
o.sent(),B.release(x),o.label=5;case 5:
if(null==k?void 0:k.aborted)throw k.reason
;return y&&console.log("variants: "+D),[4,s(1)]
;case 6:return o.sent(),[2,D]}}))}))}return K()}}
},Object.defineProperty(t,"__esModule",{value:!0})
}({});
