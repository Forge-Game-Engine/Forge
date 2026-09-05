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
  textVerticalAlignments,
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
  createLabel(world, canvas, {
    text: 'Inventory',
    fontAtlas,
    size: 24,
    // A plain UiAnchor.bottomLeft pivot (0, 0) sits at the box's own bottom
    // edge, but verticalAlign: 'middle' centers the text around the
    // entity's own local origin regardless of the box's declared height -
    // pairing them left half the text rendering below the box and half
    // within it. A custom pivot.y of 0.5 (keeping the same bottom-left
    // anchor reference) makes the origin the box's actual vertical center,
    // so 'middle' centers the text within the declared 32-tall box for real.
    anchor: { ...UiAnchor.bottomLeft, pivot: { x: 0, y: 0.5 } },
    anchoredPosition: { x: 60, y: 288 },
    sizeOrMargin: { x: 400, y: 32 },
    horizontalAlign: textHorizontalAlignments.left,
    verticalAlign: textVerticalAlignments.middle,
    color: Color.white,
    category: uiCategory,
  });

  const panel = createPanel(world, canvas, {
    anchor: UiAnchor.bottomLeft,
    anchoredPosition: { x: 60, y: 60 },
    sizeOrMargin: { x: 400, y: 200 },
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
