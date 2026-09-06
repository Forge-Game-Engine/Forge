import { chromium } from 'playwright-core';
import fs from 'fs';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto('http://localhost:4000/Forge/demos/ui-toggle/', { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(3000);

const data = await page.evaluate(() => {
  return new Promise((resolve) => {
    const c = document.querySelectorAll('canvas')[0];
    const gl = c.getContext('webgl2');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const w = c.width, h = c.height;
        const pixels = new Uint8Array(w * h * 4);
        gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        resolve({ w, h, pixels: Array.from(pixels) });
      });
    });
  });
});

const { w, h, pixels } = data;
const px = new Uint8Array(pixels);

function getPixel(x, yTop) {
  const yGl = h - 1 - yTop;
  const idx = (yGl * w + x) * 4;
  return [px[idx], px[idx+1], px[idx+2], px[idx+3]];
}

// print histogram of unique-ish colors sampled
const counts = new Map();
for (let y=0;y<h;y+=3){
  for(let x=0;x<w;x+=3){
    const p=getPixel(x,y);
    const key = `${Math.round(p[0]/17)},${Math.round(p[1]/17)},${Math.round(p[2]/17)},${p[3]>0?1:0}`;
    counts.set(key,(counts.get(key)||0)+1);
  }
}
const sorted = [...counts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,20);
console.log('canvas',w,h);
console.log(sorted);

fs.writeFileSync('/tmp/claude-1000/-home-storm-projects-backup-forge/c3f54885-88d7-4b04-a5ed-b8b7fcc70d8c/scratchpad/pixel-dump.json', JSON.stringify({w,h,pixels:Array.from(px)}));
await browser.close();
