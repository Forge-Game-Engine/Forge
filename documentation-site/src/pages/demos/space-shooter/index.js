"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Rendering;
var react_1 = require("react");
var _create_game_1 = require("./_create-game");
var _create_game_2 = require("!!raw-loader!./_create-game");
var _player_component_1 = require("!!raw-loader!./_player.component");
var _movement_system_1 = require("!!raw-loader!./_movement.system");
var _create_background_1 = require("!!raw-loader!./_create-background");
var _background_system_1 = require("!!raw-loader!./_background.system");
var _background_component_1 = require("!!raw-loader!./_background.component");
var _background_shader_1 = require("!!raw-loader!./_background.shader");
var _create_music_1 = require("!!raw-loader!./_create-music");
var Demo_1 = require("@site/src/components/Demo");
var _InteractionInstruction_1 = require("@site/src/components/_InteractionInstruction");
var _KeyboardKey_1 = require("@site/src/components/_KeyboardKey");
function Rendering() {
    return (<Demo_1.Demo metaData={{
            title: 'Space Shooter Demo',
            description: 'A demo showcasing a full space shooter game.',
        }} header="Space Shooter" blurb="This demo showcases a complete space shooter game built using the Forge Game Engine. It features player-controlled movement, shooting mechanics, enemy spawning, and collision detection. The game demonstrates how to leverage the engine's capabilities to create an engaging and interactive experience. Players can navigate their spaceship, avoid obstacles, and shoot down enemies while enjoying smooth rendering and responsive controls." createGame={_create_game_1.createSpaceShooterGame} codeFiles={[
            {
                name: 'game.ts',
                content: _create_game_2.default,
            },
            {
                name: 'player.component.ts',
                content: _player_component_1.default,
            },
            {
                name: 'movement.system.ts',
                content: _movement_system_1.default,
            },
            {
                name: 'create-background.ts',
                content: _create_background_1.default,
            },
            {
                name: 'create-music.ts',
                content: _create_music_1.default,
            },
            {
                name: 'background.system.ts',
                content: _background_system_1.default,
            },
            {
                name: 'background.component.ts',
                content: _background_component_1.default,
            },
            {
                name: 'background.shader.ts',
                content: _background_shader_1.default,
            },
        ]} interactions={<>
          <_InteractionInstruction_1.InteractionInstruction displayElement={<_KeyboardKey_1.KeyboardKey keyCode="A"/>} text="Left"/>
          <_InteractionInstruction_1.InteractionInstruction displayElement={<_KeyboardKey_1.KeyboardKey keyCode="D"/>} text="Right"/>

          <_InteractionInstruction_1.InteractionInstruction displayElement={<_KeyboardKey_1.KeyboardKey keyCode="␣"/>} text="Shoot"/>
        </>}/>);
}
