import { PNG } from 'pngjs';
import fs from 'fs';

const buf = fs.readFileSync('/tmp/claude-1000/-home-storm-projects-backup-forge/c3f54885-88d7-4b04-a5ed-b8b7fcc70d8c/scratchpad/canvas-only.png');
const png = PNG.sync.read(buf);
const { width: w, height: h, data } = png;

function getPixel(x, y) {
  const idx = (y * w + x) * 4;
  return [data[idx], data[idx+1], data[idx+2], data[idx+3]];
}

// dump histogram in region y:100-160 x:0-260 (Difficulty row area)
const counts = new Map();
for (let y=100;y<170;y++){
  for(let x=0;x<270;x++){
    const p=getPixel(x,y);
    if (p[3]<50) continue;
    const key = `${p[0]},${p[1]},${p[2]}`;
    counts.set(key,(counts.get(key)||0)+1);
  }
}
console.log([...counts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,15));

// also region y:30-70 x:0-260 (Mute row)
const counts2 = new Map();
for (let y=30;y<70;y++){
  for(let x=0;x<260;x++){
    const p=getPixel(x,y);
    if (p[3]<50) continue;
    const key = `${p[0]},${p[1]},${p[2]}`;
    counts2.set(key,(counts2.get(key)||0)+1);
  }
}
console.log('MUTE ROW', [...counts2.entries()].sort((a,b)=>b[1]-a[1]).slice(0,15));
