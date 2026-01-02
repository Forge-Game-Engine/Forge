"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeyboardKey = void 0;
var react_1 = require("react");
var _KeyboardKey_module_css_1 = require("./_KeyboardKey.module.css");
var KeyboardKey = function (_a) {
    var keyCode = _a.keyCode;
    return (<div className={_KeyboardKey_module_css_1.default.keyBox}>
      <div className={_KeyboardKey_module_css_1.default.keyTop}>{keyCode}</div>
    </div>);
};
exports.KeyboardKey = KeyboardKey;
