import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  Color,
  createAtlasSprite,
  TextureAtlas,
} from '@forge-game-engine/forge/rendering';
import { createPanel, UiAnchor } from '@forge-game-engine/forge/ui';

// The panel region's border art is 26 texels deep on every side of its
// 96 x 96 texels.
const borderInset = 26;
const panelSize = { x: 400, y: 140 };
const parchment = new Color(0.98, 0.91, 0.76, 1);

// The icons are drawn at three times their art's size, in reference pixels.
const iconScale = 3;
const iconGap = 50;
const icons = ['cannon', 'cannon_ball', 'plank_2'];

/**
 * Creates a UI panel nine-sliced from the atlas's `panel` region, holding a
 * row of icons drawn from other regions of the same atlas. The panel is
 * resized by its rect, and its corners keep their size.
 * @param world - The world to add the panel to.
 * @param canvas - The UI canvas to put it on.
 * @param atlas - The atlas to draw it from.
 * @param renderLayer - The category of the UI canvas's camera.
 */
export function createInventoryPanel(
  world: EcsWorld,
  canvas: number,
  atlas: TextureAtlas,
  renderLayer: number,
): void {
  const panel = createPanel(world, canvas, {
    anchor: UiAnchor.topLeft(panelSize),
    anchoredPosition: { x: 24, y: 24 },
    sprite: {
      // Only an untrimmed region can be nine-sliced; the atlas was packed
      // with trimming off for this one.
      ...createAtlasSprite(atlas, 'panel', {
        pixelsPerUnit: 1,
        slices: {
          left: borderInset,
          right: borderInset,
          top: borderInset,
          bottom: borderInset,
        },
      }),
      tintColor: parchment,
      category: renderLayer,
    },
  });

  let x = iconGap;

  for (const name of icons) {
    const { sourceSize } = atlas.getRegion(name);
    const size = {
      x: sourceSize.x * iconScale,
      y: sourceSize.y * iconScale,
    };

    createPanel(world, panel, {
      anchor: UiAnchor.middleLeft(size),
      anchoredPosition: { x, y: 0 },
      sprite: {
        ...createAtlasSprite(atlas, name),
        category: renderLayer,
      },
    });

    x += size.x + iconGap;
  }
}
