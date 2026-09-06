import {
  addParentComponent,
  addPositionComponent,
} from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
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
  createSlider,
  createToggle,
  uiAlignments,
  UiAnchor,
} from '@forge-game-engine/forge/ui';
import { getAssetUrl } from '@site/src/utils/get-asset-url';

const kenneyAsset = (color: string, fileName: string): string =>
  `img/kenney_ui-pack/PNG/${color}/Default/${fileName}`;

// Matches _create-menu.ts's textColor - the shared panelSprite is a light
// background, so row labels need a dark color to stay readable against it
// (unlike the "Options" title above, which sits on the dark canvas backdrop).
const rowLabelColor = new Color(0.12, 0.12, 0.16, 1);

// Shared by the slider track and toggle box below - both are the same
// flat grey Kenney sprite, so the same hover/pressed tints apply to
// either. Without an explicit transition, createSlider/createToggle
// default every state to Color.white (see UiColorTransitionDefaultedOptions),
// i.e. no visible feedback at all.
const controlTransition = {
  normalColor: Color.white,
  hoverColor: new Color(0.85, 0.85, 0.9, 1),
  pressedColor: new Color(0.7, 0.7, 0.78, 1),
};

interface ControlSprites {
  track: SpriteEcsComponent;
  fill: SpriteEcsComponent;
  handle: SpriteEcsComponent;
  box: SpriteEcsComponent;
  checkmark: SpriteEcsComponent;
}

/** Loads the plain, unsliced sprites a slider/toggle's parts are drawn with. */
async function loadControlSprites(
  renderContext: RenderContext,
  uiCategory: number,
): Promise<ControlSprites> {
  const load = async (assetPath: string): Promise<SpriteEcsComponent> => {
    const image = await renderContext.imageCache.getOrLoad(
      getAssetUrl(assetPath),
    );

    return createImageSprite(image, renderContext, { layer: uiCategory });
  };

  return {
    track: await load(kenneyAsset('Grey', 'button_rectangle_flat.png')),
    fill: await load(kenneyAsset('Blue', 'button_rectangle_flat.png')),
    handle: await load(kenneyAsset('Grey', 'slide_hangle.png')),
    box: await load(kenneyAsset('Grey', 'check_square_grey.png')),
    checkmark: await load(kenneyAsset('Blue', 'icon_checkmark.png')),
  };
}

const width = 400;
const titleHeight = 32;
const titleGap = 12;
const panelHeight = 200;

/**
 * Builds an "Options" panel: a two-column `GridLayoutGroupEcsComponent` with
 * `columnWidthMode: 'content'`, sizing the label column to whichever of
 * "Music"/"Fullscreen" is actually widest (via `sizeToText` labels), so both
 * rows' controls line up on the same left edge with no hand-computed
 * offsets - the classic label/control form layout a fixed-`cellSize` grid
 * (like the "Inventory" panel above) can't express.
 * @param world - The ECS world to create the options entities in.
 * @param renderContext - The render context the control sprites are built against.
 * @param canvas - The canvas entity to parent the options panel to.
 * @param fontAtlas - The font atlas the title/row labels are drawn from.
 * @param panelSprite - The nine-sliced sprite the panel is drawn with.
 * @param uiCategory - The render category the canvas's camera culls to.
 */
export async function createOptionsForm(
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
    ...UiAnchor.bottomRight,
    anchoredPosition: { x: -60, y: 60 },
    sizeOrMargin: { x: width, y: titleHeight + titleGap + panelHeight },
  });

  createLabel(world, group, {
    text: 'Options',
    fontAtlas,
    size: 24,
    anchor: UiAnchor.stretchTopLeft,
    sizeOrMargin: { x: 0, y: titleHeight },
    horizontalAlign: textHorizontalAlignments.right,
    color: Color.white,
    category: uiCategory,
  });

  const panel = createPanel(world, group, {
    anchor: UiAnchor.bottomLeft,
    sizeOrMargin: { x: width, y: panelHeight },
    sprite: panelSprite,
  });

  addGridLayoutGroupComponent(world, panel, {
    padding: { left: 24, right: 24, top: 24, bottom: 24 },
    constraint: 'fixedColumnCount',
    constraintCount: 2,
    columnWidthMode: 'content',
    rowHeightMode: 'content',
    spacing: { x: 16, y: 20 },
    cellAlignment: uiAlignments.middleLeft,
  });

  const sprites = await loadControlSprites(renderContext, uiCategory);

  createLabel(world, panel, {
    text: 'Music',
    fontAtlas,
    size: 20,
    sizeToText: true,
    color: rowLabelColor,
    category: uiCategory,
  });
  createSlider(world, panel, {
    trackSprite: sprites.track,
    handleSprite: sprites.handle,
    fillSprite: sprites.fill,
    sizeOrMargin: { x: 180, y: 20 },
    value: 0.7,
    transition: controlTransition,
  });

  createLabel(world, panel, {
    text: 'Fullscreen',
    fontAtlas,
    size: 20,
    sizeToText: true,
    color: rowLabelColor,
    category: uiCategory,
  });
  createToggle(world, panel, {
    sprite: sprites.box,
    checkmarkSprite: sprites.checkmark,
    sizeOrMargin: { x: 28, y: 28 },
    isOn: true,
    transition: controlTransition,
  });
}
