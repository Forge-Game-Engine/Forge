import {
  addDrawOrderComponent,
  addPositionComponent,
  addSpriteComponent,
  Color,
  createPresentEcsSystem,
  createRenderEcsSystem,
  createTransformEcsSystem,
  DrawOrderEcsComponent,
  Vector2,
} from '../../../src/index.js';
import type { CreateScene, SceneHandle } from '../../fixtures/scenes/scene.js';
import {
  createGoldenCamera,
  createGoldenSceneContext,
  createGoldenSceneHandle,
} from '../golden-scene.js';

interface SquareOptions {
  position: Vector2;
  color: Color;
  size?: number;
  layer?: number;
  parent?: number;
  drawOrder?: Partial<DrawOrderEcsComponent>;
}

/**
 * Overlapping squares ordered every way the renderer orders them: by layer
 * against creation order, by draw order among siblings, a child drawn
 * behind its parent, and translucent squares, whose order changes the
 * blended color.
 * @param container - The element to render the scene's canvas into.
 * @returns The scene's handle.
 */
export const createScene: CreateScene = (
  container: HTMLElement,
): SceneHandle => {
  const context = createGoldenSceneContext(container);
  const { world, renderContext } = context;

  createGoldenCamera(context, { clearColor: new Color(0.92, 0.92, 0.88) });

  const addSquare = (options: SquareOptions): number => {
    const entity = world.createEntity();

    addPositionComponent(world, entity, { local: options.position });

    if (options.parent !== undefined) {
      world.setParent(entity, options.parent);
    }

    addSpriteComponent(world, entity, {
      texture: renderContext.whiteTexture,
      width: options.size ?? 48,
      height: options.size ?? 48,
      tintColor: options.color,
      layer: options.layer ?? 0,
    });

    if (options.drawOrder) {
      addDrawOrderComponent(world, entity, options.drawOrder);
    }

    return entity;
  };

  // Layers: created first but on a higher layer, so drawn on top.
  addSquare({
    position: { x: -110, y: 50 },
    color: new Color(0.9, 0.2, 0.2),
    layer: 1,
  });
  addSquare({ position: { x: -90, y: 70 }, color: new Color(0.2, 0.3, 0.9) });

  // Siblings under one parent, ordered by draw order, not creation order.
  const parent = addSquare({
    position: { x: 10, y: 60 },
    color: new Color(0.3, 0.3, 0.3),
    size: 24,
  });

  addSquare({
    position: { x: -20, y: -10 },
    color: new Color(0.95, 0.7, 0.1),
    parent,
    drawOrder: { order: 2 },
  });
  addSquare({
    position: { x: 0, y: 0 },
    color: new Color(0.1, 0.7, 0.4),
    parent,
    drawOrder: { order: 1 },
  });
  addSquare({
    position: { x: 20, y: 10 },
    color: new Color(0.6, 0.2, 0.8),
    parent,
    drawOrder: { order: 3 },
  });

  // A child that draws behind its parent.
  const ship = addSquare({
    position: { x: 110, y: 60 },
    color: new Color(0.85, 0.1, 0.1),
  });

  addSquare({
    position: { x: -20, y: -16 },
    color: new Color(1, 0.6, 0),
    parent: ship,
    drawOrder: { behindParent: true },
  });

  // Translucent squares: each order blends to a different color.
  addSquare({
    position: { x: -60, y: -60 },
    color: new Color(1, 0, 0, 0.6),
    size: 64,
    layer: 2,
  });
  addSquare({
    position: { x: -30, y: -80 },
    color: new Color(0, 0, 1, 0.6),
    size: 64,
    layer: 3,
  });
  addSquare({
    position: { x: 60, y: -60 },
    color: new Color(0, 0, 1, 0.6),
    size: 64,
    layer: 2,
  });
  addSquare({
    position: { x: 90, y: -80 },
    color: new Color(1, 0, 0, 0.6),
    size: 64,
    layer: 3,
  });

  world.addSystem(createTransformEcsSystem());
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createPresentEcsSystem(renderContext));

  return createGoldenSceneHandle(context);
};
