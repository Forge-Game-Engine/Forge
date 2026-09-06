import {
  createImageSprite,
  RenderContext,
  SpriteEcsComponent,
} from '@forge-game-engine/forge/rendering';
import { getAssetUrl } from '@site/src/utils/get-asset-url';

// Every panel/control below is drawn straight from a `kenney_ui-pack` image
// - each color already baked into its own file by the pack (Grey/Blue/
// Green/Red/Yellow) - so nothing in this demo sets `sprite.tintColor`; each
// element renders exactly as its source image looks.
const kenneyAsset = (color: string, fileName: string): string =>
  `img/kenney_ui-pack/PNG/${color}/Default/${fileName}`;

const panelBorderSlices = {
  left: 26,
  right: 26,
  top: 26,
  bottom: 26,
  nativeWidth: 96,
  nativeHeight: 96,
};

export interface DemoSprites {
  frame: SpriteEcsComponent;
  content: SpriteEcsComponent;
  header: SpriteEcsComponent;
  closeButton: SpriteEcsComponent;
  cornerAccent: SpriteEcsComponent;
  backButton: SpriteEcsComponent;
  track: SpriteEcsComponent;
  fill: SpriteEcsComponent;
  handle: SpriteEcsComponent;
  box: SpriteEcsComponent;
  checkmark: SpriteEcsComponent;
}

/** Loads the image at `assetPath` and builds a sprite from it. */
async function createSprite(
  renderContext: RenderContext,
  uiLayer: number,
  assetPath: string,
  slices?: typeof panelBorderSlices,
): Promise<SpriteEcsComponent> {
  const image = await renderContext.imageCache.getOrLoad(
    getAssetUrl(assetPath),
  );

  return createImageSprite(image, renderContext, {
    layer: uiLayer,
    slices,
  });
}

/** Loads every sprite the options window and its controls are drawn with. */
export async function loadDemoSprites(
  renderContext: RenderContext,
  uiLayer: number,
): Promise<DemoSprites> {
  // Nine-sliced: the same `button_rectangle_flat.png` border layout in a
  // different color per role, so each panel keeps its beveled corners at
  // any size.
  const panelSprite = (color: string) =>
    createSprite(
      renderContext,
      uiLayer,
      kenneyAsset(color, 'button_rectangle_flat.png'),
      panelBorderSlices,
    );

  // Plain, unsliced sprites - a slider/toggle's parts, drawn at a fixed size.
  const plainSprite = (assetPath: string) =>
    createSprite(renderContext, uiLayer, assetPath);

  return {
    frame: await panelSprite('Grey'),
    content: await panelSprite('Blue'),
    header: await panelSprite('Green'),
    closeButton: await panelSprite('Red'),
    cornerAccent: await panelSprite('Yellow'),
    backButton: await panelSprite('Blue'),
    track: await plainSprite(kenneyAsset('Grey', 'button_rectangle_flat.png')),
    fill: await plainSprite(kenneyAsset('Blue', 'button_rectangle_flat.png')),
    handle: await plainSprite(kenneyAsset('Grey', 'slide_hangle.png')),
    box: await plainSprite(kenneyAsset('Grey', 'check_square_grey.png')),
    checkmark: await plainSprite(kenneyAsset('Blue', 'icon_checkmark.png')),
  };
}
