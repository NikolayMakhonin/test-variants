'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

const emptyFunc = () => { };
class AbortSignalFast {
    constructor() {
        this.aborted = false;
        this.reason = void 0;
        this._callbacks = void 0;
    }
    subscribe(callback) {
        var _a;
        if ((_a = this._callbacks) === null || _a === void 0 ? void 0 : _a.has(callback)) {
            throw new Error('Already subscribed: ' + callback);
        }
        if (this.aborted) {
            callback.call(this, this.reason);
            return emptyFunc;
        }
        if (!this._callbacks) {
            this._callbacks = new Set();
        }
        this._callbacks.add(callback);
        return () => {
            var _a;
            (_a = this._callbacks) === null || _a === void 0 ? void 0 : _a.delete(callback);
        };
    }
    abort(reason) {
        var _a;
        this.aborted = true;
        this.reason = reason;
        (_a = this._callbacks) === null || _a === void 0 ? void 0 : _a.forEach(callback => {
            callback.call(this, this.reason);
        });
        this._callbacks = void 0;
    }
    throwIfAborted() {
        if (this.aborted) {
            throw this.reason;
        }
    }
}

exports.AbortSignalFast = AbortSignalFast;
