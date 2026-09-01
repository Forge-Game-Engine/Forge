import { PNG } from 'pngjs';
import fs from 'fs';

const buf = fs.readFileSync('/tmp/claude-1000/-home-storm-projects-backup-forge/c3f54885-88d7-4b04-a5ed-b8b7fcc70d8c/scratchpad/canvas-only.png');
const png = PNG.sync.read(buf);
const { width: w, height: h, data } = png;

function getPixel(x, y) {
  const idx = (y * w + x) * 4;
  return [data[idx], data[idx+1], data[idx+2], data[idx+3]];
}

function scanExact(target, xRange, yRange, minRunPerRow, label) {
  const rowCounts = [];
  for (let y=yRange[0]; y<yRange[1]; y++){
    let count=0, minX=Infinity, maxX=-1;
    for(let x=xRange[0]; x<xRange[1]; x++){
      const p=getPixel(x,y);
      if (p[0]===target[0]&&p[1]===target[1]&&p[2]===target[2]&&p[3]>200){
        count++; if(x<minX)minX=x; if(x>maxX)maxX=x;
      }
    }
    if (count>=minRunPerRow) rowCounts.push({y,count,minX,maxX});
  }
  if (rowCounts.length===0){ console.log(label,'no rows'); return; }
  const minY=rowCounts[0].y, maxY=rowCounts[rowCounts.length-1].y;
  const minX=Math.min(...rowCounts.map(r=>r.minX));
  const maxX=Math.max(...rowCounts.map(r=>r.maxX));
  console.log(`${label}: y[${minY},${maxY}] centerY=${(minY+maxY)/2} x[${minX},${maxX}] rows=${rowCounts.length}`);
}

// DIFFICULTY caption text (x roughly 0-130 canvas, based on scale calc), y 100-170
scanExact([255,255,255], [0,130], [95,170], 1, 'DIFFICULTY caption text');
// checkboxes row (x 130-260), y 100-170, require solid run (box interior wide ~18px so minRun 8)
scanExact([217,217,224], [130,260], [95,170], 8, 'DIFFICULTY checkboxes (all 3)');

// individually per checkbox based on expected x ranges
scanExact([217,217,224], [130,155], [95,170], 5, 'checkbox 1 (Easy)');
scanExact([217,217,224], [180,205], [95,170], 5, 'checkbox 2 (Medium)');
scanExact([217,217,224], [230,255], [95,170], 5, 'checkbox 3 (Hard)');
