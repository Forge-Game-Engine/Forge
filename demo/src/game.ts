import {
  addGaussianBlurComponent,
  addPositionComponent,
  addRotationComponent,
  addSpriteComponent,
  CircleShape,
  Color,
  createCamera,
  createCameraEcsSystem,
  createGame,
  createGaussianBlurEcsSystem,
  createImageSprite,
  createPhysicsSyncEcsSystem,
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
import { createParentPositionEcsSystem } from '../../src/common/systems/parent-position-system';
import {
  addGravityComponent,
  addRigidBodyComponent,
  createEulerIntegrationEcsSystem,
  createGravityEcsSystem,
} from '../../src/fphysics';

const renderLayer = 1;

const { game, world, renderContext, time } = createGame('demo-container');

// Create camera entity
createCamera(world);

const { imageCache } = renderContext;

const ballImage = await imageCache.getOrLoad('ball_blue_large.png');

const ballSprite = createImageSprite(ballImage, renderContext, renderLayer, {
  frameDimensions: new Vector2(0.5, 0.5),
});

const ballEntity = world.createEntity();

addSpriteComponent(world, ballEntity, ballSprite);
addPositionComponent(world, ballEntity);
addRotationComponent(world, ballEntity);
addGravityComponent(world, ballEntity);
addRigidBodyComponent(world, ballEntity);

world.addSystem(createGravityEcsSystem(time));
world.addSystem(createEulerIntegrationEcsSystem(time));
world.addSystem(createParentPositionEcsSystem());
world.addSystem(createRenderEcsSystem(renderContext));

game.run();
