import { addPositionComponent } from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import { Color } from '@forge-game-engine/forge/rendering';
import {
  addTextComponent,
  FontAtlas,
  textHorizontalAlignments,
  textVerticalAlignments,
} from '@forge-game-engine/forge/text';

const labelWidth = 800;

/**
 * Creates a line of text centered on `y`.
 * @returns The label's entity, for the caller to scope to a state.
 */
export function createLabel(
  world: EcsWorld,
  fontAtlas: FontAtlas,
  text: string,
  y: number,
  size: number,
  color: Color = Color.white,
): number {
  const entity = world.createEntity();

  addPositionComponent(world, entity, { local: { x: 0, y } });
  addTextComponent(world, entity, {
    text,
    fontAtlas,
    size,
    color,
    maxWidth: labelWidth,
    horizontalAlign: textHorizontalAlignments.center,
    horizontalAlignPivot: 0.5,
    verticalAlign: textVerticalAlignments.middle,
    layer: 1,
  });

  return entity;
}
