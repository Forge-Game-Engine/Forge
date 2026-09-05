import { EcsWorld } from '@forge-game-engine/forge/ecs';
import { Color } from '@forge-game-engine/forge/rendering';
import {
  FontAtlas,
  textHorizontalAlignments,
  textVerticalAlignments,
} from '@forge-game-engine/forge/text';
import {
  createButton,
  createLabel,
  createSlider,
  createToggle,
  UiAnchor,
} from '@forge-game-engine/forge/ui';
import { DemoSprites } from './_load-demo-sprites';

/**
 * Creates the actual "options" hosted by the content panel: a Music volume
 * slider, a Fullscreen toggle, and a Back button.
 */
export function createOptionsContent(
  world: EcsWorld,
  content: number,
  fontAtlas: FontAtlas,
  sprites: DemoSprites,
  textColor: Color,
  uiLayer: number,
): void {
  // Both row labels share this box width (rather than each sizing to its own
  // text), so "Music" and "Fullscreen" line up on the same left edge, and
  // every control sits at the same `controlX` right after it - the controls
  // end up aligned on their own left edge too, regardless of how long the
  // label text next to them is.
  const labelX = 16;
  const labelWidth = 140;
  const controlX = labelX + labelWidth + 16;

  const rowLabel = (text: string, y: number, size = 20): void => {
    createLabel(world, content, {
      text,
      fontAtlas,
      size,
      anchor: UiAnchor.topLeft,
      anchoredPosition: { x: labelX, y },
      sizeOrMargin: { x: labelWidth, y: size + 8 },
      horizontalAlign: textHorizontalAlignments.left,
      verticalAlign: textVerticalAlignments.middle,
      color: textColor,
      category: uiLayer,
    });
  };

  const musicRowY = -96;

  rowLabel('Music', musicRowY);

  createSlider(world, content, {
    trackSprite: sprites.track,
    handleSprite: sprites.handle,
    fillSprite: sprites.fill,
    anchor: UiAnchor.topLeft,
    anchoredPosition: { x: controlX, y: musicRowY - 2 },
    sizeOrMargin: { x: 180, y: 20 },
    value: 0.7,
  });

  const fullscreenRowY = -152;

  rowLabel('Fullscreen', fullscreenRowY);

  createToggle(world, content, {
    sprite: sprites.box,
    checkmarkSprite: sprites.checkmark,
    anchor: UiAnchor.topLeft,
    anchoredPosition: { x: controlX, y: fullscreenRowY + 10 },
    sizeOrMargin: { x: 28, y: 28 },
    isOn: true,
  });

  createButton(world, content, {
    sprite: sprites.backButton,
    label: 'Back',
    fontAtlas,
    labelSize: 18,
    labelColor: textColor,
    labelCategory: uiLayer,
    anchor: UiAnchor.bottomRight,
    anchoredPosition: { x: -16, y: 16 },
    sizeOrMargin: { x: 100, y: 40 },
  });
}
