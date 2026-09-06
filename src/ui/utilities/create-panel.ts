import {
  addParentComponent,
  addPositionComponent,
} from '../../common/index.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { Vec2, Vector2 } from '../../math/index.js';
import {
  addSpriteComponent,
  NineSliceOptions,
  SpriteEcsComponent,
} from '../../rendering/index.js';
import { addRectTransformComponent } from '../components/rect-transform-component.js';
import { UiAnchor, UiAnchorConfig } from '../types/ui-anchor.js';

/**
 * Fields of {@link CreatePanelOptions} with no sensible default; callers
 * must always provide these.
 */
export interface CreatePanelRequiredOptions {
  /**
   * The sprite to draw the panel with, e.g. from `createImageSprite`. Cloned
   * rather than attached directly, so the same `sprite` can be passed to
   * multiple `createPanel` calls without one panel's layout-driven
   * `width`/`height`/`pivot` mutations affecting another's.
   */
  sprite: SpriteEcsComponent;
}

/**
 * Fields of {@link CreatePanelOptions} with a sensible default; callers may
 * omit these.
 */
export interface CreatePanelDefaultedOptions {
  /**
   * The anchor to place the panel with - see `UiAnchor` for common
   * presets (e.g. `UiAnchor.center({ x: 200, y: 60 })`), each of which
   * bakes in the literal size/margin its own axes actually take. Defaults
   * to `UiAnchor.center()`.
   */
  anchor: UiAnchorConfig;

  /** Offset of the panel's pivot from its anchor reference point, in reference pixels. */
  anchoredPosition?: Vector2;

  /**
   * Overrides `sprite.slices` for this panel, for reusing one base sprite
   * with different nine-slice configuration across panels.
   */
  slices?: NineSliceOptions;
}

export type CreatePanelOptions = CreatePanelRequiredOptions &
  Partial<CreatePanelDefaultedOptions>;

const defaultCreatePanelOptions = {
  anchor: UiAnchor.center(),
};

/**
 * Creates a UI panel: an entity with a `RectTransformEcsComponent` (parented
 * to `parent`) and a `SpriteEcsComponent`. `createUiLayoutEcsSystem` drives
 * the sprite's `width`/`height`/`pivot`/`sortDepth` from the resolved rect
 * every frame - the panel always exactly fills its rect.
 * @param world - The ECS world to create the panel entity in.
 * @param parent - The parent entity - a canvas (see `createUiCanvas`) or
 * another UI element.
 * @param options - Options for configuring the panel. `sprite` has no
 * sensible default and must always be provided.
 * @returns The created panel entity.
 */
export function createPanel(
  world: EcsWorld,
  parent: number,
  options: CreatePanelOptions,
): number {
  const { anchor, anchoredPosition, sprite, slices } = {
    ...defaultCreatePanelOptions,
    ...options,
  };

  const entity = world.createEntity();

  addPositionComponent(world, entity);
  addParentComponent(world, entity, { parent });
  addRectTransformComponent(world, entity, {
    ...anchor,
    ...(anchoredPosition && { anchoredPosition }),
  });
  addSpriteComponent(world, entity, {
    ...sprite,
    pivot: Vec2.clone(sprite.pivot),
    uvOffset: Vec2.clone(sprite.uvOffset),
    uvScale: Vec2.clone(sprite.uvScale),
    slices: slices ?? sprite.slices,
  });

  return entity;
}
