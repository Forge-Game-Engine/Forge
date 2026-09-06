import {
  addParentComponent,
  addPositionComponent,
} from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  addSpriteComponent,
  Color,
  createImageSprite,
  RenderContext,
  SpriteEcsComponent,
} from '@forge-game-engine/forge/rendering';
import {
  FontAtlas,
  textHorizontalAlignments,
} from '@forge-game-engine/forge/text';
import {
  addGridLayoutGroupComponent,
  addRectTransformComponent,
  createLabel,
  createPanel,
  uiAlignments,
  UiAnchor,
} from '@forge-game-engine/forge/ui';
import { getAssetUrl } from '@site/src/utils/get-asset-url';

const cellCount = 8;

const width = 400;
const titleHeight = 32;
const titleGap = 12;
const panelHeight = 200;

/**
 * Builds an "Inventory" panel: a `GridLayoutGroupEcsComponent` placing 8
 * fixed-size cells into a 4-column grid - unlike the axis groups in
 * `_create-menu.ts`/`_create-toolbar.ts`, a grid's cell size never comes
 * from a child's own measured size, only from `cellSize` itself.
 * @param world - The ECS world to create the inventory entities in.
 * @param renderContext - The render context the cell sprites are built against.
 * @param canvas - The canvas entity to parent the inventory panel to.
 * @param fontAtlas - The font atlas the title label is drawn from.
 * @param panelSprite - The nine-sliced sprite the panel is drawn with.
 * @param uiCategory - The render category the canvas's camera culls to.
 */
export async function createInventoryGrid(
  world: EcsWorld,
  renderContext: RenderContext,
  canvas: number,
  fontAtlas: FontAtlas,
  panelSprite: SpriteEcsComponent,
  uiCategory: number,
): Promise<void> {
  // A plain sprite-less group holds the title and the textured panel as its
  // own children, rather than anchoring each of them independently to the
  // canvas - so they can never drift apart from each other, only from this
  // one shared anchor. The title anchors to the group's own top-left
  // corner; the panel anchors to the group's bottom-left. Both express
  // their position purely in terms of the group's rect, never the canvas's.
  const group = world.createEntity();

  addPositionComponent(world, group);
  addParentComponent(world, group, { parent: canvas });
  addRectTransformComponent(world, group, {
    ...UiAnchor.bottomLeft,
    anchoredPosition: { x: 60, y: 60 },
    sizeOrMargin: { x: width, y: titleHeight + titleGap + panelHeight },
  });

  createLabel(world, group, {
    text: 'Inventory',
    fontAtlas,
    size: 24,
    anchor: UiAnchor.stretchTopLeft,
    sizeOrMargin: { x: 0, y: titleHeight },
    horizontalAlign: textHorizontalAlignments.left,
    color: Color.white,
    category: uiCategory,
  });

  const panel = createPanel(world, group, {
    anchor: UiAnchor.bottomLeft,
    sizeOrMargin: { x: width, y: panelHeight },
    sprite: panelSprite,
  });

  addGridLayoutGroupComponent(world, panel, {
    padding: { left: 20, right: 20, top: 20, bottom: 20 },
    cellSize: { x: 70, y: 70 },
    spacing: { x: 12, y: 12 },
    constraint: 'fixedColumnCount',
    constraintCount: 4,
    childAlignment: uiAlignments.center,
  });

  const whiteImage = await renderContext.imageCache.getOrLoad(
    getAssetUrl('img/White.png'),
  );

  for (let i = 0; i < cellCount; i++) {
    const cell = world.createEntity();

    addPositionComponent(world, cell);
    addParentComponent(world, cell, { parent: panel });
    addRectTransformComponent(world, cell);

    const sprite = createImageSprite(whiteImage, renderContext, {
      layer: uiCategory,
    });
    sprite.tintColor = new Color(0.55, 0.55, 0.6, 1);

    addSpriteComponent(world, cell, sprite);
  }
}
