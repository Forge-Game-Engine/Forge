import { EcsWorld } from '@forge-game-engine/forge/ecs';
import { createPanel, UiAnchor } from '@forge-game-engine/forge/ui';
import { liveMotionId } from './_live-motion.component';
import { DemoSprites } from './_load-demo-sprites';

export interface WindowFrame {
  windowPanel: number;
  content: number;
}

/**
 * Creates the window panel (whose size (`x`/`y`)/`anchoredPosition`
 * `createLiveMotionEcsSystem` oscillates every frame - see
 * `_live-motion.system.ts`) and, nested inside it, the `stretchAll` content
 * panel that hosts the rest of the options menu.
 * @returns The window panel's and content panel's entity ids.
 */
export function createWindowFrame(
  world: EcsWorld,
  canvas: number,
  sprites: DemoSprites,
): WindowFrame {
  const windowPanel = createPanel(world, canvas, {
    anchor: UiAnchor.center({ x: 740, y: 480 }),
    anchoredPosition: { x: 0, y: 0 },
    sprite: sprites.frame,
  });

  world.addComponent(windowPanel, liveMotionId, {
    minWidth: 480,
    maxWidth: 1000,
    widthPeriodSeconds: 7,
    minHeight: 340,
    maxHeight: 620,
    heightPeriodSeconds: 5,
    minX: -220,
    maxX: 220,
    xPeriodSeconds: 9,
    minY: -120,
    maxY: 120,
    yPeriodSeconds: 6,
    elapsedSeconds: 0,
  });

  const content = createPanel(world, windowPanel, {
    anchor: UiAnchor.stretchAll({ x: -48, y: -48 }),
    anchoredPosition: { x: 0, y: 0 },
    sprite: sprites.content,
  });

  return { windowPanel, content };
}
