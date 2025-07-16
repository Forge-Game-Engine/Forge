import { Geometry } from './geometry';

export interface SpriteSheetConfig {
  spritesPerRow: number;    // Number of sprites horizontally
  spritesPerColumn: number; // Number of sprites vertically
  spriteIndex: number;      // Which sprite to display (0-based index)
}

export function createQuadGeometry(
  gl: WebGL2RenderingContext, 
  spriteConfig?: SpriteSheetConfig
): Geometry {
  const geometry = new Geometry();

  // Vertex positions for 2 triangles (forming a quad)
  const positions = new Float32Array([
    // Triangle 1
    -0.5, -0.5, 0.5, -0.5, -0.5, 0.5,
    // Triangle 2
    -0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
  ]);

  let texCoords: Float32Array;

  if (spriteConfig) {
    // Calculate sprite dimensions in UV space (0-1)
    const spriteUWidth = 1.0 / spriteConfig.spritesPerRow;
    const spriteUHeight = 1.0 / spriteConfig.spritesPerColumn;
    
    // Calculate sprite position
    const spriteIndex = spriteConfig.spriteIndex;
    const spriteX = spriteIndex % spriteConfig.spritesPerRow;
    const spriteY = Math.floor(spriteIndex / spriteConfig.spritesPerRow);
    
    // Calculate UV coordinates for this sprite
    const uLeft = spriteX * spriteUWidth;
    const uRight = uLeft + spriteUWidth;
    const vBottom = spriteY * spriteUHeight;
    const vTop = vBottom + spriteUHeight;

    texCoords = new Float32Array([
      // Triangle 1
      uLeft, vBottom,    // bottom-left
      uRight, vBottom,   // bottom-right  
      uLeft, vTop,       // top-left
      
      // Triangle 2
      uLeft, vTop,       // top-left
      uRight, vBottom,   // bottom-right
      uRight, vTop,      // top-right
    ]);
  } else {
    // Default full texture coordinates
    texCoords = new Float32Array([
      // Triangle 1
      0, 0, 1, 0, 0, 1,
      // Triangle 2
      0, 1, 1, 0, 1, 1,
    ]);
  }

  // Create position buffer
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

  geometry.addAttribute(gl, 'a_position', {
    buffer: positionBuffer,
    size: 2,
  });

  // Create texCoord buffer
  const texCoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

  geometry.addAttribute(gl, 'a_texCoord', {
    buffer: texCoordBuffer,
    size: 2,
  });

  return geometry;
}