'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function argsToString(args) {
    return JSON.stringify(args, (_, value) => {
        if (value
            && typeof value === 'object'
            && !Array.isArray(value)
            && value.constructor !== Object) {
            return value + '';
        }
        return value;
    }, 2);
}

exports.argsToString = argsToString;
