export class AnimationCreator {
  constructor() {}

  // TODO: should this be renamed?
  public getGeometryTexCoords(
    spritesPerColumn: number,
    spritesPerRow: number,
    numFrames: number = spritesPerColumn * spritesPerRow,
  ): Float32Array[] {
    const texCoordsArray: Float32Array[] = [];

    for (let i = 0; i < numFrames; i++) {
      // Calculate sprite dimensions in UV space (0-1)
      const spriteUWidth = 1.0 / spritesPerRow;
      const spriteUHeight = 1.0 / spritesPerColumn;

      // Calculate sprite position
      const spriteX = i % spritesPerRow;
      const spriteY = Math.floor(i / spritesPerRow);

      // Calculate UV coordinates for this sprite
      const uLeft = spriteX * spriteUWidth;
      const uRight = uLeft + spriteUWidth;
      const vBottom = spriteY * spriteUHeight;
      const vTop = vBottom + spriteUHeight;

      const texCoords = new Float32Array([
        // Triangle 1
        uLeft,
        vBottom, // bottom-left
        uRight,
        vBottom, // bottom-right
        uLeft,
        vTop, // top-left

        // Triangle 2
        uLeft,
        vTop, // top-left
        uRight,
        vBottom, // bottom-right
        uRight,
        vTop, // top-right
      ]);

      texCoordsArray.push(texCoords);
    }

    return texCoordsArray;
  }
}
