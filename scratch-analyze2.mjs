import { chromium } from 'playwright-core';
import { PNG } from 'pngjs';
import fs from 'fs';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto('http://localhost:4000/Forge/demos/ui-toggle/', { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(3000);

const canvas = await page.$('canvas');
const buf = await canvas.screenshot();
fs.writeFileSync('/tmp/claude-1000/-home-storm-projects-backup-forge/c3f54885-88d7-4b04-a5ed-b8b7fcc70d8c/scratchpad/canvas-only.png', buf);

const png = PNG.sync.read(buf);
const { width: w, height: h, data } = png;
console.log('canvas screenshot size', w, h);

function getPixel(x, y) {
  const idx = (y * w + x) * 4;
  return [data[idx], data[idx+1], data[idx+2], data[idx+3]];
}

function isWhiteText(p) {
  return p[3] > 100 && p[0] > 200 && p[1] > 200 && p[2] > 200;
}

// full scan for white text rows, recording x extents per row
const rows = [];
for (let y = 0; y < h; y++) {
  let minX = -1, maxX = -1, count = 0;
  for (let x = 0; x < w; x++) {
    const p = getPixel(x, y);
    if (isWhiteText(p)) {
      if (minX === -1) minX = x;
      maxX = x;
      count++;
    }
  }
  if (count > 0) rows.push({ y, minX, maxX, count });
}

// group into bands by contiguous y with gap tolerance
const bands = [];
let cur = null;
for (const r of rows) {
  if (cur && r.y - cur.end <= 2) {
    cur.end = r.y;
    cur.rows.push(r);
  } else {
    cur = { start: r.y, end: r.y, rows: [r] };
    bands.push(cur);
  }
}
for (const b of bands) {
  const minX = Math.min(...b.rows.map(r=>r.minX));
  const maxX = Math.max(...b.rows.map(r=>r.maxX));
  console.log(`text band y:[${b.start},${b.end}] center=${(b.start+b.end)/2} x:[${minX},${maxX}]`);
}
await browser.close();
