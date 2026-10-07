import { expect, test } from '@playwright/test';
import type {
  InkSpan,
  RichTextTagsSceneHandle,
} from '../fixtures/scenes/rich-text-tags.js';

type Hooks = RichTextTagsSceneHandle;

const width = (span: InkSpan): number => span.right - span.left + 1;

test.describe('rich text tags', () => {
  test.beforeEach(async ({ page }) => {
    let pageError: Error | undefined;

    page.once('pageerror', (error) => {
      pageError = error;
    });

    await page.goto('/?scene=rich-text-tags');

    try {
      await page.waitForFunction(() => Boolean(window.__forgeTestHooks));
    } catch (timeoutError) {
      throw pageError ?? timeoutError;
    }
  });

  test('draws a color tag in its color, laid out exactly like the untagged text', async ({
    page,
  }) => {
    const { untagged, tagged } = await page.evaluate(() => {
      const scene = window.__forgeTestHooks as unknown as Hooks;

      scene.setText('AAA');
      scene.step();
      const untaggedSpans = scene.measureInkSpans();

      scene.setText('A<color=#00ff00>A</color>A');
      scene.step();

      return { untagged: untaggedSpans, tagged: scene.measureInkSpans() };
    });

    expect(untagged.map((span) => span.color)).toEqual(['red', 'red', 'red']);
    expect(tagged.map((span) => span.color)).toEqual(['red', 'green', 'red']);

    // The tag changes the middle glyph's color, never where any glyph sits.
    for (let i = 0; i < 3; i++) {
      expect(Math.abs(tagged[i].left - untagged[i].left)).toBeLessThanOrEqual(
        1,
      );
      expect(Math.abs(tagged[i].right - untagged[i].right)).toBeLessThanOrEqual(
        1,
      );
    }
  });

  test('draws a bold glyph wider and pushes the glyphs after it along', async ({
    page,
  }) => {
    const { regular, bold, boldWidening } = await page.evaluate(() => {
      const scene = window.__forgeTestHooks as unknown as Hooks;

      scene.setText('AAA');
      scene.step();
      const regularSpans = scene.measureInkSpans();

      scene.setText('<b>A</b>AA');
      scene.step();

      return {
        regular: regularSpans,
        bold: scene.measureInkSpans(),
        boldWidening: scene.boldWidening,
      };
    });

    expect(regular).toHaveLength(3);
    expect(bold).toHaveLength(3);

    // Pixel quantization and anti-aliased edges allow about a pixel either
    // way; the widening itself is several pixels.
    const tolerance = 1.5;

    expect(boldWidening).toBeGreaterThan(3);
    expect(width(bold[0]) - width(regular[0])).toBeGreaterThan(
      boldWidening - tolerance,
    );
    expect(width(bold[0]) - width(regular[0])).toBeLessThan(
      boldWidening + tolerance,
    );

    // The bold glyph's advance grew by the same widening, so the regular
    // glyphs after it keep their width and move right by it.
    expect(Math.abs(width(bold[1]) - width(regular[1]))).toBeLessThanOrEqual(1);
    expect(bold[1].left - regular[1].left).toBeGreaterThan(
      boldWidening - tolerance,
    );
    expect(bold[1].left - regular[1].left).toBeLessThan(
      boldWidening + tolerance,
    );
  });
});
