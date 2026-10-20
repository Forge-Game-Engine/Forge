#version 300 es
#pragma forge name(tilemap.vert)
#pragma forge include(meshVertex)

in vec2 a_position; // The quad corner, in the layer's local space
in vec2 a_texCoord; // Where the corner samples the atlas, in UV (Y-down)
in vec4 a_texRect;  // The tile's region: offset (xy) and size (zw), in UV

// How far, in UV, each tile samples inside its region on each side: half a
// texel of a texture whose wrap is 'clamp', so neither nearest filtering at
// a fractional camera position nor linear filtering reaches the next tile
// in the atlas, and zero for one that repeats.
uniform vec2 u_regionInset;

out vec2 v_texCoord;
// The rect to clamp `v_texCoord` to before sampling, as min (xy) and max
// (zw). highp, since half a texel is below mediump's step on large textures.
flat out highp vec4 v_texBounds;

void main() {
  vec2 world = meshWorldPosition(a_position);

  gl_Position = meshClipPosition(world);
  forwardMeshMask(world);
  v_texCoord = a_texCoord;

  // Inset around the rect's center, so a region narrower than a texel
  // collapses to its center line instead of giving `clamp` a minimum above
  // its maximum. Every vertex of a tile carries the same rect, so it
  // doesn't matter which one is the provoking vertex.
  vec2 halfSize = a_texRect.zw * 0.5;
  vec2 center = a_texRect.xy + halfSize;
  vec2 boundsHalfSize = max(halfSize - u_regionInset, vec2(0.0));

  v_texBounds = vec4(center - boundsHalfSize, center + boundsHalfSize);
}
