import {
  addPositionComponent,
  createTransformEcsSystem,
} from '@forge-game-engine/forge/common';
import {
  Axis2dAction,
  KeyboardAxis2dBinding,
  KeyboardInputSource,
  keyCodes,
  registerInputs,
} from '@forge-game-engine/forge/input';
import {
  addSpriteComponent,
  createCamera,
  createImageSprite,
  createRenderEcsSystem,
} from '@forge-game-engine/forge/rendering';
import { createGame } from '@forge-game-engine/forge/utilities';
import { playerId } from './components/player-component.js';
import { createPlayerMovementEcsSystem } from './systems/player-movement-system.js';

// Create the game inside the `#game-container` element in index.html. The
// world holds every entity and system, the render context draws to the
// canvas, and time tracks how long each frame took.
const { game, world, renderContext, time } = createGame('game-container');

// A camera decides which part of the world shows up on the canvas. It's
// centered on (0, 0) and shows 10 world units from top to bottom.
createCamera(world);

// Input is read through named actions instead of raw keys. `move` is a 2D
// direction, and both WASD and the arrow keys drive it.
const move = new Axis2dAction('move');
const inputManager = registerInputs(world, time, { axis2dActions: [move] });
const keyboard = new KeyboardInputSource(inputManager);

keyboard.axis2dBindings.add(
  new KeyboardAxis2dBinding(
    move,
    keyCodes.w,
    keyCodes.s,
    keyCodes.d,
    keyCodes.a,
  ),
);
keyboard.axis2dBindings.add(
  new KeyboardAxis2dBinding(
    move,
    keyCodes.arrowUp,
    keyCodes.arrowDown,
    keyCodes.arrowRight,
    keyCodes.arrowLeft,
  ),
);

// Load the image from the `public` folder onto the GPU, and make a sprite
// that draws it.
const texture = await renderContext.textureCache.getOrLoad('sprite.png');
const sprite = createImageSprite(texture);

// An entity is just an id. What it is and does comes from the components
// attached to it: a position, a sprite to draw there, and the player
// component the movement system looks for.
const player = world.createEntity();

addPositionComponent(world, player);
addSpriteComponent(world, player, sprite);
world.addComponent(player, playerId, { speed: 5 });

// Systems run every frame, in the order they're added: move the player,
// work out every entity's place in the world, then draw.
world.addSystem(createPlayerMovementEcsSystem(move, time));
world.addSystem(createTransformEcsSystem(time));
world.addSystem(createRenderEcsSystem(renderContext));

// Start the game loop.
game.run();
