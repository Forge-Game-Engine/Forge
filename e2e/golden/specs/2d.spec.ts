import { test } from '@playwright/test';
import { openScene, stepScene } from '../../helpers/open-scene.js';
import { expectGolden, GoldenTolerance } from '../expect-golden.js';

interface GoldenCase {
  /** The scene under `e2e/golden/scenes/`. */
  scene: string;

  /** The reference image's name (default: the scene's). */
  image?: string;

  /** Query parameters the scene reads. */
  parameters?: Record<string, string>;

  /** What the golden covers, for the test title. */
  covers: string;

  /**
   * How many fixed steps to run before capturing. A static scene needs
   * one; UI layout resolves over a few.
   */
  frames: number;

  /** A looser tolerance than the configuration's default, with the reason. */
  tolerance?: GoldenTolerance;
}

// Text is thin, antialiased detail: if SwiftShader rounds coverage at a
// glyph's edge slightly differently, many edge pixels change at once while
// the frame is visibly the same. So edge pixels may differ a little more
// (about 13 grey levels), and on a few more pixels, than in flat-colored
// scenes.
const textTolerance: GoldenTolerance = {
  threshold: 0.05,
  maxDiffPixelRatio: 0.005,
};

const cases: GoldenCase[] = [
  {
    scene: 'sprites',
    covers: 'tint, translucency, emissive maps, flips and nine-slice',
    frames: 1,
  },
  {
    scene: 'text',
    covers: 'text, outline, shadow, rotated and scaled text, rich text',
    frames: 1,
    tolerance: textTolerance,
  },
  {
    scene: 'masks',
    covers: 'rect, linear and radial masks',
    frames: 1,
  },
  {
    scene: 'draw-order',
    covers: 'layers, draw order, behind-parent children, translucent order',
    frames: 1,
  },
  {
    scene: 'ui-controls',
    covers: 'panel, label, button, toggles, slider and progress bars',
    frames: 3,
    tolerance: textTolerance,
  },
  {
    scene: 'terrain',
    covers: 'a terrain mesh with blended border and fill layers',
    frames: 1,
  },
  {
    scene: 'bloom',
    covers: 'HDR tints and emissive maps blooming',
    frames: 1,
  },
  {
    scene: 'blur',
    covers: 'a Gaussian blur over edges, detail and color',
    frames: 1,
  },
  {
    scene: 'tone-mapping',
    image: 'tone-mapping-aces',
    covers: 'ACES tone mapping across eight stops',
    frames: 1,
  },
  {
    scene: 'tone-mapping',
    image: 'tone-mapping-reinhard',
    parameters: { operator: 'reinhard' },
    covers: 'Reinhard tone mapping across eight stops',
    frames: 1,
  },
];

for (const goldenCase of cases) {
  const { scene, parameters, covers, frames, tolerance } = goldenCase;
  const image = goldenCase.image ?? scene;

  test(`${image}: ${covers}`, async ({ page }) => {
    await openScene(page, `golden/${scene}`, parameters);
    await stepScene(page, frames);
    await expectGolden(page, image, tolerance);
  });
}
