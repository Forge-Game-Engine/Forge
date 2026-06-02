import {
  cameraId,
  createCameraEcsSystem,
  createGame,
  createImageSprite,
  createRenderEcsSystem,
  createSpriteAnimationEcsSystem,
  positionId,
  Random,
  Rect,
  scaleId,
  spriteAnimationId,
  spriteId,
  Vector2,
} from '../../src';
import { createAnimations } from './create-animations';

enum RenderLayer {
  background = 1 << 0,
  default = 1 << 1,
  foreground = 1 << 2,
}

const { game, world, renderContext, time } = createGame('demo-container');

const resize = (): void => {
  renderContext.resize(window.innerWidth, window.innerHeight);
};

resize();
window.addEventListener('resize', resize);

// Create camera entity
const cameraEntity = world.createEntity();

world.addComponent(cameraEntity, positionId, {
  world: Vector2.zero,
  local: Vector2.zero,
});

world.addComponent(cameraEntity, cameraId, {
  zoom: 1,
  zoomSensitivity: 0.1,
  panSensitivity: 1,
  minZoom: 0.1,
  maxZoom: 10,
  isStatic: false,
  layerMask: RenderLayer.default | RenderLayer.foreground,
  scissorRect: new Rect(Vector2.zero, new Vector2(0.5, 1)),
});

const { imageCache } = renderContext;

const image = await imageCache.getOrLoad('Ivy_Animations_Spritesheet.png');

const sprite = createImageSprite(
  image,
  renderContext,
  RenderLayer.foreground,
  new Vector2(20, 32),
);

const { idleAnimationHandle, idleAnimation, animationRegistry } =
  createAnimations(image);

sprite.uvScale = idleAnimation.getFrame(0).dimensions.clone();

const random = new Random();

for (let i = 0; i < 25_000; i++) {
  const spriteEntity = world.createEntity();

  world.addComponent(spriteEntity, positionId, {
    world: new Vector2(
      random.randomInt(-1700, 1700),
      random.randomInt(-700, 700),
    ),
    local: new Vector2(0, 0),
  });

  world.addComponent(spriteEntity, scaleId, {
    world: new Vector2(3, 3),
    local: new Vector2(1, 1),
  });

  world.addComponent(spriteEntity, spriteId, sprite);

  world.addComponent(spriteEntity, spriteAnimationId, {
    animationFrameIndex: random.randomInt(0, 12),
    playbackSpeed: 1,
    frameDurationMilliseconds: 100,
    lastFrameChangeTimeInSeconds: 0,
    totalFrameCount: 13,
    animationClipHandle: idleAnimationHandle,
  });
}

world.addSystem(createCameraEcsSystem(time));
world.addSystem(createRenderEcsSystem(renderContext));
world.addSystem(createSpriteAnimationEcsSystem(time, animationRegistry));

game.run();
