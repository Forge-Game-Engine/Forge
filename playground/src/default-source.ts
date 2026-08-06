/**
 * The game the editor opens with: a square that bounces around the screen.
 * It only uses Forge's own APIs plus a tiny inlined white square image, so
 * it needs no external assets and runs immediately.
 */
export const defaultSource = `import { createGame } from '@forge-game-engine/forge/utilities';
import {
  addPositionComponent,
  addRotationComponent,
  positionId,
  PositionEcsComponent,
} from '@forge-game-engine/forge/common';
import {
  addSpriteComponent,
  calculateVisibleWorldSize,
  Color,
  createCamera,
  createImageSprite,
  createRenderEcsSystem,
} from '@forge-game-engine/forge/rendering';
import { EcsSystem } from '@forge-game-engine/forge/ecs';

const verticalWorldUnits = 10;
const renderLayer = 1;
const squareSize = 1;
const speed = 4;

// An 8x8 white square, stretched and tinted into a colored square below -
// no external image assets needed.
const whiteSquare =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAD0lEQVR4nGP4TwAwjAwFAIS1/wF0QtmAAAAAAElFTkSuQmCC';

const { game, world, renderContext, time } = createGame('game');

createCamera(world, { verticalWorldUnits });

const { x: worldWidth, y: worldHeight } = calculateVisibleWorldSize(
  renderContext.width,
  renderContext.height,
  verticalWorldUnits,
);
const halfWidth = worldWidth / 2 - squareSize / 2;
const halfHeight = worldHeight / 2 - squareSize / 2;

const image = await renderContext.imageCache.getOrLoad(whiteSquare);

const sprite = createImageSprite(image, renderContext, renderLayer, {
  frameDimensions: { x: squareSize, y: squareSize },
});
sprite.tintColor = new Color(0.36, 0.78, 0.95);

const square = world.createEntity();

addPositionComponent(world, square, { world: { x: 0, y: 0 } });
addRotationComponent(world, square, { world: 0 });
addSpriteComponent(world, square, sprite);

const velocity = { x: speed, y: speed * 0.75 };

function createBounceEcsSystem(): EcsSystem<[PositionEcsComponent]> {
  return {
    query: [positionId],
    update: (_, { components: [positions] }) => {
      for (const position of positions) {
        position.world.x += velocity.x * time.deltaTimeInSeconds;
        position.world.y += velocity.y * time.deltaTimeInSeconds;

        if (Math.abs(position.world.x) > halfWidth) {
          velocity.x *= -1;
          position.world.x = Math.sign(position.world.x) * halfWidth;
        }

        if (Math.abs(position.world.y) > halfHeight) {
          velocity.y *= -1;
          position.world.y = Math.sign(position.world.y) * halfHeight;
        }
      }
    },
  };
}

world.addSystem(createBounceEcsSystem());
world.addSystem(createRenderEcsSystem(renderContext));

game.run();
`;
