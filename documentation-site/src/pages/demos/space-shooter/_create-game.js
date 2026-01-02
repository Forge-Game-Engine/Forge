"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSpaceShooterGame = void 0;
var common_1 = require("@forge-game-engine/forge/common");
var ecs_1 = require("@forge-game-engine/forge/ecs");
var input_1 = require("@forge-game-engine/forge/input");
var rendering_1 = require("@forge-game-engine/forge/rendering");
var get_asset_url_1 = require("@site/src/utils/get-asset-url");
var utilities_1 = require("@forge-game-engine/forge/utilities");
var _player_component_1 = require("./_player.component");
var _movement_system_1 = require("./_movement.system");
var _create_background_1 = require("./_create-background");
var _background_system_1 = require("./_background.system");
var particles_1 = require("@forge-game-engine/forge/particles");
var audio_1 = require("@forge-game-engine/forge/audio");
var _create_music_1 = require("./_create-music");
var createSpaceShooterGame = function () { return __awaiter(void 0, void 0, void 0, function () {
    var _a, game, world, renderContext, time, renderLayer, moveInput, shootInput, inputsManager, keyboardInputSource, cameraEntity, playerSprite, playerEntity;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = (0, utilities_1.createGame)('demo-game'), game = _a.game, world = _a.world, renderContext = _a.renderContext, time = _a.time;
                renderLayer = new rendering_1.RenderLayer();
                moveInput = new input_1.Axis2dAction('move', null, input_1.actionResetTypes.noReset);
                shootInput = new input_1.HoldAction('shoot');
                inputsManager = (0, ecs_1.registerInputs)(world, time, {
                    axis2dActions: [moveInput],
                    holdActions: [shootInput],
                }).inputsManager;
                keyboardInputSource = new input_1.KeyboardInputSource(inputsManager);
                keyboardInputSource.axis2dBindings.add(new input_1.KeyboardAxis2dBinding(moveInput, input_1.keyCodes.w, input_1.keyCodes.s, input_1.keyCodes.d, input_1.keyCodes.a));
                keyboardInputSource.holdBindings.add(new input_1.KeyboardHoldBinding(shootInput, input_1.keyCodes.space));
                cameraEntity = (0, ecs_1.registerCamera)(world, time);
                return [4 /*yield*/, (0, rendering_1.createImageSprite)((0, get_asset_url_1.getAssetUrl)('img/space-shooter/ship_G.png'), renderContext, cameraEntity)];
            case 1:
                playerSprite = _b.sent();
                playerSprite.tintColor = new rendering_1.Color(0.6, 1, 0.6);
                playerEntity = world.buildAndAddEntity([
                    new rendering_1.SpriteComponent(playerSprite),
                    new common_1.PositionComponent(0, 250),
                    new _player_component_1.PlayerComponent(50, -300, 300, -100, 270),
                ]);
                world.buildAndAddEntity([new rendering_1.RenderLayerComponent(renderLayer)]);
                return [4 /*yield*/, (0, _create_background_1.createBackground)(world, cameraEntity, renderLayer, renderContext)];
            case 2:
                _b.sent();
                (0, _create_music_1.createMusic)(world);
                renderLayer.addEntity(playerSprite.renderable, playerEntity);
                world.addSystem(new rendering_1.RenderSystem(renderContext));
                world.addSystem(new _movement_system_1.MovementSystem(moveInput, time));
                world.addSystem(new _background_system_1.BackgroundSystem(time));
                world.addSystem(new particles_1.ParticleEmitterSystem(world, time));
                world.addSystem(new particles_1.ParticlePositionSystem(time));
                world.addSystem(new audio_1.AudioSystem(world));
                return [2 /*return*/, game];
        }
    });
}); };
exports.createSpaceShooterGame = createSpaceShooterGame;
