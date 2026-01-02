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
exports.MovementSystem = void 0;
var ecs_1 = require("@forge-game-engine/forge/ecs");
var common_1 = require("@forge-game-engine/forge/common");
var math_1 = require("@forge-game-engine/forge/math");
var _player_component_1 = require("./_player.component");
var MovementSystem = /** @class */ (function (_super) {
    __extends(MovementSystem, _super);
    function MovementSystem(moveAction, time) {
        var _this = _super.call(this, [_player_component_1.PlayerComponent, common_1.PositionComponent], 'MovementSystem') || this;
        _this._moveAction = moveAction;
        _this._time = time;
        return _this;
    }
    MovementSystem.prototype.run = function (entity) {
        var _a = entity.getComponentRequired(_player_component_1.PlayerComponent), speed = _a.speed, minX = _a.minX, maxX = _a.maxX, minY = _a.minY, maxY = _a.maxY;
        var playerPosition = entity.getComponentRequired(common_1.PositionComponent);
        var movementVector = this._moveAction.value
            .multiply(speed * 10)
            .multiply(this._time.deltaTimeInSeconds);
        playerPosition.world.x = (0, math_1.clamp)(playerPosition.world.x + movementVector.x, minX, maxX);
        playerPosition.world.y = (0, math_1.clamp)(playerPosition.world.y - movementVector.y, minY, maxY);
    };
    return MovementSystem;
}(ecs_1.System));
exports.MovementSystem = MovementSystem;
