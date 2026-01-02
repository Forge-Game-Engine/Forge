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
exports.createBackground = createBackground;
var rendering_1 = require("@forge-game-engine/forge/rendering");
var common_1 = require("@forge-game-engine/forge/common");
var particles_1 = require("@forge-game-engine/forge/particles");
var _background_shader_1 = require("./_background.shader");
var _background_component_1 = require("./_background.component");
var get_asset_url_1 = require("@site/src/utils/get-asset-url");
function createBackground(world, cameraEntity, renderLayer, renderContext) {
    return __awaiter(this, void 0, void 0, function () {
        var vertexShader, fragmentShader, backgroundMaterial, backgroundSprite, backgroundEntity, smallStarSprite, emitter, emitterComponent;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    renderContext.shaderCache.addShader(_background_shader_1.backgroundShader);
                    vertexShader = renderContext.shaderCache.getShader('sprite.vert');
                    fragmentShader = renderContext.shaderCache.getShader('background.frag');
                    backgroundMaterial = new rendering_1.Material(vertexShader, fragmentShader, renderContext.gl);
                    backgroundMaterial.setUniform('u_resolution', new Float32Array([renderContext.canvas.width, renderContext.canvas.height]));
                    backgroundMaterial.setUniform('u_color', new rendering_1.Color(0.2, 0.2, 1, 0.9).toFloat32Array());
                    backgroundSprite = (0, rendering_1.createSprite)(backgroundMaterial, renderContext, cameraEntity, renderContext.canvas.width, renderContext.canvas.height);
                    backgroundEntity = world.buildAndAddEntity([
                        new rendering_1.SpriteComponent(backgroundSprite),
                        new common_1.PositionComponent(0, 0),
                        new _background_component_1.BackgroundComponent(),
                    ]);
                    return [4 /*yield*/, (0, rendering_1.createImageSprite)((0, get_asset_url_1.getAssetUrl)('img/space-shooter/star_small.png'), renderContext, cameraEntity)];
                case 1:
                    smallStarSprite = _a.sent();
                    emitter = new particles_1.ParticleEmitter(smallStarSprite, renderLayer, {
                        emitDurationSeconds: 10,
                        lifetimeSecondsRange: { min: 5, max: 10 },
                    });
                    emitterComponent = new particles_1.ParticleEmitterComponent(new Map([['emitter', emitter]]));
                    world.buildAndAddEntity([emitterComponent]);
                    renderLayer.addEntity(backgroundSprite.renderable, backgroundEntity);
                    return [2 /*return*/];
            }
        });
    });
}
