import { addPositionComponent } from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  addMaskComponent,
  addSpriteComponent,
  Color,
  createImageSprite,
  createTexture,
  RenderContext,
} from '@forge-game-engine/forge/rendering';
import { Vector2 } from '@forge-game-engine/forge/math';
import { getAssetUrl } from '@site/src/utils/get-asset-url';
import { maskPulseId } from './_mask-pulse.component';
import { scrollId } from './_scroll.component';

const rowCount = 12;
const rowHeight = 36;
const rowGap = 8;

/**
 * A viewport with a rect mask, holding a list taller than itself: the rows
 * scroll through it and are clipped to its rect.
 */
function createScrollingList(
  world: EcsWorld,
  renderContext: RenderContext,
  position: Vector2,
): void {
  const viewportSize = { x: 200, y: 260 };

  const frame = world.createEntity();

  addPositionComponent(world, frame, { local: position });
  addSpriteComponent(world, frame, {
    texture: renderContext.whiteTexture,
    width: viewportSize.x + 12,
    height: viewportSize.y + 12,
    tintColor: new Color(0.2, 0.22, 0.3),
    layer: 0,
  });

  const viewport = world.createEntity();

  addPositionComponent(world, viewport, { local: position });
  addMaskComponent(world, viewport, {
    width: viewportSize.x,
    height: viewportSize.y,
  });

  const list = world.createEntity();
  const listHeight = rowCount * (rowHeight + rowGap);

  addPositionComponent(world, list);
  world.setParent(list, viewport);
  world.addComponent(list, scrollId, { speed: 40, wrapHeight: listHeight });

  for (let i = 0; i < rowCount; i++) {
    const row = world.createEntity();
    const hue = i / rowCount;

    addPositionComponent(world, row, {
      local: { x: 0, y: listHeight / 2 - i * (rowHeight + rowGap) },
    });
    world.setParent(row, list);
    addSpriteComponent(world, row, {
      texture: renderContext.whiteTexture,
      width: viewportSize.x - 20,
      height: rowHeight,
      tintColor: new Color(0.4 + 0.5 * hue, 0.75 - 0.4 * hue, 0.9),
      layer: 1,
    });
  }
}

/**
 * A nine-slice bar at full size, revealed from the left by a linear mask:
 * its rounded end caps keep their shape at every amount.
 */
async function createLinearFill(
  world: EcsWorld,
  renderContext: RenderContext,
  position: Vector2,
): Promise<void> {
  const barImage = await renderContext.imageCache.getOrLoad(
    getAssetUrl(
      'img/kenney_ui-pack/PNG/Green/Default/button_rectangle_flat.png',
    ),
  );
  const barTexture = createTexture(renderContext, barImage);
  const slices = { left: 16, right: 16, top: 16, bottom: 16 };
  const barSize = { x: 200, y: 48 };

  const track = world.createEntity();

  addPositionComponent(world, track, { local: position });
  addSpriteComponent(world, track, {
    ...createImageSprite(barTexture, { slices }),
    width: barSize.x,
    height: barSize.y,
    tintColor: new Color(0.25, 0.25, 0.3),
  });

  const fill = world.createEntity();

  addPositionComponent(world, fill, { local: position });
  addSpriteComponent(world, fill, {
    ...createImageSprite(barTexture, { slices }),
    width: barSize.x,
    height: barSize.y,
    layer: 1,
  });
  addMaskComponent(world, fill, {
    width: barSize.x,
    height: barSize.y,
    shape: { kind: 'linear', origin: 'left', amount: 0 },
  });
  world.addComponent(fill, maskPulseId, { speed: 0.2 });
}

/**
 * Draws a white ring on a transparent canvas.
 * @returns The canvas to upload as a texture.
 */
function drawRing(): HTMLCanvasElement {
  const size = 256;
  const source = document.createElement('canvas');

  source.width = size;
  source.height = size;

  const context = source.getContext('2d');

  if (!context) {
    throw new Error('2D canvas context not available');
  }

  context.strokeStyle = '#ffffff';
  context.lineWidth = size * 0.12;
  context.beginPath();
  context.arc(size / 2, size / 2, size * 0.42, 0, Math.PI * 2);
  context.stroke();

  return source;
}

/**
 * An arc gauge: a dim ring and a lit ring, each with a radial mask over
 * the same three quarters of a turn. The lit ring's mask fills the arc.
 */
function createRadialGauge(
  world: EcsWorld,
  renderContext: RenderContext,
  position: Vector2,
): void {
  const ringTexture = createTexture(renderContext, drawRing());
  const diameter = 180;
  // The gauge's arc starts at the bottom-left and runs clockwise to the
  // bottom-right.
  const startAngle = (5 * Math.PI) / 4;
  const sweep = (-3 * Math.PI) / 2;

  for (const lit of [false, true]) {
    const ring = world.createEntity();

    addPositionComponent(world, ring, { local: position });
    addSpriteComponent(world, ring, {
      texture: ringTexture,
      width: diameter,
      height: diameter,
      tintColor: lit ? new Color(1, 0.6, 0.15) : new Color(1, 1, 1, 0.12),
      layer: lit ? 1 : 0,
    });
    addMaskComponent(world, ring, {
      width: diameter,
      height: diameter,
      shape: { kind: 'radial', startAngle, sweep, amount: lit ? 0 : 1 },
    });

    if (lit) {
      world.addComponent(ring, maskPulseId, { speed: 0.15 });
    }
  }
}

/**
 * Builds the three masked scenes: the list on the left, the bar and the
 * gauge on the right.
 * @param world - The world to create them in.
 * @param renderContext - The render context to create textures with.
 */
export async function createMaskedContent(
  world: EcsWorld,
  renderContext: RenderContext,
): Promise<void> {
  createScrollingList(world, renderContext, { x: -140, y: 0 });
  await createLinearFill(world, renderContext, { x: 115, y: 130 });
  createRadialGauge(world, renderContext, { x: 115, y: -80 });
}
