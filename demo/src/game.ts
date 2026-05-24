import {
  AnimationClip,
  AnimationInputs,
  cameraId,
  createCameraEcsSystem,
  createGame,
  createImageSprite,
  createRenderEcsSystem,
  createSpriteAnimationEcsSystem,
  createSpriteSheet,
  FiniteStateMachine,
  positionId,
  Rect,
  scaleId,
  selectAnimationFrames,
  spriteAnimationId,
  spriteId,
  Vector2,
} from '../../src';

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

const image = await imageCache.getOrLoad('Boy2_Sprite.png');

const sprite = createImageSprite(
  image,
  renderContext,
  RenderLayer.foreground,
  undefined,
  undefined,
  new Vector2(16, 32),
);

const spriteEntity = world.createEntity();

world.addComponent(spriteEntity, positionId, {
  world: new Vector2(0, 0),
  local: new Vector2(0, 0),
});

world.addComponent(spriteEntity, scaleId, {
  world: new Vector2(20, 20),
  local: new Vector2(1, 1),
});

world.addComponent(spriteEntity, spriteId, {
  sprite,
  enabled: true,
});

const spriteSheet = createSpriteSheet(image, new Vector2(16, 32));

const idleAnimation = new AnimationClip(
  'idle',
  selectAnimationFrames(spriteSheet, 13),
);

const animationInputs = new AnimationInputs();

const stateMachine: FiniteStateMachine<AnimationInputs, AnimationClip> =
  new FiniteStateMachine([idleAnimation], idleAnimation);

world.addComponent(spriteEntity, spriteAnimationId, {
  animationFrameIndex: 0,
  playbackSpeed: 1,
  frameDurationMilliseconds: 100,
  animationInputs,
  stateMachine,
  lastFrameChangeTimeInSeconds: 0,
});

world.addSystem(createCameraEcsSystem(time));
world.addSystem(createRenderEcsSystem(renderContext));
world.addSystem(createSpriteAnimationEcsSystem(time));

game.run();
