import { addPositionComponent } from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import { Color } from '@forge-game-engine/forge/rendering';
import { addTextComponent, FontAtlas } from '@forge-game-engine/forge/text';
import { counterId } from './_counter.component';

/**
 * Creates the three labels this demo shows: a static heading, a static
 * subheading, and a counter label that `createCounterEcsSystem` updates once
 * per second.
 * @param world - The ECS world to add the label entities to.
 * @param fontAtlas - The loaded font atlas every label draws from.
 * @param layer - The render layer the labels should be drawn on.
 */
export function createLabels(
  world: EcsWorld,
  fontAtlas: FontAtlas,
  layer: number,
): void {
  // horizontalAlign defaults to 'left' with no maxWidth set, so a label's
  // own position is where its first glyph starts; starting every label at
  // the same left-hand `x` reads as a left-aligned block.
  const leftX = -260;

  const heading = world.createEntity();
  addPositionComponent(world, heading, { world: { x: leftX, y: 120 } });
  addTextComponent(world, heading, {
    text: 'Forge Text Rendering',
    fontAtlas,
    size: 42,
    layer,
  });

  const subheading = world.createEntity();
  addPositionComponent(world, subheading, { world: { x: leftX, y: 60 } });
  addTextComponent(world, subheading, {
    text: 'MSDF glyphs, batched through the same pipeline as sprites',
    fontAtlas,
    size: 20,
    color: new Color(0.75, 0.78, 0.85, 1),
    layer,
  });

  const counter = world.createEntity();
  addPositionComponent(world, counter, { world: { x: leftX, y: -40 } });
  addTextComponent(world, counter, {
    text: 'Count: 0',
    fontAtlas,
    size: 32,
    color: new Color(0.4, 0.9, 0.6, 1),
    layer,
  });

  world.addComponent(counter, counterId, {
    count: 0,
    secondsSinceLastTick: 0,
  });

  const paragraph = world.createEntity();
  addPositionComponent(world, paragraph, { world: { x: leftX, y: -100 } });
  addTextComponent(world, paragraph, {
    text: 'Phase 3 adds multi-line layout: greedy word wrapping against maxWidth, plus horizontal and vertical alignment.',
    fontAtlas,
    size: 16,
    color: new Color(0.75, 0.78, 0.85, 1),
    maxWidth: 480,
    lineHeight: 1.3,
    horizontalAlign: 'justify',
    layer,
  });
}
