import fontImageUrl from '../../../assets/fonts/default/default.png?url';
import fontMetricsUrl from '../../../assets/fonts/default/default.json?url';
import {
  Color,
  createButton,
  createImageSprite,
  createLabel,
  createPanel,
  createPresentEcsSystem,
  createProgressBar,
  createRenderEcsSystem,
  createSlider,
  createTextShapingEcsSystem,
  createToggle,
  createTransformEcsSystem,
  createUiCanvas,
  FontAtlasCache,
  NineSliceOptions,
  registerUiSystems,
  SpriteEcsComponent,
  Texture,
  UiAnchor,
  uiScaleModes,
} from '../../../src/index.js';
import type { CreateScene, SceneHandle } from '../../fixtures/scenes/scene.js';
import {
  createComputedTexture,
  createGoldenCamera,
  createGoldenSceneContext,
  createGoldenSceneHandle,
  Texel,
} from '../golden-scene.js';

const worldRenderCategory = 1 << 0;
const uiRenderCategory = 1 << 1;

/**
 * A 12 × 12 rounded frame for nine-slicing: a 4-texel light border with
 * transparent corner texels, around a white center that the tint colors.
 */
function frameTexel(x: number, y: number): Texel {
  const edge = Math.min(x, y, 11 - x, 11 - y);
  const isCorner = Math.min(x, 11 - x) + Math.min(y, 11 - y) < 2;

  if (isCorner) {
    return [0, 0, 0, 0];
  }

  return edge < 1 ? [140, 140, 150, 255] : [255, 255, 255, 255];
}

const frameSlices: NineSliceOptions = {
  left: 4,
  right: 4,
  top: 4,
  bottom: 4,
};

/**
 * The retained-mode UI controls in their default states, in a screen-space
 * canvas over a world camera: a nine-sliced window panel, a title label, a
 * button, toggles on and off, a slider with a fill, and linear and radial
 * progress bars.
 * @param container - The element to render the scene's canvas into.
 * @returns The scene's handle.
 */
export const createScene: CreateScene = async (
  container: HTMLElement,
): Promise<SceneHandle> => {
  const context = createGoldenSceneContext(container);
  const { world, renderContext, time } = context;

  createGoldenCamera(context, {
    clearColor: new Color(0.2, 0.25, 0.3),
    cullingMask: worldRenderCategory,
  });

  registerUiSystems(world, renderContext, time);

  const canvas = createUiCanvas(world, renderContext, {
    cullingMask: uiRenderCategory,
    scaleMode: uiScaleModes.constantPixelSize,
  });

  const fontAtlas = await new FontAtlasCache(renderContext).getOrLoad({
    metricsUrl: fontMetricsUrl,
    imageUrl: fontImageUrl,
  });

  const frame = createComputedTexture(renderContext, 12, 12, frameTexel);

  const sprite = (texture: Texture, tint: Color): SpriteEcsComponent => ({
    ...createImageSprite(texture, { pixelsPerUnit: 1 }),
    category: uiRenderCategory,
    tintColor: tint,
  });

  const framed = (tint: Color): SpriteEcsComponent => sprite(frame, tint);
  const flat = (tint: Color): SpriteEcsComponent =>
    sprite(renderContext.whiteTexture, tint);

  const settingsPanel = createPanel(world, canvas, {
    sprite: framed(new Color(0.95, 0.95, 0.97)),
    slices: frameSlices,
    anchor: UiAnchor.center({ x: 280, y: 210 }),
  });

  createLabel(world, settingsPanel, {
    text: 'Settings',
    fontAtlas,
    size: 20,
    color: new Color(0.15, 0.15, 0.2),
    horizontalAlign: 'center',
    category: uiRenderCategory,
    // Stretched across the panel, so layout sizes the text's box to the
    // label's rect and the text centers in it.
    anchor: UiAnchor.stretchTop({ height: 28, horizontalMargin: 8 }),
    anchoredPosition: { x: 0, y: -8 },
  });

  // A button's color transition owns its sprite's tint, so the button's
  // color is its transition's normal color.
  createButton(world, settingsPanel, {
    sprite: framed(Color.white),
    transition: { normalColor: new Color(0.25, 0.5, 0.9) },
    slices: frameSlices,
    label: 'Play',
    fontAtlas,
    labelSize: 18,
    labelColor: Color.white,
    labelCategory: uiRenderCategory,
    anchor: UiAnchor.topLeft({ x: 110, y: 36 }),
    anchoredPosition: { x: 20, y: -44 },
  });

  const toggleSprites = {
    sprite: framed(Color.white),
    slices: frameSlices,
    checkmarkSprite: flat(new Color(0.1, 0.6, 0.3)),
  };

  createToggle(world, settingsPanel, {
    ...toggleSprites,
    isOn: true,
    anchor: UiAnchor.topLeft({ x: 28, y: 28 }),
    anchoredPosition: { x: 150, y: -48 },
  });
  createToggle(world, settingsPanel, {
    ...toggleSprites,
    isOn: false,
    anchor: UiAnchor.topLeft({ x: 28, y: 28 }),
    anchoredPosition: { x: 190, y: -48 },
  });

  createSlider(world, settingsPanel, {
    trackSprite: flat(new Color(0.75, 0.75, 0.8)),
    fillSprite: flat(new Color(0.95, 0.55, 0.15)),
    handleSprite: framed(new Color(0.3, 0.3, 0.35)),
    handleSize: { x: 16, y: 24 },
    value: 0.3,
    anchor: UiAnchor.topLeft({ x: 220, y: 10 }),
    anchoredPosition: { x: 30, y: -108 },
  });

  createProgressBar(world, settingsPanel, {
    trackSprite: flat(new Color(0.8, 0.8, 0.85)),
    fillSprite: flat(new Color(0.2, 0.7, 0.4)),
    value: 0.65,
    fillShape: { kind: 'linear', origin: 'left' },
    anchor: UiAnchor.topLeft({ x: 160, y: 16 }),
    anchoredPosition: { x: 20, y: -150 },
  });

  createProgressBar(world, settingsPanel, {
    trackSprite: flat(new Color(0.8, 0.8, 0.85)),
    fillSprite: flat(new Color(0.85, 0.25, 0.3)),
    value: 0.4,
    fillShape: { kind: 'radial', startAngle: Math.PI / 2, sweep: -Math.PI * 2 },
    anchor: UiAnchor.topLeft({ x: 48, y: 48 }),
    anchoredPosition: { x: 200, y: -140 },
  });

  world.addSystem(createTransformEcsSystem());
  world.addSystem(createTextShapingEcsSystem());
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createPresentEcsSystem(renderContext));

  return createGoldenSceneHandle(context);
};
