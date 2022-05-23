'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

class AbortError extends Error {
    constructor(message, reason) {
        super(message);
        // see: https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
        Object.setPrototypeOf(this, AbortError.prototype);
        this.reason = reason;
        this.name = 'AbortError';
    }
}

exports.AbortError = AbortError;
