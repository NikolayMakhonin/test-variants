!function(t,e,n){"use strict";function r(t){
if(t&&t.__esModule)return t
;var e=Object.create(null)
;return t&&Object.keys(t).forEach(function(n){
if("default"!==n){
var r=Object.getOwnPropertyDescriptor(t,n)
;Object.defineProperty(e,n,r.get?r:{enumerable:!0,
get:function(){return t[n]}})}
}),e.default=t,Object.freeze(e)}
var s=r(e),i=r(n),o=function(){
return o=Object.assign||function(t){
for(var e,n=1,r=arguments.length;n<r;n++)for(var s in e=arguments[n])Object.prototype.hasOwnProperty.call(e,s)&&(t[s]=e[s])
;return t},o.apply(this,arguments)}
;function c(t,e,n,r){
return new(n||(n=Promise))(function(s,i){
function o(t){try{l(r.next(t))}catch(t){i(t)}}
function c(t){try{l(r.throw(t))}catch(t){i(t)}}
function l(t){var e
;t.done?s(t.value):(e=t.value,e instanceof n?e:new n(function(t){
t(e)})).then(o,c)}l((r=r.apply(t,e||[])).next())})
}function l(t,e){var n,r,s,i,o={label:0,
sent:function(){if(1&s[0])throw s[1];return s[1]},
trys:[],ops:[]};return i={next:c(0),throw:c(1),
return:c(2)
},"function"==typeof Symbol&&(i[Symbol.iterator]=function(){
return this}),i;function c(c){return function(l){
return function(c){
if(n)throw new TypeError("Generator is already executing.")
;for(;i&&(i=0,c[0]&&(o=0)),o;)try{
if(n=1,r&&(s=2&c[0]?r.return:c[0]?r.throw||((s=r.return)&&s.call(r),
0):r.next)&&!(s=s.call(r,c[1])).done)return s
;switch(r=0,s&&(c=[2&c[0],s.value]),c[0]){case 0:
case 1:s=c;break;case 4:return o.label++,{
value:c[1],done:!1};case 5:o.label++,r=c[1],c=[0]
;continue;case 7:c=o.ops.pop(),o.trys.pop()
;continue;default:
if(!(s=o.trys,(s=s.length>0&&s[s.length-1])||6!==c[0]&&2!==c[0])){
o=0;continue}
if(3===c[0]&&(!s||c[1]>s[0]&&c[1]<s[3])){
o.label=c[1];break}if(6===c[0]&&o.label<s[1]){
o.label=s[1],s=c;break}if(s&&o.label<s[2]){
o.label=s[2],o.ops.push(c);break}
s[2]&&o.ops.pop(),o.trys.pop();continue}
c=e.call(t,o)}catch(t){c=[6,t],r=0}finally{n=s=0}
if(5&c[0])throw c[1];return{
value:c[0]?c[1]:void 0,done:!0}}([c,l])}}}
function a(t){
return c(this,void 0,void 0,function(){var e,n
;return l(this,function(r){switch(r.label){case 0:
return[4,s.promises.stat(t).catch(function(){
return null})];case 1:
if(null==(e=r.sent()))return[2,[]]
;if(!e.isDirectory())throw new Error("[saveErrorVariants] path is not a directory: ".concat(t))
;return[4,s.promises.readdir(t)];case 2:
return n=r.sent(),[2,n.filter(function(t){
return t.endsWith(".json")}).sort(function(t,e){
return t>e?-1:t<e?1:0}).map(function(e){
return i.join(t,e)})]}})})}function u(t,e){
return c(this,void 0,void 0,function(){var n,r
;return l(this,function(i){switch(i.label){case 0:
return[4,s.promises.readFile(t,"utf-8")];case 1:
n=i.sent();try{r=JSON.parse(n)}catch(e){
throw new Error("[saveErrorVariants] invalid JSON in file: ".concat(t))
}if(e)try{return[2,e(r)]}catch(e){
throw new Error("[saveErrorVariants] jsonToArgs failed for file: ".concat(t))
}return[2,r]}})})}function h(t){
return t.sessionDate.toISOString().substring(0,19).replace("T","_").replaceAll(":","-")+".json"
}function f(t,e,n){
return c(this,void 0,void 0,function(){var r,o
;return l(this,function(c){switch(c.label){case 0:
return n?(o=n(t),r="string"==typeof o?o:JSON.stringify(o,null,2)):r=JSON.stringify(t,null,2),
[4,s.promises.mkdir(i.dirname(e),{recursive:!0})]
;case 1:
return c.sent(),[4,s.promises.writeFile(e,r,"utf-8")]
;case 2:return c.sent(),[2]}})})}function d(t){
var e,n=t.argsTemplates
;return(e={})[Symbol.iterator]=function(){
var t=Object.keys(n),e=Object.values(n),r=t.length,s={}
;function i(t){var n=e[t]
;return"function"==typeof n&&(n=n(s)),n}
for(var c=[],l=[],a=0;a<r;a++)c[a]=-1,l[a]=[]
;return l[0]=i(0),{next:function(){
return function(){for(var e=r-1;e>=0;e--){
var n=c[e]+1;if(n<l[e].length){
var o=t[e],a=l[e][n]
;for(c[e]=n,s[o]=a,e++;e<r;e++){var u=i(e)
;if(0===u.length)break;c[e]=0,l[e]=u
;var h=t[e],f=u[0];s[h]=f}if(e>=r)return!0}}
return!1}()?{done:!1,value:o({},s)}:{done:!0,
value:null}}}},e}function v(t,e){return t<e}
class _{
constructor({objectPool:t,lessThanFunc:e}={}){
this._size=0,this._root=null,this.merge=y,
this.collapse=b,this._objectPool=t,this._lessThanFunc=e||v
}clear(){this._root=null,this._size=0}get size(){
return this._size}add(t){
let e=null!=this._objectPool?this._objectPool.get():null
;return null==e?e={child:null,next:null,prev:null,
item:t
}:e.item=t,this._size++,this._root=y(this._root,e,this._lessThanFunc),e
}getMin(){const{_root:t}=this
;return null==t?void 0:t.item}getMinNode(){
return this._root}deleteMin(){const{_root:t}=this
;if(null==t)return;const e=t.item
;return this.delete(t),e}delete(t){var e
;if(t===this._root)this._root=b(t.child,this._lessThanFunc);else{
if(null==t.prev){
if(this._objectPool)throw new Error("The node is already deleted. Don't use the objectPool to prevent this error.")
;return}
t.prev.child===t?t.prev.child=t.next:t.prev.next=t.next,null!=t.next&&(t.next.prev=t.prev),
this._root=y(this._root,b(t.child,this._lessThanFunc),this._lessThanFunc)
}
t.child=null,t.prev=null,t.next=null,t.item=void 0,null===(e=this._objectPool)||void 0===e||e.release(t),
this._size--}decreaseKey(t){
t!==this._root&&(t.prev.child===t?t.prev.child=t.next:t.prev.next=t.next,
null!=t.next&&(t.next.prev=t.prev),
this._root=y(this._root,t,this._lessThanFunc))}
get isEmpty(){return null==this._root}
[Symbol.iterator](){return this._iterate(!1)}
nodes(){return{
[Symbol.iterator]:()=>this._iterate(!0)}}
_iterate(t){const e=this._lessThanFunc
;return function*n(r){
r&&(t?yield r:yield r.item,r.child&&(null!=r.child.next&&(r.child=b(r.child,e),
r.child.prev=r),yield*n(r.child)))}(this._root)}}
function y(t,e,n){let r,s
;return null==t?e:null==e||t===e?t:(n(e.item,t.item)?(r=e,
s=t):(r=t,s=e),s.next=r.child,
null!=r.child&&(r.child.prev=s),s.prev=r,r.child=s,
r.next=null,r.prev=null,r)}function b(t,e){
let n,r,s,i,o;if(null==t)return null
;for(i=t,n=null;null!=i;){
if(r=i,s=r.next,null==s){r.prev=n,n=r;break}
i=s.next,o=y(r,s,e),o.prev=n,n=o}
for(o=null;null!=n;)i=n.prev,o=y(o,n,e),n=i
;return o}function p(t,e){t(function(t){return{
then(e,n){n(t)}}}(e))}function g(t){
return null!=t&&"object"==typeof t&&"function"==typeof t.then
}let m,w=[];function j(t){
w.push(t),m||(m=function(){
return c(this,void 0,void 0,function*(){
for(;w.length>0;){yield 0;const t=w
;w=[],t.forEach(t=>{try{t()}catch(t){
console.error("Unhandled promise rejection",t)}})}
m=null})}())}function S(t,e,n){j(()=>{try{
const r=e?e(t):t;n._resolve(r)}catch(t){
n._reject(t)}})}function x(t,e,n){j(()=>{if(e)try{
const r=e(t);n._resolve(r)}catch(t){n._reject(t)
}else n._reject(t)})}const E=function(){};class P{
constructor(t){
this.status="pending",this.value=void 0,this.reason=void 0,this._handlers=null
;const e=this._resolve,n=this._reject,r=this._resolveAsync,s=this._rejectAsync,i=this
;this._resolve=function(t){e.call(i,t)
},this._reject=function(t){n.call(i,t)
},this._resolveAsync=function(t){r.call(i,t)
},this._rejectAsync=function(t){s.call(i,t)
},t(this._resolve,this._reject)}_resolve(t){
"pending"===this.status&&(this.status="fulfilled",
this._resolveAsync(t))}_resolveAsync(t){
g(t)?t.then(this._resolveAsync,this._rejectAsync):this._resolveSync(t)
}_resolveSync(t){const e=this._handlers
;if(this.value=t,null!=e){this._handlers=null
;for(let n=0,r=e.length;n<r;n++){const[r,,s]=e[n]
;S(t,r,s)}}}_reject(t){
"pending"===this.status&&this._rejectAsync(t)}
_rejectAsync(t){
this.status="rejected",g(t)?t.then(this._rejectAsync,this._rejectAsync):this._rejectSync(t)
}_rejectSync(t){const e=this._handlers
;if(this.reason=t,null!=e){this._handlers=null
;for(let n=0,r=e.length;n<r;n++){const[,r,s]=e[n]
;x(t,r,s)}}}then(t,e){const n=new P(E)
;return"pending"===this.status?(null==this._handlers&&(this._handlers=[]),
this._handlers.push([t,e,n])):"fulfilled"===this.status?S(this.value,t,n):x(this.reason,e,n),
n}catch(t){return this.then(void 0,t)}finally(t){
const e=t&&function(e){const n=t()
;return g(n)?n.then(()=>e):P.resolve(e)
},n=t&&function(e){const n=t()
;return g(n)?n.then(()=>P.reject(e)):P.reject(e)}
;return this.then(e,n)}static resolve(t){
const e=new P(E);return e._resolve(t),e}
static reject(t){const e=new P(E)
;return e._reject(t),e}get[Symbol.toStringTag](){
return"Promise"}static get[Symbol.species](){
return P}static all(t){return function(t,e){
let n,r;e||(e=Promise);const s=new e((t,e)=>{
n=t,r=e});let i=t.length;const o=[]
;return t.forEach((t,e)=>{g(t)?t.then(t=>{
o[e]=t,0===--i&&n(o)},r):(o[e]=t,0===--i&&n(o))
}),s}(t,P)}static allSettled(t){
return function(t,e){let n;e||(e=Promise)
;const r=new e((t,e)=>{n=t});let s=t.length
;const i=[];return t.forEach((t,e)=>{
g(t)?t.then(t=>{i[e]={status:"fulfilled",value:t
},0===--s&&n(i)},t=>{i[e]={status:"rejected",
reason:t},0===--s&&n(i)}):(i[e]={
status:"fulfilled",value:t},0===--s&&n(i))}),r
}(t,P)}static any(t){return function(t,e){let n,r
;e||(e=Promise);const s=new e((t,e)=>{n=t,r=e})
;let i=t.length;const o=[]
;return t.forEach((t,e)=>{g(t)?t.then(n,t=>{
o[e]=t,0===--i&&r(new AggregateError(o))}):n(t)
}),s}(t,P)}static race(t){return function(t,e){
let n,r;e||(e=Promise);const s=new e((t,e)=>{
n=t,r=e});return t.forEach(t=>{
g(t)?t.then(n,r):n(t)}),s}(t,P)}}
const A=function(){};class k{constructor(t){
if(this._status="pending",t&&t.aborted)this.promise=P.reject(t.reason),
this.resolve=A,this.reject=A;else{let e,n
;if(this.promise=new Promise(function(t){
e=t,n=function(e){p(t,e)}}),t){
const r=t.subscribe(function(t){n(t)})
;this.resolve=function(t){r(),e(t)
},this.reject=function(t){r(),n(t)}
}else this.resolve=e,this.reject=n}
this.promise.then(()=>{this._status="resolved"
},()=>{this._status="rejected"})}get state(){
return this._status}}class T extends Error{
constructor(t,e){
super(t),Object.setPrototypeOf(this,T.prototype),this.reason=e,
this.name="AbortError",this._internal=!1}}
const z=()=>{};class O{constructor(){
this.aborted=!1,this.reason=void 0,this._callbacks=void 0
}subscribe(t){var e
;if(null===(e=this._callbacks)||void 0===e?void 0:e.has(t))throw new Error("Already subscribed: "+t)
;return this.aborted?(t.call(this,this.reason),
z):(this._callbacks||(this._callbacks=new Set),
this._callbacks.add(t),()=>{var e
;null===(e=this._callbacks)||void 0===e||e.delete(t)
})}abort(t){var e
;this.aborted=!0,this.reason=t,null===(e=this._callbacks)||void 0===e||e.forEach(t=>{
t.call(this,this.reason)}),this._callbacks=void 0}
throwIfAborted(){if(this.aborted)throw this.reason
}}class I{constructor(){this.signal=new O}
abort(t){
this.signal.aborted||(void 0===t&&((t=new T("Aborted with no reason",t))._internal=!0),
this.signal.abort(t))}}function M(t,e){
var n=0,r=null;function s(t,s,i){
return c(this,void 0,void 0,function(){var o
;return l(this,function(c){switch(c.label){case 0:
return r={error:t,args:s,index:i
},console.error("[test-variants] error variant: ".concat(i,"\n").concat(function(t){
return JSON.stringify(t,function(t,e){
return e&&"object"==typeof e&&!Array.isArray(e)&&e.constructor!==Object?e+"":e
},2)
}(s))),console.error(t),o=Date.now(),Date.now()-o>50&&n<5?(console.log("[test-variants] DEBUG ITERATION: "+n),
n++,[2]):e.onError?[4,e.onError(r)]:[3,2];case 1:
c.sent(),c.label=2;case 2:throw r.error}})})}
return function(e,n,r){try{var i=t(e,r)
;if(g(i))return i.then(function(t){
return"number"==typeof t?{iterationsAsync:t,
iterationsSync:0}:null!==t&&"object"==typeof t?t:{
iterationsAsync:1,iterationsSync:0}},function(t){
return s(t,e,n)});return"number"==typeof i?{
iterationsAsync:0,iterationsSync:i
}:null!==i&&"object"==typeof i?i:{
iterationsAsync:0,iterationsSync:1}}catch(t){
return s(t,e,n)}}}class F{constructor(t,e){
this._branch=null,this.order=t,this.parent=e}
get branch(){if(!this._branch){
const t=[this.order];let e=this.parent
;for(;null!=e;)t.push(e.order),e=e.parent
;this._branch=t}return this._branch}}
function D(t){
return null!=t&&"object"==typeof t&&"function"==typeof t.then
}let C,V=[];function R(t){
V.push(t),C||(C=function(){
return c(this,void 0,void 0,function*(){
for(;V.length>0;){yield 0;const t=V
;V=[],t.forEach(t=>{try{t()}catch(t){
console.error("Unhandled promise rejection",t)}})}
C=null})}())}function J(t,e,n){R(()=>{try{
const r=e?e(t):t;n._resolve(r)}catch(t){
n._reject(t)}})}function N(t,e,n){R(()=>{if(e)try{
const r=e(t);n._resolve(r)}catch(t){n._reject(t)
}else n._reject(t)})}const $=function(){};class G{
constructor(t){
this.status="pending",this.value=void 0,this.reason=void 0,this._handlers=null
;const e=this._resolve,n=this._reject,r=this._resolveAsync,s=this._rejectAsync,i=this
;this._resolve=function(t){e.call(i,t)
},this._reject=function(t){n.call(i,t)
},this._resolveAsync=function(t){r.call(i,t)
},this._rejectAsync=function(t){s.call(i,t)
},t(this._resolve,this._reject)}_resolve(t){
"pending"===this.status&&(this.status="fulfilled",
this._resolveAsync(t))}_resolveAsync(t){
D(t)?t.then(this._resolveAsync,this._rejectAsync):this._resolveSync(t)
}_resolveSync(t){const e=this._handlers
;if(this.value=t,null!=e){this._handlers=null
;for(let n=0,r=e.length;n<r;n++){const[r,,s]=e[n]
;J(t,r,s)}}}_reject(t){
"pending"===this.status&&this._rejectAsync(t)}
_rejectAsync(t){
this.status="rejected",D(t)?t.then(this._rejectAsync,this._rejectAsync):this._rejectSync(t)
}_rejectSync(t){const e=this._handlers
;if(this.reason=t,null!=e){this._handlers=null
;for(let n=0,r=e.length;n<r;n++){const[,r,s]=e[n]
;N(t,r,s)}}}then(t,e){const n=new G($)
;return"pending"===this.status?(null==this._handlers&&(this._handlers=[]),
this._handlers.push([t,e,n])):"fulfilled"===this.status?J(this.value,t,n):N(this.reason,e,n),
n}catch(t){return this.then(void 0,t)}finally(t){
const e=t&&function(e){const n=t()
;return D(n)?n.then(()=>e):G.resolve(e)
},n=t&&function(e){const n=t()
;return D(n)?n.then(()=>G.reject(e)):G.reject(e)}
;return this.then(e,n)}static resolve(t){
const e=new G($);return e._resolve(t),e}
static reject(t){const e=new G($)
;return e._reject(t),e}get[Symbol.toStringTag](){
return"Promise"}static get[Symbol.species](){
return G}static all(t){return function(t,e){
let n,r;e||(e=Promise);const s=new e((t,e)=>{
n=t,r=e});let i=t.length;const o=[]
;return t.forEach((t,e)=>{D(t)?t.then(t=>{
o[e]=t,0===--i&&n(o)},r):(o[e]=t,0===--i&&n(o))
}),s}(t,G)}static allSettled(t){
return function(t,e){let n;e||(e=Promise)
;const r=new e((t,e)=>{n=t});let s=t.length
;const i=[];return t.forEach((t,e)=>{
D(t)?t.then(t=>{i[e]={status:"fulfilled",value:t
},0===--s&&n(i)},t=>{i[e]={status:"rejected",
reason:t},0===--s&&n(i)}):(i[e]={
status:"fulfilled",value:t},0===--s&&n(i))}),r
}(t,G)}static any(t){return function(t,e){let n,r
;e||(e=Promise);const s=new e((t,e)=>{n=t,r=e})
;let i=t.length;const o=[]
;return t.forEach((t,e)=>{D(t)?t.then(n,t=>{
o[e]=t,0===--i&&r(new AggregateError(o))}):n(t)
}),s}(t,G)}static race(t){return function(t,e){
let n,r;e||(e=Promise);const s=new e((t,e)=>{
n=t,r=e});return t.forEach(t=>{
D(t)?t.then(n,r):n(t)}),s}(t,G)}}
const U=function(){};class W{constructor(t){
if(this._status="pending",t&&t.aborted)this.promise=G.reject(t.reason),
this.resolve=U,this.reject=U;else{let e,n
;if(this.promise=new Promise(function(t){
e=t,n=function(e){!function(t,e){t(function(t){
return{then(e,n){n(t)}}}(e))}(t,e)}}),t){
const r=t.subscribe(function(t){n(t)})
;this.resolve=function(t){r(),e(t)
},this.reject=function(t){r(),n(t)}
}else this.resolve=e,this.reject=n}
this.promise.then(()=>{this._status="resolved"
},()=>{this._status="rejected"})}get state(){
return this._status}}
var q="undefined"!=typeof globalThis?globalThis:"undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:{}
;!function(t){if(!t.setImmediate){
var e,n,r,s,i,o=1,c={},l=!1,a=t.document,u=Object.getPrototypeOf&&Object.getPrototypeOf(t)
;u=u&&u.setTimeout?u:t,
"[object process]"==={}.toString.call(t.process)?e=function(t){
process.nextTick(function(){f(t)})}:!function(){
if(t.postMessage&&!t.importScripts){
var e=!0,n=t.onmessage
;return t.onmessage=function(){e=!1
},t.postMessage("","*"),t.onmessage=n,e}
}()?t.MessageChannel?((r=new MessageChannel).port1.onmessage=function(t){
f(t.data)},e=function(t){r.port2.postMessage(t)
}):a&&"onreadystatechange"in a.createElement("script")?(n=a.documentElement,
e=function(t){var e=a.createElement("script")
;e.onreadystatechange=function(){
f(t),e.onreadystatechange=null,n.removeChild(e),
e=null},n.appendChild(e)}):e=function(t){
setTimeout(f,0,t)
}:(s="setImmediate$"+Math.random()+"$",i=function(e){
e.source===t&&"string"==typeof e.data&&0===e.data.indexOf(s)&&f(+e.data.slice(s.length))
},
t.addEventListener?t.addEventListener("message",i,!1):t.attachEvent("onmessage",i),
e=function(e){t.postMessage(s+e,"*")
}),u.setImmediate=function(t){
"function"!=typeof t&&(t=new Function(""+t))
;for(var n=new Array(arguments.length-1),r=0;r<n.length;r++)n[r]=arguments[r+1]
;var s={callback:t,args:n};return c[o]=s,e(o),o++
},u.clearImmediate=h}function h(t){delete c[t]}
function f(t){if(l)setTimeout(f,0,t);else{
var e=c[t];if(e){l=!0;try{!function(t){
var e=t.callback,n=t.args;switch(n.length){case 0:
e();break;case 1:e(n[0]);break;case 2:e(n[0],n[1])
;break;case 3:e(n[0],n[1],n[2]);break;default:
e.apply(void 0,n)}}(e)}finally{h(t),l=!1}}}}
}("undefined"==typeof self?q:self)
;const B=function(t){return t};function L(t,e){
return function(t,e){
const n=t&&t.branch,r=e&&e.branch,s=n?n.length:0,i=r?r.length:0,o=s>i?s:i
;for(let t=0;t<o;t++){
const e=t>=s?0:n[s-1-t],o=t>=i?0:r[i-1-t]
;if(e!==o)return e>o?1:-1}return 0
}(t.priority,e.priority)<0}let Q=1;class K{
constructor(){this._queue=new _({lessThanFunc:L})}
run(t,e,n){return this._run(!1,t,e,n)}
runTask(t,e,n){return this._run(!0,t,e,n)}
_run(t,e,n,r){const s=new W(r),i={
priority:(o=Q++,c=n,null==o?null==c?null:c:new F(o,c)),
func:e,abortSignal:r,resolve:s.resolve,
reject:s.reject,readyToRun:!t};var o,c
;if(this._queue.add(i),t){const t=this;return{
result:s.promise,setReadyToRun(e){
i.readyToRun=e,e&&!t._inProcess&&(t._inProcess=!0,
t._process())}}}
return this._inProcess||(this._inProcess=!0,this._process()),s.promise
}_process(){
return c(this,void 0,void 0,function*(){
const t=this._queue
;for(yield Promise.resolve().then(B);;){
if(yield 0,t.isEmpty){this._inProcess=!1;break}
let e=t.getMin()
;if(e.readyToRun)t.deleteMin();else{let n
;for(const e of t.nodes())if(e.item.readyToRun){
n=e;break}if(!n){this._inProcess=!1;break}
e=n.item,t.delete(n)}
if(e.abortSignal&&e.abortSignal.aborted)e.reject(e.abortSignal.reason);else try{
let t=e.func&&e.func(e.abortSignal)
;t&&"function"==typeof t.then&&(t=yield t),e.resolve(t)
}catch(t){e.reject(t)}}})}}const H=function(){
const t=new K;return function(e,n){
return t.run(void 0,e,n)}}();class X{
constructor(t){
if(this._maxSize=0,this._size=0,this._tickPromise=new k,!t)throw new Error("maxSize should be > 0")
;this._maxSize=t,
this._size=t,this._priorityQueue=new K}
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
if(!(this._size>=this._maxSize))return this._tickPromise||(this._tickPromise=new k),
function(t,e){return t?new Promise(function(n){
if(t&&t.aborted)return void p(n,t.reason);let r,s
;function i(t){s||(s=!0,r&&r(),p(n,t))}
e.then(function(t){r&&r(),n(t)
}).catch(i),t&&(r=t.subscribe(i))}):e
}(t,this._tickPromise.promise)}holdWait(t,e,n,r){
if(t>this.maxSize)throw new Error(`holdCount (${t} > maxSize (${this.maxSize}))`)
;return r||(r=H),
this._priorityQueue.run(n=>c(this,void 0,void 0,function*(){
for(;t>this._size;)yield this.tick(n),yield r(e,n)
;if(!this.hold(t))throw new Error("Unexpected behavior")
}),e,n)}}function Y(t){
if(null==t||t<=0)throw new Error("Iterations = ".concat(t))
;t--;var e=new Promise(function(e){
setTimeout(function(){e(t)},1)})
;return t<=0?e:e.then(Y)}function Z(t,e,n){
var r,s,d,v,_,y,b,p,m
;return void 0===n&&(n={}),c(this,void 0,void 0,function(){
function w(){
return c(this,void 0,void 0,function(){
var n,r=this;return l(this,function(s){
switch(s.label){case 0:n=function(){
var e,n,s,i,a,u,h;return l(this,function(d){
switch(d.label){case 0:return e=L,n=o(o({},Q),{
seed:q
}),s=(V||C)&&Date.now(),V&&s-st>=V&&(console.log(nt),st=s),F&&nt-ot>=F||D&&rt-ct>=D||C&&s-it>=C?(ot=nt,
ct=rt,it=s,[4,Y(1)]):[3,2];case 1:
d.sent(),d.label=2;case 2:
if(null==J?void 0:J.aborted)return[2,"continue"]
;if(lt&&!Z.aborted)return[3,10];d.label=3;case 3:
return d.trys.push([3,6,,9]),g(i=t(n,e,Z))?[4,i]:[3,5]
;case 4:i=d.sent(),d.label=5;case 5:
return i?(a=i.iterationsAsync,u=i.iterationsSync,
rt+=a,nt+=u+a,[3,9]):(et=!0,H.abort(),
[2,"continue"]);case 6:
return h=d.sent(),E?[4,f(n,E,j.argsToJson)]:[3,8]
;case 7:d.sent(),d.label=8;case 8:if(!N)throw h
;return B={error:h,args:n,index:e},et=!1,[3,9]
;case 9:return[3,13];case 10:
return lt.hold(1)?[3,12]:[4,lt.holdWait(1)]
;case 11:d.sent(),d.label=12;case 12:
c(r,void 0,void 0,function(){var r,s,i,o
;return l(this,function(c){switch(c.label){case 0:
return c.trys.push([0,3,6,7]),
(null==Z?void 0:Z.aborted)?[2]:g(r=t(n,e,Z))?[4,r]:[3,2]
;case 1:r=c.sent(),c.label=2;case 2:
return r?(s=r.iterationsAsync,i=r.iterationsSync,
rt+=s,nt+=i+s,[3,7]):(et=!0,H.abort(),[2]);case 3:
return o=c.sent(),E?[4,f(n,E,j.argsToJson)]:[3,5]
;case 4:c.sent(),c.label=5;case 5:if(!N)throw o
;return B={error:o,args:n,index:e},et=!1,[3,7]
;case 6:return lt.release(1),[7];case 7:return[2]}
})}),d.label=13;case 13:return[2]}})},s.label=1
;case 1:
return(null==J?void 0:J.aborted)||!et&&!function(){
for(;;){
if(N&&L>=0&&(null==B||L<B.index)&&++W<N.repeatsPerVariant)return q=N.getSeed({
variantIndex:L,cycleIndex:U,repeatIndex:W,
totalIndex:U*N.repeatsPerVariant+W}),!0
;if(W=0,L++,N&&U>=N.cycles)return!1
;if((null==G||L<G)&&(null==B||L<B.index)){
var t=K.next()
;if(!t.done)return Q=t.value,N&&(q=N.getSeed({
variantIndex:L,cycleIndex:U,repeatIndex:W,
totalIndex:U*N.repeatsPerVariant+W})),!0}
if(!N)return!1;if(++U>=N.cycles)return!1
;L=-1,K=e[Symbol.iterator]()}}()?[3,3]:[5,n()]
;case 2:return s.sent(),[3,1];case 3:
return lt?[4,lt.holdWait($)]:[3,5];case 4:
s.sent(),lt.release($),s.label=5;case 5:
if(null==tt?void 0:tt.aborted)throw tt.reason
;return R&&console.log("[test-variants] variants: ".concat(L,", iterations: ").concat(nt,", async: ").concat(rt)),
[4,Y(1)];case 6:return s.sent(),[2,nt]}})})}
var j,S,x,E,P,A,k,T,z,O,M,F,D,C,V,R,J,N,$,G,U,W,q,B,L,Q,K,H,Z,tt,et,nt,rt,st,it,ot,ct,lt,at,ut
;return l(this,function(o){switch(o.label){case 0:
return j=n.saveErrorVariants,S=null!==(r=null==j?void 0:j.retriesPerVariant)&&void 0!==r?r:1,
x=new Date,
E=j?i.resolve(j.dir,null!==(d=null===(s=j.getFilePath)||void 0===s?void 0:s.call(j,{
sessionDate:x}))&&void 0!==d?d:h({sessionDate:x
})):null,j?[4,a(j.dir)]:[3,12];case 1:
P=o.sent(),o.label=2;case 2:
o.trys.push([2,10,11,12]),A=function(t){
var e="function"==typeof Symbol&&Symbol.iterator,n=e&&t[e],r=0
;if(n)return n.call(t)
;if(t&&"number"==typeof t.length)return{
next:function(){
return t&&r>=t.length&&(t=void 0),{
value:t&&t[r++],done:!t}}}
;throw new TypeError(e?"Object is not iterable.":"Symbol.iterator is not defined.")
}(P),k=A.next(),o.label=3;case 3:
return k.done?[3,9]:[4,u(k.value,j.jsonToArgs)]
;case 4:T=o.sent(),z=0,o.label=5;case 5:
return z<S?g(O=t(T,-1,null))?[4,O]:[3,7]:[3,8]
;case 6:o.sent(),o.label=7;case 7:return z++,[3,5]
;case 8:return k=A.next(),[3,3];case 9:
return[3,12];case 10:return M=o.sent(),at={error:M
},[3,12];case 11:try{
k&&!k.done&&(ut=A.return)&&ut.call(A)}finally{
if(at)throw at.error}return[7];case 12:
return F=null!==(v=n.GC_Iterations)&&void 0!==v?v:1e6,
D=null!==(_=n.GC_IterationsAsync)&&void 0!==_?_:1e4,
C=null!==(y=n.GC_Interval)&&void 0!==y?y:1e3,
V=null!==(b=n.logInterval)&&void 0!==b?b:5e3,
R=null===(p=n.logCompleted)||void 0===p||p,
J=n.abortSignal,N=n.findBestError,$=!0===n.parallel?Math.pow(2,31):!n.parallel||n.parallel<=0?1:n.parallel,
G=null!==(m=n.limitVariantsCount)&&void 0!==m?m:null,
U=0,W=0,q=void 0,B=null,L=-1,
Q={},K=e[Symbol.iterator](),H=new I,Z=function(...t){
let e,n;function r(t){e.abort(t)}
for(let s=0;s<t.length;s++){const i=t[s];if(i){
if(i.aborted)return i
;n?(e||(e=new I,n.subscribe(r)),i.subscribe(r)):n=i
}}return e?e.signal:n||(new I).signal
}(J,H.signal),tt=Z,et=!1,nt=0,rt=0,st=Date.now(),
it=st,ot=nt,ct=rt,lt=$<=1?null:new X($),[4,w()]
;case 13:return[2,{iterations:o.sent(),bestError:B
}]}})})}t.createTestVariants=function(t){
return function(e){return function(n){
return c(this,void 0,void 0,function(){var r,s
;return l(this,function(i){return r=M(t,{
onError:null==n?void 0:n.onError}),s=d({
argsTemplates:e}),[2,Z(r,s,n)]})})}}
},t.generateErrorVariantFilePath=h,Object.defineProperty(t,"__esModule",{
value:!0})}({},fs,path);
