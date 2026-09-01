import { chromium } from 'playwright-core';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto('http://localhost:4000/Forge/demos/ui-toggle/', { waitUntil: 'load', timeout: 60000 });
await page.reload({ waitUntil: 'load' });
await page.waitForTimeout(3000);

const canvas = await page.$('canvas');
const box = await canvas.boundingBox();
console.log('canvas box', JSON.stringify(box));

// Read pixels via the canvas's own webgl context to find checkbox and text row centers.
const result = await page.evaluate(() => {
  const canvases = Array.from(document.querySelectorAll('canvas'));
  const c = canvases[0];
  const gl = c.getContext('webgl2');
  const w = c.width, h = c.height;
  const pixels = new Uint8Array(w * h * 4);
  gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  // gl readback is bottom-up; convert to top-down row index
  function getPixel(x, yTop) {
    const yGl = h - 1 - yTop;
    const idx = (yGl * w + x) * 4;
    return [pixels[idx], pixels[idx+1], pixels[idx+2], pixels[idx+3]];
  }
  return { w, h, sample: getPixel(10,10) };
});
console.log(JSON.stringify(result));

await page.screenshot({ path: '/tmp/claude-1000/-home-storm-projects-backup-forge/c3f54885-88d7-4b04-a5ed-b8b7fcc70d8c/scratchpad/ui-toggle2.png' });
await browser.close();
