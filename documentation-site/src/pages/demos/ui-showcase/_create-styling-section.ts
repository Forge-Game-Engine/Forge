import { Vector2 } from '@forge-game-engine/forge/math';
import { Color } from '@forge-game-engine/forge/rendering';
import {
  bindUiInstanceData,
  createCustomUiRenderable,
  createUiClip,
  createUiPanel,
  createUiText,
  setupUiInstanceAttributes,
  uiVertexShader,
  UI_FLOATS_PER_INSTANCE,
} from '@forge-game-engine/forge/ui';
import { stripesFragmentShader } from './_stripes-shader';
import type { SectionContext, SectionResult } from './_section-context';

const HEIGHT = 150;
const MARGIN = 16;

export function createStylingSection(ctx: SectionContext): SectionResult {
  const { world, renderContext, contentEntity, contentWidth, y, font, panelRenderable } = ctx;

  const section = createUiPanel(world, {
    renderable: panelRenderable,
    anchorMin: new Vector2(0, 0),
    anchorMax: new Vector2(1, 0),
    offsetMin: new Vector2(MARGIN, y),
    offsetMax: new Vector2(-MARGIN, y + HEIGHT),
    parent: contentEntity,
    tintColor: Color.transparent,
    borderColor: Color.transparent,
  });

  createUiText(world, renderContext, {
    text: '2. Default Styling, Custom Materials and Clipping',
    font,
    fontSize: 18,
    color: Color.white,
    rect: { x: 0, y: 0, width: contentWidth - MARGIN * 2, height: 24 },
    parent: section.entity,
  });

  const tileSize = 90;
  const gap = 14;
  let x = 0;

  // Tile 1: default tint + opacity.
  createUiPanel(world, {
    renderable: panelRenderable,
    rect: { x, y: 36, width: tileSize, height: tileSize },
    parent: section.entity,
    tintColor: new Color(0.3, 0.6, 0.95, 0.85),
    cornerRadius: 8,
  });

  x += tileSize + gap;

  // Tile 2: border + corner radius.
  createUiPanel(world, {
    renderable: panelRenderable,
    rect: { x, y: 36, width: tileSize, height: tileSize },
    parent: section.entity,
    tintColor: new Color(0.15, 0.16, 0.2, 1),
    borderColor: new Color(0.95, 0.55, 0.25, 1),
    borderWidth: 3,
    cornerRadius: 16,
  });

  x += tileSize + gap;

  // Tile 3: clipping. A larger child panel is intentionally positioned to
  // overflow the parent's bounds; `createUiClip` masks it to the parent rect.
  const clipParent = createUiPanel(world, {
    renderable: panelRenderable,
    rect: { x, y: 36, width: tileSize, height: tileSize },
    parent: section.entity,
    tintColor: new Color(0.15, 0.16, 0.2, 1),
    borderColor: new Color(0.4, 0.43, 0.5, 1),
    borderWidth: 1,
    cornerRadius: 8,
  });

  createUiClip(world, clipParent.entity);

  createUiPanel(world, {
    renderable: panelRenderable,
    rect: { x: -20, y: -20, width: tileSize + 60, height: tileSize + 60 },
    parent: clipParent.entity,
    tintColor: new Color(0.3, 0.85, 0.6, 0.9),
    cornerRadius: 12,
  });

  x += tileSize + gap;

  // Tile 4: a fully custom fragment shader on the standard instance layout.
  const stripesRenderable = createCustomUiRenderable(renderContext, {
    vertexSource: uiVertexShader,
    fragmentSource: stripesFragmentShader,
    floatsPerInstance: UI_FLOATS_PER_INSTANCE,
    bindInstanceData: bindUiInstanceData,
    setupInstanceAttributes: setupUiInstanceAttributes,
  });

  createUiPanel(world, {
    renderable: stripesRenderable,
    rect: { x, y: 36, width: tileSize, height: tileSize },
    parent: section.entity,
    tintColor: new Color(0.85, 0.3, 0.4, 1),
    borderColor: new Color(0.95, 0.85, 0.3, 1),
    cornerRadius: 8,
  });

  return { height: HEIGHT, themedRenderables: [] };
}
