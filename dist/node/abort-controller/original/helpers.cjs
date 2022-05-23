'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function assertThis(_this, _class) {
    if (!_this || _this.constructor.prototype === _this) {
        const error = new TypeError(`Value of "this" must be of type ${_class.name}`);
        error.code = 'ERR_INVALID_THIS';
        throw error;
    }
}
function initClass(_class, _super) {
    Object.setPrototypeOf(_class, _super);
    function __() { this.constructor = _class; }
    if (_super == null) {
        _class.prototype = Object.create(_super);
    }
    else {
        __.prototype = _super.prototype;
        _class.prototype = new __();
    }
}

exports.assertThis = assertThis;
exports.initClass = initClass;
