"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Demo = void 0;
var react_1 = require("react");
var Layout_1 = require("@theme/Layout");
var useGame_1 = require("@site/src/hooks/useGame");
var _Demo_module_css_1 = require("./_Demo.module.css");
var _CodeSelector_1 = require("./_CodeSelector");
var Demo = function (_a) {
    var metaData = _a.metaData, blurb = _a.blurb, interactions = _a.interactions, header = _a.header, createGame = _a.createGame, codeFiles = _a.codeFiles;
    (0, useGame_1.useGame)(createGame);
    return (<Layout_1.default title={metaData.title} description={metaData.description} wrapperClassName={_Demo_module_css_1.default.wrapper}>
      <div className={_Demo_module_css_1.default.container}>
        <h1>{header}</h1>
        {interactions}
        <div className={_Demo_module_css_1.default.demoContainer}>
          <div id="demo-game" className={_Demo_module_css_1.default.demoBox}></div>
          <_CodeSelector_1.CodeSelector codeFiles={codeFiles}/>
        </div>
        <p>{blurb}</p>
      </div>
    </Layout_1.default>);
};
exports.Demo = Demo;
