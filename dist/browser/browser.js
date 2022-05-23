!function(t){"use strict"
;var o="undefined"!=typeof AbortSignal?AbortSignal:void 0,r="undefined"!=typeof AbortController?AbortController:void 0
;function n(t,o){
if(!t||t.constructor.prototype===t){
var r=new TypeError('Value of "this" must be of type '.concat(o.name))
;throw r.code="ERR_INVALID_THIS",r}}
function e(t,o){function r(){this.constructor=t}
Object.setPrototypeOf(t,o),null==o?t.prototype=Object.create(o):(r.prototype=o.prototype,
t.prototype=new r)}var i=function(t,o){
return i=Object.setPrototypeOf||{__proto__:[]
}instanceof Array&&function(t,o){t.__proto__=o
}||function(t,o){
for(var r in o)Object.prototype.hasOwnProperty.call(o,r)&&(t[r]=o[r])
},i(t,o)};function a(t,o){
if("function"!=typeof o&&null!==o)throw new TypeError("Class extends value "+String(o)+" is not a constructor or null")
;function r(){this.constructor=t}
i(t,o),t.prototype=null===o?Object.create(o):(r.prototype=o.prototype,
new r)}var s,c=function(t){function o(o,r){
var n=t.call(this,o)||this;return n.name=r,n}
return a(o,t),o}(Error),u=function(){try{
if("undefined"!=typeof DOMException)return new DOMException,
DOMException}catch(t){}return c}()
;"undefined"!=typeof window&&e(s=function(){
return document.createDocumentFragment()
},DocumentFragment);var l=function(){try{
if("undefined"!=typeof EventTarget)return new EventTarget,
EventTarget}catch(t){}return s
}(),f=Symbol("kAborted"),b=Symbol("kReason"),p=Symbol("kOnAbort"),h=function(){
var t=new TypeError("Illegal constructor")
;throw t.code="ERR_ILLEGAL_CONSTRUCTOR",t}
;e(h,l),Object.defineProperty(h.prototype,"aborted",{
get:function(){return n(this,h),this[f]},
enumerable:!1,configurable:!0
}),Object.defineProperty(h.prototype,"reason",{
get:function(){return n(this,h),this[b]},
enumerable:!1,configurable:!0
}),Object.defineProperty(h.prototype,"throwIfAborted",{
value:function(){
if(n(this,h),this.aborted)throw this.reason},
writable:!0,enumerable:!1,configurable:!0
}),Object.defineProperty(h.prototype,"onabort",{
get:function(){return this[p]||null},
set:function(t){
this[p]!==t&&(this[p]&&this.removeEventListener("abort",this[p]),
this[p]=t,this[p]&&this.addEventListener("abort",this[p]))
},enumerable:!1,configurable:!0})
;var d=Symbol("kSignal"),y=function(){
function t(){var t
;this[d]=(t=new l,Object.setPrototypeOf(t,h.prototype),t[f]=!1,
t[b]=void 0,t[p]=null,t)}
return Object.defineProperty(t.prototype,"signal",{
get:function(){return n(this,t),this[d]},
enumerable:!1,configurable:!0
}),t.prototype.abort=function(o){
n(this,t),function(t,o){
void 0===o&&(o=new u("This operation was aborted","AbortError")),
t[f]||(t[b]=o,t[f]=!0,
t.dispatchEvent(new Event("abort")))
}(this.signal,o)},t
}(),v=function(){},g=function(){function t(){
this.aborted=!1,this.reason=void 0,
this._callbacks=void 0}
return t.prototype.subscribe=function(t){
var o,r=this
;if(null===(o=this._callbacks)||void 0===o?void 0:o.has(t))throw new Error("Already subscribed: "+t)
;return this.aborted?(t.call(this,this.reason),
v):(this._callbacks||(this._callbacks=new Set),
this._callbacks.add(t),function(){var o
;null===(o=r._callbacks)||void 0===o||o.delete(t)
})},t.prototype.abort=function(t){var o,r=this
;this.aborted=!0,this.reason=t,null===(o=this._callbacks)||void 0===o||o.forEach((function(t){
t.call(r,r.reason)})),this._callbacks=void 0
},t.prototype.throwIfAborted=function(){
if(this.aborted)throw this.reason},t
}(),w=function(t){function o(r,n){
var e=t.call(this,r)||this
;return Object.setPrototypeOf(e,o.prototype),e.reason=n,
e.name="AbortError",e}return a(o,t),o
}(Error),E=function(){function t(){
this.signal=new g}
return t.prototype.abort=function(t){
this.signal.aborted||(t instanceof Error||(t=new w("Aborted"+(void 0===t?"":" with reason: "+(null==t?void 0:t.toString())),t)),
this.signal.abort(t))},t}()
;t.AbortControllerClass=r,t.AbortControllerFast=E,t.AbortControllerImpl=y,
t.AbortSignalClass=o,
t.toAbortController=function(t){var o=new y
;return t.signal.subscribe((function(t){
t instanceof w&&(t=t.reason),o.abort(t)})),o
},t.toAbortControllerFast=function(t){var o=new E
;return t.signal.addEventListener("abort",(function(t){
o.abort(this.reason)})),o
},t.toAbortSignal=function(t){var o=new y
;return t.subscribe((function(t){o.abort(t)
})),o.signal},t.toAbortSignalFast=function(t){
var o=new E
;return t.addEventListener("abort",(function(t){
o.abort(t)})),o.signal
},Object.defineProperty(t,"__esModule",{value:!0})
}({});
