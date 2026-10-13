import {
  easeInOutQuint,
  easeInOutSine,
  linear,
} from '@forge-game-engine/forge/animations';
import {
  Color,
  Texture,
  TrailEcsComponent,
} from '@forge-game-engine/forge/rendering';

/** The demo's four trails, each on its own entity. */
export type TrailName = 'cursor' | 'textured' | 'glowing' | 'ship';

/** The pairs of colors a trail can run between, from the entity to its tail. */
export type ColorPreset = 'white' | 'fire' | 'ice' | 'toxic';

/** The easing functions a trail's width and color can follow. */
export type EasingName = 'linear' | 'easeInOutSine' | 'easeInOutQuint';

/** No texture, or the pattern texture in one of the trail texture modes. */
export type TextureChoice = 'none' | 'stretch' | 'tile';

/** What the demo's settings change about a trail. */
export interface TrailDemoSettings {
  lifetimeSeconds: number;
  minVertexDistance: number;
  startWidth: number;
  endWidth: number;
  colors: ColorPreset;

  /** Multiplies the colors by `glowBrightness`, so the camera's bloom picks them up. */
  glow: boolean;
  widthEasing: EasingName;
  colorEasing: EasingName;
  texture: TextureChoice;
  tileLength: number;
  emitting: boolean;
}

/**
 * How much brighter than its preset a glowing trail's colors are. The
 * camera renders in HDR and blooms only what's brighter than white, so red,
 * green and blue above `1` glow.
 */
const glowBrightness = 4;

const colorPresets: Record<ColorPreset, { start: Color; end: Color }> = {
  white: { start: new Color(1, 1, 1, 1), end: new Color(0.6, 0.8, 1, 0) },
  fire: { start: new Color(1, 0.8, 0.3, 1), end: new Color(1, 0.15, 0, 0) },
  ice: { start: new Color(0.7, 0.95, 1, 1), end: new Color(0.1, 0.3, 1, 0) },
  toxic: { start: new Color(0.7, 1, 0.2, 1), end: new Color(0.1, 0.6, 0.1, 0) },
};

const easings: Record<EasingName, (t: number) => number> = {
  linear,
  easeInOutSine,
  easeInOutQuint,
};

/** Each trail's starting settings, one per thing the demo shows. */
export const defaultTrailSettings: Record<TrailName, TrailDemoSettings> = {
  // Thin and tapering to nothing, following the mouse.
  cursor: {
    lifetimeSeconds: 0.4,
    minVertexDistance: 4,
    startWidth: 8,
    endWidth: 0,
    colors: 'white',
    glow: false,
    widthEasing: 'linear',
    colorEasing: 'linear',
    texture: 'none',
    tileLength: 40,
    emitting: true,
  },
  // Wide, the same width all the way, with a pattern tiled along the path.
  textured: {
    lifetimeSeconds: 1.5,
    minVertexDistance: 6,
    startWidth: 36,
    endWidth: 36,
    colors: 'ice',
    glow: false,
    widthEasing: 'linear',
    colorEasing: 'easeInOutQuint',
    texture: 'tile',
    tileLength: 36,
    emitting: true,
  },
  // Brighter than white, so it blooms.
  glowing: {
    lifetimeSeconds: 0.8,
    minVertexDistance: 4,
    startWidth: 14,
    endWidth: 2,
    colors: 'fire',
    glow: true,
    widthEasing: 'easeInOutSine',
    colorEasing: 'linear',
    texture: 'none',
    tileLength: 40,
    emitting: true,
  },
  // Behind the ship's sprite and over the background.
  ship: {
    lifetimeSeconds: 1.2,
    minVertexDistance: 8,
    startWidth: 24,
    endWidth: 0,
    colors: 'toxic',
    glow: false,
    widthEasing: 'linear',
    colorEasing: 'linear',
    texture: 'none',
    tileLength: 40,
    emitting: true,
  },
};

const brighten = (color: Color, factor: number): Color =>
  new Color(color.r * factor, color.g * factor, color.b * factor, color.a);

/**
 * Writes the settings into a running trail. The trail system reads them
 * every frame, so the trail changes from the next frame.
 * @param trail - The trail to change.
 * @param settings - The settings to apply.
 * @param pattern - The texture laid along the trail when it has one; it
 * repeats, for `'tile'` mode.
 */
export function applyTrailSettings(
  trail: TrailEcsComponent,
  settings: TrailDemoSettings,
  pattern: Texture,
): void {
  const { start, end } = colorPresets[settings.colors];
  const brightness = settings.glow ? glowBrightness : 1;

  trail.lifetimeSeconds = settings.lifetimeSeconds;
  trail.minVertexDistance = settings.minVertexDistance;
  trail.startWidth = settings.startWidth;
  trail.endWidth = settings.endWidth;
  trail.startColor = brighten(start, brightness);
  trail.endColor = brighten(end, brightness);
  trail.widthEasing = easings[settings.widthEasing];
  trail.colorEasing = easings[settings.colorEasing];
  trail.texture = settings.texture === 'none' ? null : pattern;
  trail.textureMode = settings.texture === 'tile' ? 'tile' : 'stretch';
  trail.tileLength = settings.tileLength;
  trail.emitting = settings.emitting;
}
