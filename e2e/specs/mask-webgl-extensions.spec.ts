import { expect, test } from '@playwright/test';
import type { HdrTintBloomSceneHandle } from '../fixtures/scenes/hdr-tint-bloom.js';
import { maskWebGlExtensions } from '../helpers/mask-webgl-extensions.js';
import { openScene } from '../helpers/open-scene.js';

// See `translucent-ui-compositing.spec.ts` for why the hooks are cast inline
// rather than declared per scene.
type Hooks = HdrTintBloomSceneHandle;

const readRenderTargetFormat = (
  page: import('@playwright/test').Page,
): Promise<string> =>
  page.evaluate(() => {
    const scene = window.__forgeTestHooks as unknown as Hooks;

    scene.step();

    return scene.measure().format;
  });

const readExtensionSupport = (
  page: import('@playwright/test').Page,
  name: string,
): Promise<{ extension: boolean; listed: boolean }> =>
  page.evaluate((extensionName) => {
    const gl = document.createElement('canvas').getContext('webgl2');

    if (!gl) {
      throw new Error('WebGL2 is not available');
    }

    return {
      extension: gl.getExtension(extensionName) !== null,
      listed: (gl.getSupportedExtensions() ?? []).includes(extensionName),
    };
  }, name);

test.describe('masking a WebGL extension', () => {
  test('an HDR camera renders in HDR when the browser has float color buffers', async ({
    page,
  }) => {
    await openScene(page, 'hdr-tint-bloom');

    expect(await readExtensionSupport(page, 'EXT_color_buffer_float')).toEqual({
      extension: true,
      listed: true,
    });
    expect(await readRenderTargetFormat(page)).toBe('hdr');
  });

  test('hides the extension, and the engine takes its fallback', async ({
    page,
  }) => {
    await maskWebGlExtensions(page, ['ext_COLOR_buffer_float']);
    await openScene(page, 'hdr-tint-bloom');

    expect(await readExtensionSupport(page, 'EXT_color_buffer_float')).toEqual({
      extension: false,
      listed: false,
    });
    expect(await readRenderTargetFormat(page)).toBe('ldr');
  });

  test('leaves the extensions it was not given', async ({ page }) => {
    await maskWebGlExtensions(page, ['WEBGL_multi_draw']);
    await openScene(page, 'hdr-tint-bloom');

    expect(await readExtensionSupport(page, 'EXT_color_buffer_float')).toEqual({
      extension: true,
      listed: true,
    });
  });
});
