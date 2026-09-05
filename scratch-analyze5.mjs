import { PNG } from 'pngjs';
import fs from 'fs';

const buf = fs.readFileSync('/tmp/claude-1000/-home-storm-projects-backup-forge/c3f54885-88d7-4b04-a5ed-b8b7fcc70d8c/scratchpad/canvas-only.png');
const png = PNG.sync.read(buf);
const { width: w, height: h, data } = png;

function getPixel(x, y) {
  const idx = (y * w + x) * 4;
  return [data[idx], data[idx+1], data[idx+2], data[idx+3]];
}

function near(p, target, tol) {
  return Math.abs(p[0]-target[0])<=tol && Math.abs(p[1]-target[1])<=tol && Math.abs(p[2]-target[2])<=tol && p[3]>50;
}

function scan(predicate, xRange, yRange, label) {
  let minX=Infinity,maxX=-1,minY=Infinity,maxY=-1,count=0;
  for(let y=yRange[0];y<yRange[1];y++){
    for(let x=xRange[0];x<xRange[1];x++){
      const p=getPixel(x,y);
      if(predicate(p)){
        if(x<minX)minX=x; if(x>maxX)maxX=x;
        if(y<minY)minY=y; if(y>maxY)maxY=y;
        count++;
      }
    }
  }
  console.log(`${label}: x[${minX},${maxX}] y[${minY},${maxY}] centerY=${(minY+maxY)/2} count=${count}`);
  return {minX,maxX,minY,maxY};
}

// white text, near Mute row (y 0-100), x 0-260
scan(p=>near(p,[255,255,255],25), [0,260],[0,100], 'MUTE text');
// grey box near Mute row
scan(p=>near(p,[217,217,224],10), [0,260],[0,100], 'MUTE box');

// Difficulty row (y 100-170)
scan(p=>near(p,[255,255,255],25), [0,270],[95,170], 'DIFFICULTY text');
scan(p=>near(p,[217,217,224],10), [0,270],[95,170], 'DIFFICULTY box (checkboxes)');
