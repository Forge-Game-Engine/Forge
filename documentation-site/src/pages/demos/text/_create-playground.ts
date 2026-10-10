import {
  addPositionComponent,
  PositionEcsComponent,
} from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  addSpriteComponent,
  Color,
  SpriteEcsComponent,
} from '@forge-game-engine/forge/rendering';
import {
  addTextComponent,
  FontAtlas,
  TextEcsComponent,
  TextHorizontalAlign,
  TextVerticalAlign,
} from '@forge-game-engine/forge/text';

/**
 * Everything the playground's controls can change.
 */
export interface PlaygroundSettings {
  text: string;
  size: number;
  wrapWidth: number;
  lineHeight: number;
  horizontalAlign: TextHorizontalAlign;
  verticalAlign: TextVerticalAlign;
  richText: boolean;
  outline: boolean;
  outlineWidth: number;
  glow: boolean;
  glowOffsetX: number;
  glowOffsetY: number;
  glowSoftness: number;
}

export const defaultPlaygroundSettings: PlaygroundSettings = {
  text: 'Forge draws text from a <b>signed distance field</b> font, so it stays <color=#ffbc42>sharp</color> at any size. Type here and drag the sliders to watch it reflow.',
  size: 32,
  wrapWidth: 560,
  lineHeight: 1,
  horizontalAlign: 'left',
  verticalAlign: 'top',
  richText: true,
  outline: false,
  outlineWidth: 1.2,
  glow: false,
  glowOffsetX: 0.8,
  glowOffsetY: -0.8,
  glowSoftness: 1.4,
};

const columnColor = new Color(0.16, 0.17, 0.21, 1);
const anchorColor = new Color(0.95, 0.55, 0.25, 1);
const textColor = new Color(0.92, 0.94, 0.97, 1);
const outlineColor = new Color(1, 0.45, 0.15, 1);
const glowColor = new Color(0.15, 0.65, 1, 0.95);
const anchorThickness = 2;

// The demo's canvas is always at least 3:2, so its view is at least 900
// world units wide; this leaves a margin either side.
export const playgroundMaxWrapWidth = 800;
// Tall enough to cover the view at any canvas size.
const columnHeight = 2000;

/**
 * The playground's live entities, which `applyPlaygroundSettings` updates.
 */
export interface Playground {
  text: TextEcsComponent;
  textPosition: PositionEcsComponent;
  column: SpriteEcsComponent;
  anchorLine: SpriteEcsComponent;
}

/**
 * Builds the playground: one block of text, a dark column showing its wrap
 * width, and an orange line through the point the text is anchored to.
 * The text is centered on the canvas and anchored at its middle, so every
 * `verticalAlign` value moves the text relative to the line.
 * @param world - The ECS world to add the entities to.
 * @param fontAtlas - The font the text is drawn with.
 * @param whiteSprite - A plain white sprite to tint into the column and line.
 * @returns The live entities, for `applyPlaygroundSettings`.
 */
export function createPlayground(
  world: EcsWorld,
  fontAtlas: FontAtlas,
  whiteSprite: SpriteEcsComponent,
): Playground {
  const columnEntity = world.createEntity();
  addPositionComponent(world, columnEntity);
  const column = addSpriteComponent(world, columnEntity, {
    ...whiteSprite,
    height: columnHeight,
    tintColor: columnColor,
    layer: 0,
  });

  const anchorEntity = world.createEntity();
  addPositionComponent(world, anchorEntity);
  const anchorLine = addSpriteComponent(world, anchorEntity, {
    ...whiteSprite,
    height: anchorThickness,
    tintColor: anchorColor,
    layer: 1,
  });

  const textEntity = world.createEntity();
  const textPosition = addPositionComponent(world, textEntity);
  const text = addTextComponent(world, textEntity, {
    text: defaultPlaygroundSettings.text,
    size: defaultPlaygroundSettings.size,
    fontAtlas,
    color: textColor,
    outlineColor,
    layer: 2,
  });

  const playground = { text, textPosition, column, anchorLine };

  applyPlaygroundSettings(playground, defaultPlaygroundSettings);

  return playground;
}

/**
 * Writes `settings` into the playground's text and resizes its guides to
 * match. The text shaping system reshapes the text on its next update.
 * @param playground - The playground to update.
 * @param settings - The values to show.
 */
export function applyPlaygroundSettings(
  playground: Playground,
  settings: PlaygroundSettings,
): void {
  const { text, textPosition, column, anchorLine } = playground;
  const wrapWidth = Math.min(settings.wrapWidth, playgroundMaxWrapWidth);

  // The text's x is the left edge of its wrap width, so centering the
  // column on the canvas means starting the text half a column to the left.
  textPosition.local = { x: -wrapWidth / 2, y: 0 };
  column.width = wrapWidth;
  anchorLine.width = wrapWidth;

  text.text = settings.text;
  text.size = settings.size;
  text.maxWidth = wrapWidth;
  text.lineHeight = settings.lineHeight;
  text.horizontalAlign = settings.horizontalAlign;
  text.verticalAlign = settings.verticalAlign;
  text.richText = settings.richText;

  // A zero outline width and a transparent shadow draw nothing.
  text.outlineWidth = settings.outline ? settings.outlineWidth : 0;
  text.shadowColor = settings.glow ? glowColor : Color.transparent;
  text.shadowOffset = { x: settings.glowOffsetX, y: settings.glowOffsetY };
  text.shadowSoftness = settings.glowSoftness;
}
