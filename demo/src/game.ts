import {
  cameraId,
  CircleShape,
  createCameraEcsSystem,
  createGame,
  createGaussianBlurEcsSystem,
  createImageSprite,
  createPhysicsEcsSystem,
  createPresentEcsSystem,
  createRenderEcsSystem,
  createRenderTarget,
  PhysicsBodyId,
  PhysicsWorld,
  PolygonShape,
  positionId,
  Random,
  RigidBody,
  rotationId,
  scaleId,
  screenToWorldSpace,
  Shape,
  SpriteEcsComponent,
  spriteId,
  Vector2,
} from '../../src';

const renderLayer = 1;
const wallThickness = 40;
const shapeCount = 680;
const gravity = new Vector2(0, -100);
const explosionForce = 8_000_000;
const explosionRadius = 200;

const { game, world, renderContext, time } = createGame('demo-container');

// The scene renders into this off-screen target instead of directly onto
// the canvas, so the blur post-process pass has a texture to read from
// before the present pass draws the (blurred) result onto the canvas.
const sceneRenderTarget = createRenderTarget(
  renderContext.gl,
  window.innerWidth,
  window.innerHeight,
);

const resize = (): void => {
  renderContext.resize(window.innerWidth, window.innerHeight);
  sceneRenderTarget.resize(
    renderContext.gl,
    window.innerWidth,
    window.innerHeight,
  );
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
  isStatic: true,
  cullingMask: renderLayer,
  renderTarget: sceneRenderTarget,
});

const { imageCache } = renderContext;

const ballImage = await imageCache.getOrLoad('ball_blue_large.png');
const squareImage = await imageCache.getOrLoad('block_square.png');
const triangleImage = await imageCache.getOrLoad('block_corner_large.png');
const barImage = await imageCache.getOrLoad('gradient.png');

const ballSprite = createImageSprite(ballImage, renderContext, renderLayer);
const squareSprite = createImageSprite(squareImage, renderContext, renderLayer);
const triangleSprite = createImageSprite(
  triangleImage,
  renderContext,
  renderLayer,
);
const barSprite = createImageSprite(barImage, renderContext, renderLayer);

// `block_corner_large.png` is a right triangle with its right angle at the
// bottom-left of the image. PolygonShape re-centers vertices around their
// centroid (a third of the way across, two thirds of the way down), so the
// sprite's pivot is moved to match - keeping the rendered triangle aligned
// with its physics shape as it rotates.
triangleSprite.pivot = new Vector2(1 / 3, 2 / 3);

const physicsWorld = new PhysicsWorld({ gravity });
const random = new Random();

const halfWidth = renderContext.canvas.width / 2;
const halfHeight = renderContext.canvas.height / 2;

function createBoundary(
  position: Vector2,
  width: number,
  height: number,
): void {
  const entity = world.createEntity();

  world.addComponent(entity, positionId, {
    world: position.clone(),
    local: position.clone(),
  });

  world.addComponent(entity, rotationId, { local: 0, world: 0 });

  world.addComponent(entity, scaleId, {
    local: new Vector2(width / barSprite.width, height / barSprite.height),
    world: new Vector2(width / barSprite.width, height / barSprite.height),
  });

  // world.addComponent(entity, spriteId, barSprite);

  world.addComponent(entity, PhysicsBodyId, {
    physicsBody: new RigidBody({
      shape: PolygonShape.rectangle(width, height),
      position: position.clone(),
      isStatic: true,
    }),
  });
}

// Floor and side walls bound the simulation area
createBoundary(
  new Vector2(0, -halfHeight + wallThickness / 2),
  renderContext.canvas.width,
  wallThickness,
);
createBoundary(
  new Vector2(-halfWidth + wallThickness / 2, 0),
  wallThickness,
  renderContext.canvas.height,
);
createBoundary(
  new Vector2(halfWidth - wallThickness / 2, 0),
  wallThickness,
  renderContext.canvas.height,
);

// A right triangle matching the visual shape of `block_corner_large.png`:
// right angle at the bottom-left, hypotenuse from top-left to bottom-right.
function createTriangleShape(width: number, height: number): PolygonShape {
  const halfShapeWidth = width / 2;
  const halfShapeHeight = height / 2;

  return new PolygonShape([
    new Vector2(-halfShapeWidth, halfShapeHeight),
    new Vector2(-halfShapeWidth, -halfShapeHeight),
    new Vector2(halfShapeWidth, -halfShapeHeight),
  ]);
}

// One spawner per shape: pairs the sprite to render with the physics shape
// to simulate, both sized to fit a `size x size` bounding box.
const shapeSpawners: ((size: number) => {
  sprite: SpriteEcsComponent;
  shape: Shape;
})[] = [
  (size) => ({ sprite: ballSprite, shape: new CircleShape(size / 2) }),
  (size) => ({
    sprite: squareSprite,
    shape: PolygonShape.rectangle(size, size),
  }),
  (size) => ({
    sprite: triangleSprite,
    shape: createTriangleShape(size, size),
  }),
];

function spawnShape(
  sprite: SpriteEcsComponent,
  shape: Shape,
  position: Vector2,
  size: number,
): void {
  const entity = world.createEntity();
  const scale = size / sprite.width;

  world.addComponent(entity, positionId, {
    world: position.clone(),
    local: position.clone(),
  });

  world.addComponent(entity, rotationId, { local: 0, world: 0 });

  world.addComponent(entity, scaleId, {
    local: new Vector2(scale, scale),
    world: new Vector2(scale, scale),
  });

  world.addComponent(entity, spriteId, sprite);

  world.addComponent(entity, PhysicsBodyId, {
    physicsBody: new RigidBody({
      shape,
      position: position.clone(),
      restitution: 0.6,
      friction: 0.4,
    }),
  });
}

// Spawn a pile of bouncing, rolling balls, boxes, and triangles
for (let i = 0; i < shapeCount; i++) {
  const size = random.randomFloat(40, 90);
  const halfSize = size / 2;

  const position = new Vector2(
    random.randomFloat(
      -halfWidth + wallThickness + halfSize,
      halfWidth - wallThickness - halfSize,
    ),
    random.randomFloat(0, halfHeight * 10 - halfSize),
  );

  const spawner = shapeSpawners[random.randomInt(0, shapeSpawners.length - 1)];
  const { sprite, shape } = spawner(size);

  spawnShape(sprite, shape, position, size);
}

world.addSystem(createCameraEcsSystem(time));
world.addSystem(createRenderEcsSystem(renderContext));
// Blurs the off-screen scene render target in place (two-pass separable
// Gaussian blur), then the present pass draws the blurred result onto the
// canvas. Must run after the render system and before the present system.
world.addSystem(
  createGaussianBlurEcsSystem(renderContext, { passes: 8, intensity: 0.4 }),
);
world.addSystem(createPresentEcsSystem(renderContext));
world.addSystem(createPhysicsEcsSystem(physicsWorld, time));

// The camera is static at the world origin with a zoom of 1 (see
// `cameraEntity` above), so screen coordinates can be converted to world
// coordinates directly.
renderContext.canvas.addEventListener('mousedown', (event: MouseEvent) => {
  const canvasBounds = renderContext.canvas.getBoundingClientRect();

  const screenPosition = new Vector2(
    event.clientX - canvasBounds.left,
    event.clientY - canvasBounds.top,
  );

  const worldPosition = screenToWorldSpace(
    screenPosition,
    Vector2.zero,
    1,
    renderContext.canvas.width,
    renderContext.canvas.height,
  );

  physicsWorld.applyExplosiveForce(
    worldPosition,
    explosionForce,
    explosionRadius,
  );
});

game.run();
