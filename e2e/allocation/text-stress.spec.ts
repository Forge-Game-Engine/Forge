import { expect, test } from '@playwright/test';
import type { TextStressSceneHandle } from '../fixtures/scenes/text-stress.js';
import {
  ecsAllocators,
  frameClockAllocators,
  queryDestructuringAllocators,
  renderSystemAllocators,
  textAllocators,
  transformSystemAllocators,
} from './allow-list.js';
import {
  expectNoUnexpectedAllocations,
  measureSteadyStateAllocations,
} from './measure-allocations.js';

test('the text stress scene allocates nothing beyond its allow-list in steady state', async ({
  page,
}) => {
  const report = await measureSteadyStateAllocations(page, {
    scene: 'text-stress',
    allowList: [
      ...frameClockAllocators,
      ...ecsAllocators,
      ...queryDestructuringAllocators,
      ...transformSystemAllocators,
      ...renderSystemAllocators,
      ...textAllocators,
    ],
  });

  await test.step('check the scene has its texts and counters', async () => {
    const { textCount, counterCount } = await page.evaluate(() => {
      const scene = window.__forgeTestHooks as unknown as TextStressSceneHandle;

      return { textCount: scene.textCount, counterCount: scene.counterCount };
    });

    expect(textCount).toBeGreaterThan(0);
    expect(counterCount).toBeGreaterThan(0);
  });

  expectNoUnexpectedAllocations(report);
});
