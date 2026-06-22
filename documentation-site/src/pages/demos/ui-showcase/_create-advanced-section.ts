import { Vector2 } from '@forge-game-engine/forge/math';
import { Color } from '@forge-game-engine/forge/rendering';
import {
  createUiDropdown,
  createUiInputBox,
  createUiPanel,
  createUiRenderable,
  createUiScrollGroup,
  createUiText,
} from '@forge-game-engine/forge/ui';
import type { SectionContext, SectionResult } from './_section-context';

const HEIGHT = 230;
const MARGIN = 16;

export function createAdvancedSection(ctx: SectionContext): SectionResult {
  const {
    world,
    renderContext,
    canvasEntity,
    contentEntity,
    contentWidth,
    y,
    font,
    panelRenderable,
    textInputSource,
  } = ctx;

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
    text: '5. Scroll Groups, Input Boxes and Dropdowns',
    font,
    fontSize: 18,
    color: Color.white,
    rect: { x: 0, y: 0, width: contentWidth - MARGIN * 2, height: 24 },
    parent: section.entity,
  });

  const scrollWidth = Math.min(260, contentWidth - MARGIN * 2);
  const scrollbarRenderable = createUiRenderable(renderContext);

  const itemHeight = 26;
  const itemCount = 20;

  const scrollGroup = createUiScrollGroup(world, {
    renderable: panelRenderable,
    contentRenderable: panelRenderable,
    rect: { x: 0, y: 36, width: scrollWidth, height: 110 },
    parent: section.entity,
    tintColor: new Color(0.1, 0.11, 0.14, 1),
    borderColor: new Color(0.35, 0.38, 0.45, 1),
    borderWidth: 1,
    cornerRadius: 6,
    contentSize: new Vector2(scrollWidth, itemCount * (itemHeight + 4)),
    showScrollbar: true,
    scrollbarRenderable,
  });

  scrollGroup.scroll.viewportSize = new Vector2(scrollWidth, 110);

  for (let i = 0; i < itemCount; i++) {
    const hue = (i / itemCount) * 360;

    createUiPanel(world, {
      renderable: panelRenderable,
      rect: { x: 4, y: i * (itemHeight + 4) + 4, width: scrollWidth - 24, height: itemHeight },
      parent: scrollGroup.contentEntity,
      tintColor: Color.fromHSLA(hue, 45, 28, 1),
      cornerRadius: 3,
    });

    createUiText(world, renderContext, {
      text: `Row ${i + 1}`,
      font,
      fontSize: 12,
      color: new Color(0.85, 0.87, 0.92, 1),
      verticalAlign: 'middle',
      rect: { x: 12, y: i * (itemHeight + 4) + 4, width: scrollWidth - 40, height: itemHeight },
      parent: scrollGroup.contentEntity,
    });
  }

  const sideX = scrollWidth + 24;
  const sideWidth = Math.max(140, contentWidth - MARGIN * 2 - sideX);

  createUiText(world, renderContext, {
    text: 'Input box',
    font,
    fontSize: 13,
    color: new Color(0.75, 0.78, 0.85, 1),
    rect: { x: sideX, y: 36, width: sideWidth, height: 18 },
    parent: section.entity,
  });

  createUiInputBox(world, {
    renderable: panelRenderable,
    caretRenderable: panelRenderable,
    selectionRenderable: panelRenderable,
    renderContext,
    font,
    rect: { x: sideX, y: 56, width: sideWidth, height: 32 },
    parent: section.entity,
    tintColor: new Color(0.93, 0.94, 0.96, 1),
    borderColor: new Color(0.4, 0.43, 0.5, 1),
    borderWidth: 1,
    cornerRadius: 4,
    textColor: new Color(0.1, 0.1, 0.12, 1),
    placeholder: 'Type here...',
    textInputSource,
    tabIndex: 10,
  });

  createUiText(world, renderContext, {
    text: 'Dropdown',
    font,
    fontSize: 13,
    color: new Color(0.75, 0.78, 0.85, 1),
    rect: { x: sideX, y: 100, width: sideWidth, height: 18 },
    parent: section.entity,
  });

  createUiDropdown(world, {
    renderable: panelRenderable,
    optionRenderable: panelRenderable,
    scrollRenderable: panelRenderable,
    renderContext,
    font,
    canvasEntity,
    rect: { x: sideX, y: 120, width: sideWidth, height: 32 },
    parent: section.entity,
    tintColor: new Color(0.93, 0.94, 0.96, 1),
    borderColor: new Color(0.4, 0.43, 0.5, 1),
    borderWidth: 1,
    cornerRadius: 4,
    options: ['Alpha', 'Beta', 'Gamma', 'Delta'],
    selectedIndex: 0,
    tabIndex: 11,
  });

  return { height: HEIGHT, themedRenderables: [] };
}
