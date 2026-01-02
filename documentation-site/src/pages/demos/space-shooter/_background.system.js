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
exports.BackgroundSystem = void 0;
var ecs_1 = require("@forge-game-engine/forge/ecs");
var rendering_1 = require("@forge-game-engine/forge/rendering");
var _background_component_1 = require("./_background.component");
var BackgroundSystem = /** @class */ (function (_super) {
    __extends(BackgroundSystem, _super);
    function BackgroundSystem(time) {
        var _this = _super.call(this, [_background_component_1.BackgroundComponent, rendering_1.SpriteComponent], 'BackgroundSystem') || this;
        _this._time = time;
        return _this;
    }
    BackgroundSystem.prototype.run = function (entity) {
        var sprite = entity.getComponentRequired(rendering_1.SpriteComponent).sprite;
        sprite.renderable.material.setUniform('u_time', this._time.timeInSeconds);
    };
    return BackgroundSystem;
}(ecs_1.System));
exports.BackgroundSystem = BackgroundSystem;
