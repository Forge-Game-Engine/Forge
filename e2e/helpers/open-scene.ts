import type { Page } from '@playwright/test';

/**
 * Opens a scene in the harness and waits until it's ready, failing with the
 * scene's own error if it threw while loading, rather than with a bare
 * timeout.
 * @param page - The page to load the scene in.
 * @param scene - The scene's name: a file in `e2e/fixtures/scenes/`, or
 * `golden/<name>` for one in `e2e/golden/scenes/`.
 * @param parameters - Extra query parameters the scene reads, if any.
 */
export async function openScene(
  page: Page,
  scene: string,
  parameters: Record<string, string> = {},
): Promise<void> {
  const pageErrors: Error[] = [];

  page.on('pageerror', (error) => pageErrors.push(error));

  const query = new URLSearchParams({ scene, ...parameters });

  await page.goto(`/?${query.toString()}`);

  try {
    await page.waitForFunction(() => window.__forgeTestHooks !== undefined);
  } catch (error) {
    throw pageErrors[0] ?? error;
  }
}

/**
 * Advances the open scene by `frames` steps, each with the scene's default
 * delta.
 * @param page - The page holding the scene.
 * @param frames - How many frames to step.
 */
export async function stepScene(page: Page, frames: number): Promise<void> {
  await page.evaluate((frameCount) => {
    const scene = window.__forgeTestHooks;

    if (!scene) {
      throw new Error('No scene is loaded.');
    }

    for (let i = 0; i < frameCount; i++) {
      scene.step();
    }
  }, frames);
}
