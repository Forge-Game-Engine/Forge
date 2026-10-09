import { expect, test } from '@playwright/test';
import type { SpriteStressSceneHandle } from '../fixtures/scenes/sprite-stress.js';
import {
  ecsAllocators,
  frameClockAllocators,
  queryDestructuringAllocators,
  renderSystemAllocators,
  transformSystemAllocators,
} from './allow-list.js';
import {
  expectNoUnexpectedAllocations,
  measureSteadyStateAllocations,
} from './measure-allocations.js';

test('the sprite stress scene allocates nothing beyond its allow-list in steady state', async ({
  page,
}) => {
  const report = await measureSteadyStateAllocations(page, {
    scene: 'sprite-stress',
    allowList: [
      ...frameClockAllocators,
      ...ecsAllocators,
      ...queryDestructuringAllocators,
      ...transformSystemAllocators,
      ...renderSystemAllocators,
    ],
  });

  await test.step('check the scene spawned every sprite', async () => {
    const { spriteCount, maxSpriteCount } = await page.evaluate(() => {
      const scene =
        window.__forgeTestHooks as unknown as SpriteStressSceneHandle;

      return {
        spriteCount: scene.spriteCount,
        maxSpriteCount: scene.maxSpriteCount,
      };
    });

    expect(spriteCount).toBe(maxSpriteCount);
  });

  expectNoUnexpectedAllocations(report);
});
