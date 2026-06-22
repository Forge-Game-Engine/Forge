import { Vector2 } from '@forge-game-engine/forge/math';
import { Color } from '@forge-game-engine/forge/rendering';
import {
  createUiButton,
  createUiPanel,
  fadeIn,
  fadeOut,
  popIn,
  popOut,
  slideIn,
  slideOut,
} from '@forge-game-engine/forge/ui';
import type { SectionContext, SectionResult } from './_section-context';

const HEIGHT = 150;
const MARGIN = 16;

export function createAnimationSection(ctx: SectionContext): SectionResult {
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

  const target = createUiPanel(world, {
    renderable: panelRenderable,
    rect: { x: 0, y: 36, width: 90, height: 90 },
    parent: section.entity,
    tintColor: new Color(0.25, 0.55, 0.95, 1),
    cornerRadius: 10,
  });

  let faded = false;
  let popped = false;
  let slid = false;

  createUiButton(world, {
    renderable: panelRenderable,
    renderContext,
    font,
    rect: { x: 120, y: 36, width: 100, height: 36 },
    parent: section.entity,
    label: 'Fade',
    labelColor: Color.white,
    cornerRadius: 6,
    onClick: () => {
      faded = !faded;

      if (faded) {
        fadeOut(world, target.entity);
      } else {
        fadeIn(world, target.entity);
      }
    },
  });

  createUiButton(world, {
    renderable: panelRenderable,
    renderContext,
    font,
    rect: { x: 120, y: 80, width: 100, height: 36 },
    parent: section.entity,
    label: 'Pop',
    labelColor: Color.white,
    cornerRadius: 6,
    onClick: () => {
      popped = !popped;

      if (popped) {
        popOut(world, target.entity);
      } else {
        popIn(world, target.entity);
      }
    },
  });

  createUiButton(world, {
    renderable: panelRenderable,
    renderContext,
    font,
    rect: { x: 230, y: 36, width: 100, height: 36 },
    parent: section.entity,
    label: 'Slide',
    labelColor: Color.white,
    cornerRadius: 6,
    onClick: () => {
      slid = !slid;

      if (slid) {
        slideOut(world, target.entity, { direction: 'right', distance: 250 });
      } else {
        slideIn(world, target.entity, { direction: 'right', distance: 250 });
      }
    },
  });

  return { height: HEIGHT, themedRenderables: [] };
}
