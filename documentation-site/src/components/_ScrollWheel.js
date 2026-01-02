"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScrollWheel = void 0;
var react_1 = require("react");
var useDocusaurusContext_1 = require("@docusaurus/useDocusaurusContext");
var ScrollWheel = function () {
    var siteConfig = (0, useDocusaurusContext_1.default)().siteConfig;
    return (<img src={"".concat(siteConfig.baseUrl, "/img/scroll.png")} alt="scroll icon" style={{
            width: 35,
            height: 35,
        }}/>);
};
exports.ScrollWheel = ScrollWheel;
