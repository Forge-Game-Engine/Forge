"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMusic = createMusic;
var audio_1 = require("@forge-game-engine/forge/audio");
var get_asset_url_1 = require("@site/src/utils/get-asset-url");
function createMusic(world) {
    world.buildAndAddEntity([
        new audio_1.AudioComponent({
            src: (0, get_asset_url_1.getAssetUrl)('audio/background-space-music.mp3'),
            loop: true,
            volume: 0.5,
        }, true),
    ]);
}
