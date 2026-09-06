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

const width = 400;
const titleHeight = 32;
const titleGap = 8;
const panelHeight = 110;

/**
 * Builds a "Toolbar" panel: a `HorizontalLayoutGroupEcsComponent` spacing
 * and evenly resizing a row of plain colored icons, with no
 * `anchoredPosition`/anchor size of their own - reordering, adding, or
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
    ...UiAnchor.topRight({ x: width, y: titleHeight + titleGap + panelHeight }),
    anchoredPosition: { x: -60, y: -60 },
  });

  createLabel(world, group, {
    text: 'Toolbar',
    fontAtlas,
    size: 24,
    anchor: UiAnchor.stretchTopLeft({ height: titleHeight }),
    horizontalAlign: textHorizontalAlignments.right,
    color: Color.white,
    category: uiCategory,
  });

  const panel = createPanel(world, group, {
    anchor: UiAnchor.bottomLeft({ x: width, y: panelHeight }),
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
    addRectTransformComponent(world, icon, UiAnchor.center({ x: 70, y: 70 }));

    const sprite = createImageSprite(whiteImage, renderContext, {
      layer: uiCategory,
    });
    sprite.tintColor = tintColor;

    addSpriteComponent(world, icon, sprite);
  }
}
