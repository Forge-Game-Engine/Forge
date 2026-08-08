import { EcsWorld } from '@forge-game-engine/forge/ecs';
import { addPositionComponent } from '@forge-game-engine/forge/common';
import { Color, Renderable } from '@forge-game-engine/forge/rendering';
import { FontAtlas } from '@forge-game-engine/forge/asset-loading';
import {
  addTextComponent,
  TextAlignment,
} from '@forge-game-engine/forge/text';
import { elapsedCounterTag } from './_elapsed-counter.component';

const paragraph =
  'Word-wrapped MSDF text with kerning and configurable alignment.';

interface LabelOptions {
  text: string;
  fontSize: number;
  color?: Color;
  alignment?: TextAlignment;
  wrapWidth?: number;
}

function createLabel(
  world: EcsWorld,
  font: FontAtlas,
  renderable: Renderable,
  y: number,
  options: LabelOptions,
): void {
  const entity = world.createEntity();

  addPositionComponent(world, entity, { world: { x: 0, y } });
  addTextComponent(world, entity, {
    font,
    renderable,
    ...options,
  });
}

/**
 * Builds the demo's showcase text entities: a title/byline, three
 * word-wrapped paragraphs (one per `TextAlignment`) stacked so their
 * layout can be compared directly, and a live elapsed-time counter tagged
 * for `createElapsedCounterEcsSystem` to update every frame.
 * @param world - The ECS world to add the text entities to.
 * @param font - The loaded font atlas every label shares.
 * @param renderable - The MSDF renderable every label shares, built once
 * for this font via `createMsdfTextRenderable`.
 */
export function createLabels(
  world: EcsWorld,
  font: FontAtlas,
  renderable: Renderable,
): void {
  createLabel(world, font, renderable, 250, {
    text: 'Forge Text',
    fontSize: 44,
  });

  createLabel(world, font, renderable, 205, {
    text: 'MSDF font atlas rendering, batched with sprites.',
    fontSize: 16,
    color: new Color(0.7, 0.72, 0.78, 1),
  });

  const alignments: { alignment: TextAlignment; y: number }[] = [
    { alignment: 'left', y: 130 },
    { alignment: 'center', y: 10 },
    { alignment: 'right', y: -110 },
  ];

  for (const { alignment, y } of alignments) {
    createLabel(world, font, renderable, y, {
      text: `${alignment}: ${paragraph}`,
      fontSize: 16,
      wrapWidth: 260,
      alignment,
    });
  }

  const counterEntity = world.createEntity();

  addPositionComponent(world, counterEntity, { world: { x: 0, y: -240 } });
  addTextComponent(world, counterEntity, {
    text: 'Elapsed: 0.0s',
    font,
    renderable,
    fontSize: 26,
    color: new Color(0.4, 0.85, 1, 1),
  });
  world.addTag(counterEntity, elapsedCounterTag);
}
