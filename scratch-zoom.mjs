import { chromium } from 'playwright-core';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
await page.goto('http://localhost:4000/Forge/demos/ui-toggle/', { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(3000);

await page.evaluate(() => {
  const gameCanvas = document.querySelectorAll('canvas')[0];
  const rect = gameCanvas.getBoundingClientRect();
  const overlay = document.createElement('canvas');
  overlay.width = gameCanvas.width;
  overlay.height = gameCanvas.height;
  overlay.style.position = 'absolute';
  overlay.style.left = rect.left + 'px';
  overlay.style.top = rect.top + 'px';
  overlay.style.width = rect.width + 'px';
  overlay.style.height = rect.height + 'px';
  overlay.style.pointerEvents = 'none';
  overlay.style.zIndex = 999999;
  document.body.appendChild(overlay);
  const ctx = overlay.getContext('2d');
  ctx.strokeStyle = 'red';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 130);
  ctx.lineTo(overlay.width, 130);
  ctx.stroke();
});

await page.waitForTimeout(200);
await page.screenshot({
  path: '/tmp/claude-1000/-home-storm-projects-backup-forge/c3f54885-88d7-4b04-a5ed-b8b7fcc70d8c/scratchpad/ui-toggle-zoom.png',
  clip: { x: 50, y: 320, width: 300, height: 60 },
});

await browser.close();
console.log('done');
