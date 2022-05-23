'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

class DOMException extends Error {
    constructor(message, name) {
        super(message);
        this.name = name;
    }
}

exports.DOMExceptionImpl = DOMException;
