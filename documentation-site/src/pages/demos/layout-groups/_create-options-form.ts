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
  textVerticalAlignments,
} from '@forge-game-engine/forge/text';
import {
  addGridLayoutGroupComponent,
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
  createLabel(world, canvas, {
    text: 'Options',
    fontAtlas,
    size: 24,
    // A plain UiAnchor.bottomRight pivot (1, 0) sits at the box's own
    // bottom edge, but verticalAlign: 'middle' centers the text around the
    // entity's own local origin regardless of the box's declared height -
    // pairing them left half the text rendering below the box and half
    // within it. A custom pivot.y of 0.5 (keeping the same bottom-right
    // anchor reference) makes the origin the box's actual vertical center,
    // so 'middle' centers the text within the declared 32-tall box for real.
    anchor: { ...UiAnchor.bottomRight, pivot: { x: 1, y: 0.5 } },
    anchoredPosition: { x: -60, y: 288 },
    sizeOrMargin: { x: 400, y: 32 },
    // A point anchor (this one included) never gets `maxWidth`/
    // `horizontalAlignPivot` synced from its rect the way a stretch-x
    // anchor does (see createLabel's own doc comment) - left unset,
    // `horizontalAlign: 'right'` had nothing to align against but the
    // text's own width, and `horizontalAlignPivot` stayed its default 0
    // instead of matching this label's pivot.x of 1, so the text rendered
    // flush with local x = 0 (the box's *right* edge, per pivot.x = 1) and
    // grew further right from there - past the panel's right edge instead
    // of flush against it. Setting both explicitly gives `horizontalAlign`
    // the actual 400-wide box to right-align within.
    maxWidth: 400,
    horizontalAlignPivot: 1,
    horizontalAlign: textHorizontalAlignments.right,
    verticalAlign: textVerticalAlignments.middle,
    color: Color.white,
    category: uiCategory,
  });

  const panel = createPanel(world, canvas, {
    anchor: UiAnchor.bottomRight,
    anchoredPosition: { x: -60, y: 60 },
    sizeOrMargin: { x: 400, y: 200 },
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
  });
}
