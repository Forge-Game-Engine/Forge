import { expect, test } from '@playwright/test';
import type { UiStressSceneHandle } from '../fixtures/scenes/ui-stress.js';
import {
  ecsAllocators,
  frameClockAllocators,
  queryDestructuringAllocators,
  renderSystemAllocators,
  textAllocators,
  transformSystemAllocators,
  uiAllocators,
} from './allow-list.js';
import {
  expectNoUnexpectedAllocations,
  measureSteadyStateAllocations,
} from './measure-allocations.js';

test('the UI stress scene allocates nothing beyond its allow-list in steady state', async ({
  page,
}) => {
  const report = await measureSteadyStateAllocations(page, {
    scene: 'ui-stress',
    allowList: [
      ...frameClockAllocators,
      ...ecsAllocators,
      ...queryDestructuringAllocators,
      ...transformSystemAllocators,
      ...renderSystemAllocators,
      ...textAllocators,
      ...uiAllocators,
    ],
  });

  await test.step('check the scene spawned every panel', async () => {
    const { panelCount, maxPanelCount } = await page.evaluate(() => {
      const scene = window.__forgeTestHooks as unknown as UiStressSceneHandle;

      return {
        panelCount: scene.panelCount,
        maxPanelCount: scene.maxPanelCount,
      };
    });

    expect(panelCount).toBe(maxPanelCount);
  });

  expectNoUnexpectedAllocations(report);
});
