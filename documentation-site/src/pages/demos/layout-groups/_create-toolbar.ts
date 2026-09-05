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
  addHorizontalLayoutGroupComponent,
  addRectTransformComponent,
  createLabel,
  createPanel,
  UiAnchor,
} from '@forge-game-engine/forge/ui';
import { getAssetUrl } from '@site/src/utils/get-asset-url';

const iconColors = [
  new Color(0.85, 0.35, 0.35, 1),
  new Color(0.35, 0.65, 0.85, 1),
  new Color(0.45, 0.75, 0.45, 1),
  new Color(0.85, 0.65, 0.3, 1),
];

/**
 * Builds a "Toolbar" panel: a `HorizontalLayoutGroupEcsComponent` spacing
 * and evenly resizing a row of plain colored icons, with no
 * `anchoredPosition`/`sizeOrMargin` of their own - reordering, adding, or
 * removing an icon needs no other change, since the group recomputes the
 * row every frame.
 * @param world - The ECS world to create the toolbar entities in.
 * @param renderContext - The render context the icon sprites are built against.
 * @param canvas - The canvas entity to parent the toolbar panel to.
 * @param fontAtlas - The font atlas the title label is drawn from.
 * @param panelSprite - The nine-sliced sprite the panel is drawn with.
 * @param uiCategory - The render category the canvas's camera culls to.
 */
export async function createToolbar(
  world: EcsWorld,
  renderContext: RenderContext,
  canvas: number,
  fontAtlas: FontAtlas,
  panelSprite: SpriteEcsComponent,
  uiCategory: number,
): Promise<void> {
  createLabel(world, canvas, {
    text: 'Toolbar',
    fontAtlas,
    size: 24,
    anchor: UiAnchor.topRight,
    anchoredPosition: { x: -60, y: -50 },
    sizeOrMargin: { x: 400, y: 32 },
    horizontalAlign: textHorizontalAlignments.right,
    verticalAlign: textVerticalAlignments.middle,
    color: Color.white,
    category: uiCategory,
  });

  const panel = createPanel(world, canvas, {
    anchor: UiAnchor.topRight,
    anchoredPosition: { x: -60, y: -90 },
    sizeOrMargin: { x: 400, y: 110 },
    sprite: panelSprite,
  });

  addHorizontalLayoutGroupComponent(world, panel, {
    padding: { left: 20, right: 20, top: 20, bottom: 20 },
    spacing: 16,
  });

  const whiteImage = await renderContext.imageCache.getOrLoad(
    getAssetUrl('img/White.png'),
  );

  for (const tintColor of iconColors) {
    const icon = world.createEntity();

    addPositionComponent(world, icon);
    addParentComponent(world, icon, { parent: panel });
    addRectTransformComponent(world, icon, { sizeOrMargin: { x: 70, y: 70 } });

    const sprite = createImageSprite(whiteImage, renderContext, {
      layer: uiCategory,
    });
    sprite.tintColor = tintColor;

    addSpriteComponent(world, icon, sprite);
  }
}
