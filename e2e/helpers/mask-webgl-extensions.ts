import type { Page } from '@playwright/test';

/**
 * Makes the page's WebGL contexts report the named extensions as
 * unsupported: `getExtension` returns `null` for them and
 * `getSupportedExtensions` leaves them out. This runs the engine's
 * fallback for a missing extension (standard depth without
 * `EXT_clip_control`, separate draws without `WEBGL_multi_draw`, LDR render
 * targets without `EXT_color_buffer_float`) on a browser that has it, with
 * no test-only option in the engine.
 *
 * Call it before `page.goto`: it installs an init script, which runs before
 * any of the page's own scripts in every document the page loads.
 * @param page - The page whose contexts lose the extensions.
 * @param extensionNames - The extensions to hide, matched without regard to
 * case, as WebGL matches them.
 */
export async function maskWebGlExtensions(
  page: Page,
  extensionNames: readonly string[],
): Promise<void> {
  await page.addInitScript(
    (names: string[]) => {
      const masked = new Set(names.map((name) => name.toLowerCase()));
      const prototypes = [
        WebGLRenderingContext.prototype,
        WebGL2RenderingContext.prototype,
      ];

      for (const prototype of prototypes) {
        // The originals, read once so the wrappers below call through to
        // the browser's own implementations.
        const getExtension: (
          this: WebGLRenderingContextBase,
          name: string,
        ) => unknown = Reflect.get(prototype, 'getExtension');
        const getSupportedExtensions: (
          this: WebGLRenderingContextBase,
        ) => string[] | null = Reflect.get(prototype, 'getSupportedExtensions');

        Object.defineProperty(prototype, 'getExtension', {
          configurable: true,
          writable: true,
          value(this: WebGLRenderingContextBase, name: string): unknown {
            return masked.has(name.toLowerCase())
              ? null
              : getExtension.call(this, name);
          },
        });

        Object.defineProperty(prototype, 'getSupportedExtensions', {
          configurable: true,
          writable: true,
          value(this: WebGLRenderingContextBase): string[] | null {
            const supported = getSupportedExtensions.call(this);

            return (
              supported?.filter((name) => !masked.has(name.toLowerCase())) ??
              null
            );
          },
        });
      }
    },
    [...extensionNames],
  );
}
