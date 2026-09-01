import { PNG } from 'pngjs';
import fs from 'fs';

const buf = fs.readFileSync('/tmp/claude-1000/-home-storm-projects-backup-forge/c3f54885-88d7-4b04-a5ed-b8b7fcc70d8c/scratchpad/canvas-only.png');
const png = PNG.sync.read(buf);
const { width: w, height: h, data } = png;

function getPixel(x, y) {
  const idx = (y * w + x) * 4;
  return [data[idx], data[idx+1], data[idx+2], data[idx+3]];
}

// box grey color ~ (217,217,224), tolerance
function isBoxGrey(p) {
  if (p[3] < 100) return false;
  const [r,g,b] = p;
  return r > 190 && r < 235 && Math.abs(r-g) < 8 && (b-r) > -5 && (b-r) < 20;
}

const rows = [];
for (let y = 0; y < h; y++) {
  let minX=-1, maxX=-1, count=0;
  for (let x=0;x<w;x++){
    const p=getPixel(x,y);
    if (isBoxGrey(p)) { if(minX===-1)minX=x; maxX=x; count++; }
  }
  if (count>0) rows.push({y,minX,maxX,count});
}
const bands=[];
let cur=null;
for(const r of rows){
  if(cur && r.y-cur.end<=2){cur.end=r.y; cur.rows.push(r);} else {cur={start:r.y,end:r.y,rows:[r]}; bands.push(cur);}
}
for(const b of bands){
  const minX=Math.min(...b.rows.map(r=>r.minX));
  const maxX=Math.max(...b.rows.map(r=>r.maxX));
  console.log(`box band y:[${b.start},${b.end}] center=${(b.start+b.end)/2} x:[${minX},${maxX}]`);
}
