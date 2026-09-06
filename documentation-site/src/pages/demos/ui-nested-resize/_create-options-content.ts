import {
  addParentComponent,
  addPositionComponent,
} from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import { Color } from '@forge-game-engine/forge/rendering';
import { FontAtlas } from '@forge-game-engine/forge/text';
import {
  addContentSizeFitterComponent,
  addGridLayoutGroupComponent,
  addRectTransformComponent,
  createButton,
  createLabel,
  createSlider,
  createToggle,
  uiAlignments,
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
  // A `GridLayoutGroupEcsComponent` with `columnWidthMode: 'content'` sizes
  // the label column to whichever of "Music"/"Fullscreen" is actually
  // widest, so every row's control lands at the same x position with no
  // hand-computed offsets - a `ContentSizeFitterEcsComponent` on the same
  // entity shrink-wraps the grid itself to that measured content.
  const optionsGrid = world.createEntity();

  addPositionComponent(world, optionsGrid);
  addParentComponent(world, optionsGrid, { parent: content });
  addRectTransformComponent(world, optionsGrid, {
    ...UiAnchor.topLeft,
    anchoredPosition: { x: 16, y: -96 },
  });
  addContentSizeFitterComponent(world, optionsGrid, {
    horizontalFit: 'preferredSize',
    verticalFit: 'preferredSize',
  });
  addGridLayoutGroupComponent(world, optionsGrid, {
    constraint: 'fixedColumnCount',
    constraintCount: 2,
    columnWidthMode: 'content',
    rowHeightMode: 'content',
    spacing: { x: 16, y: 16 },
    cellAlignment: uiAlignments.middleLeft,
  });

  createLabel(world, optionsGrid, {
    text: 'Music',
    fontAtlas,
    size: 20,
    sizeToText: true,
    color: textColor,
    category: uiLayer,
  });

  createSlider(world, optionsGrid, {
    trackSprite: sprites.track,
    handleSprite: sprites.handle,
    fillSprite: sprites.fill,
    sizeOrMargin: { x: 180, y: 20 },
    value: 0.7,
  });

  createLabel(world, optionsGrid, {
    text: 'Fullscreen',
    fontAtlas,
    size: 20,
    sizeToText: true,
    color: textColor,
    category: uiLayer,
  });

  createToggle(world, optionsGrid, {
    sprite: sprites.box,
    checkmarkSprite: sprites.checkmark,
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
