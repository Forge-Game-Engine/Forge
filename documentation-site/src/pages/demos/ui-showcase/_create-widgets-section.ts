import { Vector2 } from '@forge-game-engine/forge/math';
import { Color } from '@forge-game-engine/forge/rendering';
import {
  createUiButton,
  createUiCheckbox,
  createUiPanel,
  createUiRenderable,
  createUiSlider,
  createUiText,
  uiRenderableId,
  uiTextId,
} from '@forge-game-engine/forge/ui';
import type { SectionContext, SectionResult } from './_section-context';
import type { ThemedRenderable } from './_theme';

const HEIGHT = 180;
const MARGIN = 16;

export function createWidgetsSection(ctx: SectionContext): SectionResult {
  const { world, renderContext, contentEntity, contentWidth, y, font, panelRenderable } = ctx;
  const themedRenderables: ThemedRenderable[] = [];

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
    text: '4. Widgets, Interaction and Focus',
    font,
    fontSize: 18,
    color: Color.white,
    rect: { x: 0, y: 0, width: contentWidth - MARGIN * 2, height: 24 },
    parent: section.entity,
  });

  const accentRenderable = createUiRenderable(renderContext);

  let clicks = 0;
  let checked = false;

  const statusEntity = createUiText(world, renderContext, {
    text: 'Clicks: 0 | Feature: off',
    font,
    fontSize: 14,
    color: new Color(0.75, 0.78, 0.85, 1),
    rect: { x: 0, y: 116, width: contentWidth - MARGIN * 2, height: 20 },
    parent: section.entity,
  });

  const updateStatus = (): void => {
    const textComp = world.getComponent(statusEntity, uiTextId)!;

    textComp.text = `Clicks: ${clicks} | Feature: ${checked ? 'on' : 'off'}`;
    textComp.dirty = true;
  };

  const button = createUiButton(world, {
    renderable: panelRenderable,
    renderContext,
    font,
    rect: { x: 0, y: 36, width: 140, height: 40 },
    parent: section.entity,
    tintColor: new Color(0.25, 0.55, 0.95, 1),
    cornerRadius: 6,
    label: 'Click me',
    labelColor: Color.white,
    stateStyles: {
      hover: { tintColor: new Color(0.35, 0.62, 0.98, 1) },
      pressed: { tintColor: new Color(0.18, 0.42, 0.78, 1) },
      focused: { borderColor: Color.white, borderWidth: 2 },
    },
    tabIndex: 1,
    onClick: () => {
      clicks++;
      updateStatus();
    },
  });

  createUiText(world, renderContext, {
    text: 'Enable feature',
    font,
    fontSize: 14,
    color: new Color(0.85, 0.87, 0.92, 1),
    verticalAlign: 'middle',
    rect: { x: 176, y: 36, width: 130, height: 28 },
    parent: section.entity,
  });

  const checkbox = createUiCheckbox(world, {
    renderable: panelRenderable,
    checkRenderable: accentRenderable,
    rect: { x: 312, y: 40, width: 22, height: 22 },
    parent: section.entity,
    tintColor: new Color(0.85, 0.87, 0.92, 1),
    borderColor: new Color(0.4, 0.43, 0.5, 1),
    borderWidth: 1,
    cornerRadius: 4,
    checkColor: new Color(0.25, 0.55, 0.95, 1),
    tabIndex: 2,
    onChange: (event) => {
      checked = event.checked;
      updateStatus();
    },
  });

  createUiText(world, renderContext, {
    text: 'Value:',
    font,
    fontSize: 13,
    color: new Color(0.75, 0.78, 0.85, 1),
    rect: { x: 0, y: 84, width: 60, height: 18 },
    parent: section.entity,
  });

  const sliderValueEntity = createUiText(world, renderContext, {
    text: '50',
    font,
    fontSize: 13,
    color: new Color(0.75, 0.78, 0.85, 1),
    rect: { x: 60, y: 84, width: 60, height: 18 },
    parent: section.entity,
  });

  const slider = createUiSlider(world, {
    renderable: panelRenderable,
    fillRenderable: accentRenderable,
    knobRenderable: accentRenderable,
    rect: { x: 0, y: 104, width: 280, height: 6 },
    parent: section.entity,
    tintColor: new Color(0.3, 0.32, 0.38, 1),
    cornerRadius: 3,
    fillColor: new Color(0.25, 0.55, 0.95, 1),
    fillCornerRadius: 3,
    knobColor: Color.white,
    knobWidth: 16,
    knobHeight: 16,
    knobCornerRadius: 8,
    min: 0,
    max: 100,
    step: 1,
    value: 50,
    tabIndex: 3,
    onChange: (event) => {
      const textComp = world.getComponent(sliderValueEntity, uiTextId)!;

      textComp.text = Math.round(event.value).toString();
      textComp.dirty = true;
    },
  });

  themedRenderables.push(
    { renderable: world.getComponent(button.entity, uiRenderableId)!, role: 'accent' },
    { renderable: world.getComponent(checkbox.entity, uiRenderableId)!, role: 'panel' },
    { renderable: world.getComponent(slider.entity, uiRenderableId)!, role: 'panel' },
  );

  return { height: HEIGHT, themedRenderables };
}
