import { expect, test } from '@playwright/test';
import type { ParticlesSceneHandle } from '../fixtures/scenes/particles.js';
import {
  ecsAllocators,
  frameClockAllocators,
  particleAllocators,
  queryDestructuringAllocators,
  renderSystemAllocators,
  transformSystemAllocators,
} from './allow-list.js';
import {
  expectNoUnexpectedAllocations,
  measureSteadyStateAllocations,
} from './measure-allocations.js';

test('the particle scene allocates nothing beyond its allow-list in steady state', async ({
  page,
}) => {
  const report = await measureSteadyStateAllocations(page, {
    scene: 'particles',
    allowList: [
      ...frameClockAllocators,
      ...ecsAllocators,
      ...queryDestructuringAllocators,
      ...transformSystemAllocators,
      ...renderSystemAllocators,
      ...particleAllocators,
    ],
  });

  await test.step('check particles are alive', async () => {
    const particleCount = await page.evaluate(
      () =>
        (window.__forgeTestHooks as unknown as ParticlesSceneHandle)
          .particleCount,
    );

    expect(particleCount).toBeGreaterThan(0);
  });

  expectNoUnexpectedAllocations(report);
});
