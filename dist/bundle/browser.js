!function(t){"use strict";var e=function(){
return e=Object.assign||function(t){
for(var e,n=1,r=arguments.length;n<r;n++)for(var i in e=arguments[n])Object.prototype.hasOwnProperty.call(e,i)&&(t[i]=e[i])
;return t},e.apply(this,arguments)}
;function n(t,e,n,r){
return new(n||(n=Promise))(function(i,s){
function o(t){try{c(r.next(t))}catch(t){s(t)}}
function l(t){try{c(r.throw(t))}catch(t){s(t)}}
function c(t){var e
;t.done?i(t.value):(e=t.value,e instanceof n?e:new n(function(t){
t(e)})).then(o,l)}c((r=r.apply(t,e||[])).next())})
}function r(t,e){var n,r,i,s,o={label:0,
sent:function(){if(1&i[0])throw i[1];return i[1]},
trys:[],ops:[]};return s={next:l(0),throw:l(1),
return:l(2)
},"function"==typeof Symbol&&(s[Symbol.iterator]=function(){
return this}),s;function l(l){return function(c){
return function(l){
if(n)throw new TypeError("Generator is already executing.")
;for(;s&&(s=0,l[0]&&(o=0)),o;)try{
if(n=1,r&&(i=2&l[0]?r.return:l[0]?r.throw||((i=r.return)&&i.call(r),
0):r.next)&&!(i=i.call(r,l[1])).done)return i
;switch(r=0,i&&(l=[2&l[0],i.value]),l[0]){case 0:
case 1:i=l;break;case 4:return o.label++,{
value:l[1],done:!1};case 5:o.label++,r=l[1],l=[0]
;continue;case 7:l=o.ops.pop(),o.trys.pop()
;continue;default:
if(!(i=o.trys,(i=i.length>0&&i[i.length-1])||6!==l[0]&&2!==l[0])){
o=0;continue}
if(3===l[0]&&(!i||l[1]>i[0]&&l[1]<i[3])){
o.label=l[1];break}if(6===l[0]&&o.label<i[1]){
o.label=i[1],i=l;break}if(i&&o.label<i[2]){
o.label=i[2],o.ops.push(l);break}
i[2]&&o.ops.pop(),o.trys.pop();continue}
l=e.call(t,o)}catch(t){l=[6,t],r=0}finally{n=i=0}
if(5&l[0])throw l[1];return{
value:l[0]?l[1]:void 0,done:!0}}([l,c])}}}
function i(t){var n,r=t.argsTemplates
;return(n={})[Symbol.iterator]=function(){
var t=Object.keys(r),n=Object.values(r),i=t.length,s={}
;function o(t){var e=n[t]
;return"function"==typeof e&&(e=e(s)),e}
for(var l=[],c=[],u=0;u<i;u++)l[u]=-1,c[u]=[]
;return c[0]=o(0),{next:function(){
return function(){for(var e=i-1;e>=0;e--){
var n=l[e]+1;if(n<c[e].length){
var r=t[e],u=c[e][n]
;for(l[e]=n,s[r]=u,e++;e<i;e++){var a=o(e)
;if(0===a.length)break;l[e]=0,c[e]=a
;var h=t[e],f=a[0];s[h]=f}if(e>=i)return!0}}
return!1}()?{done:!1,value:e({},s)}:{done:!0,
value:null}}}},n}function s(t,e){return t<e}
class o{
constructor({objectPool:t,lessThanFunc:e}={}){
this._size=0,this._root=null,this.merge=l,
this.collapse=c,this._objectPool=t,this._lessThanFunc=e||s
}clear(){this._root=null,this._size=0}get size(){
return this._size}add(t){
let e=null!=this._objectPool?this._objectPool.get():null
;return null==e?e={child:null,next:null,prev:null,
item:t
}:e.item=t,this._size++,this._root=l(this._root,e,this._lessThanFunc),e
}getMin(){const{_root:t}=this
;return null==t?void 0:t.item}getMinNode(){
return this._root}deleteMin(){const{_root:t}=this
;if(null==t)return;const e=t.item
;return this.delete(t),e}delete(t){var e
;if(t===this._root)this._root=c(t.child,this._lessThanFunc);else{
if(null==t.prev){
if(this._objectPool)throw new Error("The node is already deleted. Don't use the objectPool to prevent this error.")
;return}
t.prev.child===t?t.prev.child=t.next:t.prev.next=t.next,null!=t.next&&(t.next.prev=t.prev),
this._root=l(this._root,c(t.child,this._lessThanFunc),this._lessThanFunc)
}
t.child=null,t.prev=null,t.next=null,t.item=void 0,null===(e=this._objectPool)||void 0===e||e.release(t),
this._size--}decreaseKey(t){
t!==this._root&&(t.prev.child===t?t.prev.child=t.next:t.prev.next=t.next,
null!=t.next&&(t.next.prev=t.prev),
this._root=l(this._root,t,this._lessThanFunc))}
get isEmpty(){return null==this._root}
[Symbol.iterator](){return this._iterate(!1)}
nodes(){return{
[Symbol.iterator]:()=>this._iterate(!0)}}
_iterate(t){const e=this._lessThanFunc
;return function*n(r){
r&&(t?yield r:yield r.item,r.child&&(null!=r.child.next&&(r.child=c(r.child,e),
r.child.prev=r),yield*n(r.child)))}(this._root)}}
function l(t,e,n){let r,i
;return null==t?e:null==e||t===e?t:(n(e.item,t.item)?(r=e,
i=t):(r=t,i=e),i.next=r.child,
null!=r.child&&(r.child.prev=i),i.prev=r,r.child=i,
r.next=null,r.prev=null,r)}function c(t,e){
let n,r,i,s,o;if(null==t)return null
;for(s=t,n=null;null!=s;){
if(r=s,i=r.next,null==i){r.prev=n,n=r;break}
s=i.next,o=l(r,i,e),o.prev=n,n=o}
for(o=null;null!=n;)s=n.prev,o=l(o,n,e),n=s
;return o}function u(t,e){t(function(t){return{
then(e,n){n(t)}}}(e))}function a(t){
return null!=t&&"object"==typeof t&&"function"==typeof t.then
}let h,f=[];function d(t){
f.push(t),h||(h=function(){
return n(this,void 0,void 0,function*(){
for(;f.length>0;){yield 0;const t=f
;f=[],t.forEach(t=>{try{t()}catch(t){
console.error("Unhandled promise rejection",t)}})}
h=null})}())}function v(t,e,n){d(()=>{try{
const r=e?e(t):t;n._resolve(r)}catch(t){
n._reject(t)}})}function _(t,e,n){d(()=>{if(e)try{
const r=e(t);n._resolve(r)}catch(t){n._reject(t)
}else n._reject(t)})}const b=function(){};class y{
constructor(t){
this.status="pending",this.value=void 0,this.reason=void 0,this._handlers=null
;const e=this._resolve,n=this._reject,r=this._resolveAsync,i=this._rejectAsync,s=this
;this._resolve=function(t){e.call(s,t)
},this._reject=function(t){n.call(s,t)
},this._resolveAsync=function(t){r.call(s,t)
},this._rejectAsync=function(t){i.call(s,t)
},t(this._resolve,this._reject)}_resolve(t){
"pending"===this.status&&(this.status="fulfilled",
this._resolveAsync(t))}_resolveAsync(t){
a(t)?t.then(this._resolveAsync,this._rejectAsync):this._resolveSync(t)
}_resolveSync(t){const e=this._handlers
;if(this.value=t,null!=e){this._handlers=null
;for(let n=0,r=e.length;n<r;n++){const[r,,i]=e[n]
;v(t,r,i)}}}_reject(t){
"pending"===this.status&&this._rejectAsync(t)}
_rejectAsync(t){
this.status="rejected",a(t)?t.then(this._rejectAsync,this._rejectAsync):this._rejectSync(t)
}_rejectSync(t){const e=this._handlers
;if(this.reason=t,null!=e){this._handlers=null
;for(let n=0,r=e.length;n<r;n++){const[,r,i]=e[n]
;_(t,r,i)}}}then(t,e){const n=new y(b)
;return"pending"===this.status?(null==this._handlers&&(this._handlers=[]),
this._handlers.push([t,e,n])):"fulfilled"===this.status?v(this.value,t,n):_(this.reason,e,n),
n}catch(t){return this.then(void 0,t)}finally(t){
const e=t&&function(e){const n=t()
;return a(n)?n.then(()=>e):y.resolve(e)
},n=t&&function(e){const n=t()
;return a(n)?n.then(()=>y.reject(e)):y.reject(e)}
;return this.then(e,n)}static resolve(t){
const e=new y(b);return e._resolve(t),e}
static reject(t){const e=new y(b)
;return e._reject(t),e}get[Symbol.toStringTag](){
return"Promise"}static get[Symbol.species](){
return y}static all(t){return function(t,e){
let n,r;e||(e=Promise);const i=new e((t,e)=>{
n=t,r=e});let s=t.length;const o=[]
;return t.forEach((t,e)=>{a(t)?t.then(t=>{
o[e]=t,0===--s&&n(o)},r):(o[e]=t,0===--s&&n(o))
}),i}(t,y)}static allSettled(t){
return function(t,e){let n;e||(e=Promise)
;const r=new e((t,e)=>{n=t});let i=t.length
;const s=[];return t.forEach((t,e)=>{
a(t)?t.then(t=>{s[e]={status:"fulfilled",value:t
},0===--i&&n(s)},t=>{s[e]={status:"rejected",
reason:t},0===--i&&n(s)}):(s[e]={
status:"fulfilled",value:t},0===--i&&n(s))}),r
}(t,y)}static any(t){return function(t,e){let n,r
;e||(e=Promise);const i=new e((t,e)=>{n=t,r=e})
;let s=t.length;const o=[]
;return t.forEach((t,e)=>{a(t)?t.then(n,t=>{
o[e]=t,0===--s&&r(new AggregateError(o))}):n(t)
}),i}(t,y)}static race(t){return function(t,e){
let n,r;e||(e=Promise);const i=new e((t,e)=>{
n=t,r=e});return t.forEach(t=>{
a(t)?t.then(n,r):n(t)}),i}(t,y)}}
const p=function(){};class w{constructor(t){
if(this._status="pending",t&&t.aborted)this.promise=y.reject(t.reason),
this.resolve=p,this.reject=p;else{let e,n
;if(this.promise=new Promise(function(t){
e=t,n=function(e){u(t,e)}}),t){
const r=t.subscribe(function(t){n(t)})
;this.resolve=function(t){r(),e(t)
},this.reject=function(t){r(),n(t)}
}else this.resolve=e,this.reject=n}
this.promise.then(()=>{this._status="resolved"
},()=>{this._status="rejected"})}get state(){
return this._status}}class m extends Error{
constructor(t,e){
super(t),Object.setPrototypeOf(this,m.prototype),this.reason=e,
this.name="AbortError",this._internal=!1}}
const g=()=>{};class j{constructor(){
this.aborted=!1,this.reason=void 0,this._callbacks=void 0
}subscribe(t){var e
;if(null===(e=this._callbacks)||void 0===e?void 0:e.has(t))throw new Error("Already subscribed: "+t)
;return this.aborted?(t.call(this,this.reason),
g):(this._callbacks||(this._callbacks=new Set),
this._callbacks.add(t),()=>{var e
;null===(e=this._callbacks)||void 0===e||e.delete(t)
})}abort(t){var e
;this.aborted=!0,this.reason=t,null===(e=this._callbacks)||void 0===e||e.forEach(t=>{
t.call(this,this.reason)}),this._callbacks=void 0}
throwIfAborted(){if(this.aborted)throw this.reason
}}class x{constructor(){this.signal=new j}
abort(t){
this.signal.aborted||(void 0===t&&((t=new m("Aborted with no reason",t))._internal=!0),
this.signal.abort(t))}}function S(t,e){
var i=0,s=null;function o(t,o,l){
return n(this,void 0,void 0,function(){var n
;return r(this,function(r){switch(r.label){case 0:
return s={error:t,args:o,index:l
},console.error("[test-variants] error variant: ".concat(l,"\n").concat(function(t){
return JSON.stringify(t,function(t,e){
return e&&"object"==typeof e&&!Array.isArray(e)&&e.constructor!==Object?e+"":e
},2)
}(o))),console.error(t),n=Date.now(),Date.now()-n>50&&i<5?(console.log("[test-variants] DEBUG ITERATION: "+i),
i++,[2]):e.onError?[4,e.onError(s)]:[3,2];case 1:
r.sent(),r.label=2;case 2:throw s.error}})})}
return function(e,n,r){try{var i=t(e,r)
;if(a(i))return i.then(function(t){
return"number"==typeof t?{iterationsAsync:t,
iterationsSync:0}:null!==t&&"object"==typeof t?t:{
iterationsAsync:1,iterationsSync:0}},function(t){
return o(t,e,n)});return"number"==typeof i?{
iterationsAsync:0,iterationsSync:i
}:null!==i&&"object"==typeof i?i:{
iterationsAsync:0,iterationsSync:1}}catch(t){
return o(t,e,n)}}}class P{constructor(t,e){
this._branch=null,this.order=t,this.parent=e}
get branch(){if(!this._branch){
const t=[this.order];let e=this.parent
;for(;null!=e;)t.push(e.order),e=e.parent
;this._branch=t}return this._branch}}
const z=function(t){return t};function A(t,e){
return function(t,e){
const n=t&&t.branch,r=e&&e.branch,i=n?n.length:0,s=r?r.length:0,o=i>s?i:s
;for(let t=0;t<o;t++){
const e=t>=i?0:n[i-1-t],o=t>=s?0:r[s-1-t]
;if(e!==o)return e>o?1:-1}return 0
}(t.priority,e.priority)<0}let k=1;class E{
constructor(){this._queue=new o({lessThanFunc:A})}
run(t,e,n){return this._run(!1,t,e,n)}
runTask(t,e,n){return this._run(!0,t,e,n)}
_run(t,e,n,r){const i=new w(r),s={
priority:(o=k++,l=n,null==o?null==l?null:l:new P(o,l)),
func:e,abortSignal:r,resolve:i.resolve,
reject:i.reject,readyToRun:!t};var o,l
;if(this._queue.add(s),t){const t=this;return{
result:i.promise,setReadyToRun(e){
s.readyToRun=e,e&&!t._inProcess&&(t._inProcess=!0,
t._process())}}}
return this._inProcess||(this._inProcess=!0,this._process()),i.promise
}_process(){
return n(this,void 0,void 0,function*(){
const t=this._queue
;for(yield Promise.resolve().then(z);;){
if(yield 0,t.isEmpty){this._inProcess=!1;break}
let e=t.getMin()
;if(e.readyToRun)t.deleteMin();else{let n
;for(const e of t.nodes())if(e.item.readyToRun){
n=e;break}if(!n){this._inProcess=!1;break}
e=n.item,t.delete(n)}
if(e.abortSignal&&e.abortSignal.aborted)e.reject(e.abortSignal.reason);else try{
let t=e.func&&e.func(e.abortSignal)
;t&&"function"==typeof t.then&&(t=yield t),e.resolve(t)
}catch(t){e.reject(t)}}})}}const T=function(){
const t=new E;return function(e,n){
return t.run(void 0,e,n)}}();class O{
constructor(t){
if(this._maxSize=0,this._size=0,this._tickPromise=new w,!t)throw new Error("maxSize should be > 0")
;this._maxSize=t,
this._size=t,this._priorityQueue=new E}
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
if(!(this._size>=this._maxSize))return this._tickPromise||(this._tickPromise=new w),
function(t,e){return t?new Promise(function(n){
if(t&&t.aborted)return void u(n,t.reason);let r,i
;function s(t){i||(i=!0,r&&r(),u(n,t))}
e.then(function(t){r&&r(),n(t)
}).catch(s),t&&(r=t.subscribe(s))}):e
}(t,this._tickPromise.promise)}holdWait(t,e,r,i){
if(t>this.maxSize)throw new Error(`holdCount (${t} > maxSize (${this.maxSize}))`)
;return i||(i=T),
this._priorityQueue.run(r=>n(this,void 0,void 0,function*(){
for(;t>this._size;)yield this.tick(r),yield i(e,r)
;if(!this.hold(t))throw new Error("Unexpected behavior")
}),e,r)}}function F(t){
if(null==t||t<=0)throw new Error("Iterations = ".concat(t))
;t--;var e=new Promise(function(e){
setTimeout(function(){e(t)},1)})
;return t<=0?e:e.then(F)}function I(t,i,s){
var o,l,c,u,h,f
;return void 0===s&&(s={}),n(this,void 0,void 0,function(){
function d(){
return n(this,void 0,void 0,function(){
var s,o=this;return r(this,function(l){
switch(l.label){case 0:s=function(){
var i,s,l,c,u,h,f;return r(this,function(d){
switch(d.label){case 0:return i=z,s=e(e({},A),{
seed:null==S?void 0:S.value
}),l=(y||b)&&Date.now(),y&&l-D>=y&&(console.log(M),D=l),
v&&M-$>=v||_&&C-q>=_||b&&l-G>=b?($=M,
q=C,G=l,[4,F(1)]):[3,2];case 1:d.sent(),d.label=2
;case 2:
if(null==w?void 0:w.aborted)return[2,"continue"]
;if(N&&!T.aborted)return[3,8];d.label=3;case 3:
return d.trys.push([3,6,,7]),a(c=t(s,i,T))?[4,c]:[3,5]
;case 4:c=d.sent(),d.label=5;case 5:
return c?(u=c.iterationsAsync,h=c.iterationsSync,
C+=u,M+=h+u,[3,7]):(R=!0,E.abort(),[2,"continue"])
;case 6:if(f=d.sent(),!m)throw f;return P={
error:f,args:s,index:i},R=!1,[3,7];case 7:
return[3,11];case 8:
return N.hold(1)?[3,10]:[4,N.holdWait(1)];case 9:
d.sent(),d.label=10;case 10:
n(o,void 0,void 0,function(){var e,n,o,l
;return r(this,function(r){switch(r.label){case 0:
return r.trys.push([0,3,4,5]),
(null==T?void 0:T.aborted)?[2]:a(e=t(s,i,T))?[4,e]:[3,2]
;case 1:e=r.sent(),r.label=2;case 2:
return e?(n=e.iterationsAsync,o=e.iterationsSync,
C+=n,M+=o+n,[3,5]):(R=!0,E.abort(),[2]);case 3:
if(l=r.sent(),!m)throw l;return P={error:l,args:s,
index:i},R=!1,[3,5];case 4:return N.release(1),[7]
;case 5:return[2]}})}),d.label=11;case 11:
return[2]}})},l.label=1;case 1:
return(null==w?void 0:w.aborted)||!R&&!function(){
for(;;){if(z++,S&&S.done)return!1
;if(null==P||z<P.index){var t=k.next()
;if(!t.done)return A=t.value,!0}if(!j)return!1
;if((S=j.next()).done)return!1
;z=-1,k=i[Symbol.iterator]()}}()?[3,3]:[5,s()]
;case 2:return l.sent(),[3,1];case 3:
return N?[4,N.holdWait(g)]:[3,5];case 4:
l.sent(),N.release(g),l.label=5;case 5:
if(null==I?void 0:I.aborted)throw I.reason
;return p&&console.log("[test-variants] variants: ".concat(z,", iterations: ").concat(M,", async: ").concat(C)),
[4,F(1)];case 6:return l.sent(),[2,M]}})})}
var v,_,b,y,p,w,m,g,j,S,P,z,A,k,E,T,I,R,M,C,D,G,$,q,N
;return r(this,function(t){switch(t.label){case 0:
return v=null!==(o=s.GC_Iterations)&&void 0!==o?o:1e6,
_=null!==(l=s.GC_IterationsAsync)&&void 0!==l?l:1e4,
b=null!==(c=s.GC_Interval)&&void 0!==c?c:1e3,
y=null!==(u=s.logInterval)&&void 0!==u?u:5e3,
p=null===(h=s.logCompleted)||void 0===h||h,
w=s.abortSignal,m=s.findBestError,g=!0===s.parallel?Math.pow(2,31):!s.parallel||s.parallel<=0?1:s.parallel,
j=null!==(f=null==m?void 0:m.seeds[Symbol.iterator]())&&void 0!==f?f:null,
S=null==j?void 0:j.next(),
P=null,z=-1,A={},k=i[Symbol.iterator](),E=new x,T=function(...t){
let e,n;function r(t){e.abort(t)}
for(let i=0;i<t.length;i++){const s=t[i];if(s){
if(s.aborted)return s
;n?(e||(e=new x,n.subscribe(r)),s.subscribe(r)):n=s
}}return e?e.signal:n||(new x).signal
}(w,E.signal),I=T,R=!1,M=0,C=0,D=Date.now(),
G=D,$=M,q=C,N=g<=1?null:new O(g),[4,d()];case 1:
return[2,{iterations:t.sent(),bestError:P}]}})})}
t.createTestVariants=function(t){
return function(e){return function(s){
return n(this,void 0,void 0,function(){var n,o
;return r(this,function(r){return n=S(t,{
onError:null==s?void 0:s.onError}),o=i({
argsTemplates:e}),[2,I(n,o,s)]})})}}
},Object.defineProperty(t,"__esModule",{value:!0})
}({});
