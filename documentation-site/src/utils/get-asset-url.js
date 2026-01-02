"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAssetUrl = void 0;
var getAssetUrl = function (fileName) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-member-access
    return require("@site/static/".concat(fileName)).default;
};
exports.getAssetUrl = getAssetUrl;
