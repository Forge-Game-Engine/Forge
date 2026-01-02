"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeSelector = void 0;
/* eslint-disable @typescript-eslint/naming-convention */
var react_1 = require("react");
var CodeBlock_1 = require("@theme/CodeBlock");
var clean_code_snippet_1 = require("../utils/clean-code-snippet");
var _CodeSelector_module_css_1 = require("./_CodeSelector.module.css");
var clsx_1 = require("clsx");
var fileTypeIconLookup = {
    Components: 'fa-cube',
    Systems: 'fa-gears',
    Game: 'fa-earth-africa',
    Shaders: 'fa-palette',
    Others: 'fa-code',
};
var getFileTypeIcon = function (fileName) {
    if (fileName.includes('.component')) {
        return 'Components';
    }
    if (fileName.includes('.system')) {
        return 'Systems';
    }
    if (fileName.includes('game')) {
        return 'Game';
    }
    if (fileName.includes('.shader')) {
        return 'Shaders';
    }
    return 'Others';
};
var groupByFileType = function (codeFiles) {
    var record = {
        Game: [],
        Components: [],
        Systems: [],
        Shaders: [],
        Others: [],
    };
    var groups = codeFiles.reduce(function (acc, file) {
        var fileType = getFileTypeIcon(file.name);
        if (!acc[fileType]) {
            acc[fileType] = [];
        }
        acc[fileType].push(file);
        return acc;
    }, record);
    return groups;
};
var CodeSelector = function (_a) {
    var codeFiles = _a.codeFiles, selectedFileName = _a.selectedFileName;
    var _b = (0, react_1.useState)(codeFiles.find(function (file) { return file.name === selectedFileName; }) || codeFiles[0]), selectedFile = _b[0], setSelectedFile = _b[1];
    var _c = (0, react_1.useState)(false), selectingFile = _c[0], setSelectingFile = _c[1];
    var fileType = getFileTypeIcon(selectedFile.name);
    var fileTypeIcon = fileTypeIconLookup[fileType];
    var groupedFiles = groupByFileType(codeFiles);
    return (<div className={_CodeSelector_module_css_1.default.container}>
      <div className={_CodeSelector_module_css_1.default.fileNameToolbar}>
        <i className={(0, clsx_1.default)('fa-solid', fileTypeIcon, _CodeSelector_module_css_1.default.fileTypeIcon)}></i>
        <span className={_CodeSelector_module_css_1.default.fileName}>{selectedFile.name}</span>
        <button onClick={function () { return setSelectingFile(!selectingFile); }}>
          <i className={(0, clsx_1.default)('fa-solid fa-folder', _CodeSelector_module_css_1.default.folder)}></i>
        </button>
      </div>
      {selectingFile && (<div className={_CodeSelector_module_css_1.default.codeSelector}>
          {Object.entries(groupedFiles).map(function (_a) {
                var type = _a[0], files = _a[1];
                var typeIcon = fileTypeIconLookup[type];
                if (files.length === 0) {
                    return null;
                }
                return (<div key={type} className={_CodeSelector_module_css_1.default.fileTypeGroup}>
                <i className={(0, clsx_1.default)('fa-solid', typeIcon, _CodeSelector_module_css_1.default.fileIcon)}></i>
                {type}
                {files.map(function (file) {
                        return (<button key={file.name} className={(0, clsx_1.default)(file.name === selectedFile.name
                                ? _CodeSelector_module_css_1.default.selectedFile
                                : undefined)} onClick={function () {
                                setSelectedFile(file);
                                setSelectingFile(false);
                            }}>
                      <span className={_CodeSelector_module_css_1.default.fileButtonName}>{file.name}</span>
                    </button>);
                    })}
              </div>);
            })}
        </div>)}
      <CodeBlock_1.default language="typescript" className={_CodeSelector_module_css_1.default.codeBlock} showLineNumbers>
        {(0, clean_code_snippet_1.cleanCodeSnippet)(selectedFile.content)}
      </CodeBlock_1.default>
    </div>);
};
exports.CodeSelector = CodeSelector;
