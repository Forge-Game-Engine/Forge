"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InteractionInstruction = void 0;
var react_1 = require("react");
var _InteractionInstruction_module_css_1 = require("./_InteractionInstruction.module.css");
var InteractionInstruction = function (_a) {
    var displayElement = _a.displayElement, text = _a.text;
    return (<div className={_InteractionInstruction_module_css_1.default.container}>
      {displayElement}
      <p>{text}</p>
    </div>);
};
exports.InteractionInstruction = InteractionInstruction;
