'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function testVariantsIterable({ argsTemplates, }) {
    return {
        [Symbol.iterator]() {
            const keys = Object.keys(argsTemplates);
            const templates = Object.values(argsTemplates);
            const keysCount = keys.length;
            const args = {};
            function calcVariants(keyIndex) {
                let template = templates[keyIndex];
                if (typeof template === 'function') {
                    template = template(args);
                }
                return template;
            }
            const indexes = [];
            const variants = [];
            for (let nArg = 0; nArg < keysCount; nArg++) {
                indexes[nArg] = -1;
                variants[nArg] = [];
            }
            variants[0] = calcVariants(0);
            function nextVariant() {
                for (let keyIndex = keysCount - 1; keyIndex >= 0; keyIndex--) {
                    const valueIndex = indexes[keyIndex] + 1;
                    if (valueIndex < variants[keyIndex].length) {
                        const key = keys[keyIndex];
                        const value = variants[keyIndex][valueIndex];
                        indexes[keyIndex] = valueIndex;
                        args[key] = value;
                        for (keyIndex++; keyIndex < keysCount; keyIndex++) {
                            const keyVariants = calcVariants(keyIndex);
                            if (keyVariants.length === 0) {
                                break;
                            }
                            indexes[keyIndex] = 0;
                            variants[keyIndex] = keyVariants;
                            const key = keys[keyIndex];
                            const value = keyVariants[0];
                            args[key] = value;
                        }
                        if (keyIndex >= keysCount) {
                            return true;
                        }
                    }
                }
                return false;
            }
            return {
                next() {
                    if (nextVariant()) {
                        return {
                            done: false,
                            value: Object.assign({}, args),
                        };
                    }
                    return { done: true, value: null };
                },
            };
        },
    };
}

exports.testVariantsIterable = testVariantsIterable;
