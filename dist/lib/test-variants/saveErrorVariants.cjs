'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var tslib = require('tslib');
var fs = require('fs');
var path = require('path');

function _interopNamespace(e) {
    if (e && e.__esModule) return e;
    var n = Object.create(null);
    if (e) {
        Object.keys(e).forEach(function (k) {
            if (k !== 'default') {
                var d = Object.getOwnPropertyDescriptor(e, k);
                Object.defineProperty(n, k, d.get ? d : {
                    enumerable: true,
                    get: function () { return e[k]; }
                });
            }
        });
    }
    n["default"] = e;
    return Object.freeze(n);
}

var fs__namespace = /*#__PURE__*/_interopNamespace(fs);
var path__namespace = /*#__PURE__*/_interopNamespace(path);

/** Reads saved error variant files from directory, sorted by filename descending (newest first) */
function readErrorVariantFiles(dir) {
    return tslib.__awaiter(this, void 0, void 0, function* () {
        const stat = yield fs__namespace.promises.stat(dir).catch(() => null);
        if (stat == null) {
            return [];
        }
        if (!stat.isDirectory()) {
            throw new Error(`[saveErrorVariants] path is not a directory: ${dir}`);
        }
        const files = yield fs__namespace.promises.readdir(dir);
        const jsonFiles = files
            .filter(file => file.endsWith('.json'))
            .sort((a, b) => a > b ? -1 : a < b ? 1 : 0);
        return jsonFiles.map(file => path__namespace.join(dir, file));
    });
}
/** Parses saved error variant file and transforms JSON to args */
function parseErrorVariantFile(filePath, jsonToArgs) {
    return tslib.__awaiter(this, void 0, void 0, function* () {
        const content = yield fs__namespace.promises.readFile(filePath, 'utf-8');
        let json;
        try {
            json = JSON.parse(content);
        }
        catch (err) {
            throw new Error(`[saveErrorVariants] invalid JSON in file: ${filePath}`);
        }
        if (jsonToArgs) {
            try {
                return jsonToArgs(json);
            }
            catch (err) {
                throw new Error(`[saveErrorVariants] jsonToArgs failed for file: ${filePath}`);
            }
        }
        return json;
    });
}
/** Generates default error variant file path: YYYY-MM-DD_HH-mm-ss.json (UTC) */
function generateErrorVariantFilePath(options) {
    return options.sessionDate.toISOString().substring(0, 19).replace('T', '_').replaceAll(':', '-') + '.json';
}
/** Saves error-causing args to a JSON file, overwrites if file exists */
function saveErrorVariantFile(args, filePath, argsToJson) {
    return tslib.__awaiter(this, void 0, void 0, function* () {
        let content;
        if (argsToJson) {
            const result = argsToJson(args);
            if (typeof result === 'string') {
                content = result;
            }
            else {
                content = JSON.stringify(result, null, 2);
            }
        }
        else {
            content = JSON.stringify(args, null, 2);
        }
        yield fs__namespace.promises.mkdir(path__namespace.dirname(filePath), { recursive: true });
        yield fs__namespace.promises.writeFile(filePath, content, 'utf-8');
    });
}

exports.generateErrorVariantFilePath = generateErrorVariantFilePath;
exports.parseErrorVariantFile = parseErrorVariantFile;
exports.readErrorVariantFiles = readErrorVariantFiles;
exports.saveErrorVariantFile = saveErrorVariantFile;
