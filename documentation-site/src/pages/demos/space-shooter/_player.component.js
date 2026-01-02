"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlayerComponent = void 0;
var ecs_1 = require("@forge-game-engine/forge/ecs");
var PlayerComponent = /** @class */ (function (_super) {
    __extends(PlayerComponent, _super);
    function PlayerComponent(speed, minX, maxX, minY, maxY) {
        var _this = _super.call(this) || this;
        _this.speed = speed;
        _this.minX = minX;
        _this.maxX = maxX;
        _this.minY = minY;
        _this.maxY = maxY;
        return _this;
    }
    return PlayerComponent;
}(ecs_1.Component));
exports.PlayerComponent = PlayerComponent;
