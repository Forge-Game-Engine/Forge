#pragma forge name(spriteMaskVertex)

// The per-instance mask data `maskInstanceDataSegment` binds, in the same
// Y-down world space as the quad's own instance data.
in vec4 a_instanceMaskClip;    // Clip rect: min.xy, max.xy
in vec4 a_instanceMaskAxes;    // World offset -> mask coordinates, by row
in vec2 a_instanceMaskOrigin;  // The shape mask's center
in vec4 a_instanceMaskShape;   // Mode (0 none, 1 linear, 2 radial; +3 when clipped), then its parameters

out vec4 v_maskClipDistance;
out vec2 v_maskCoord;
flat out vec4 v_maskShape;

// Forwards a vertex's mask inputs to `spriteMaskCoverage` (the `spriteMask`
// include). Both are affine in the vertex's world position, so they
// interpolate exactly across the quad.
void forwardSpriteMask(vec2 world) {
  v_maskClipDistance = vec4(
    world - a_instanceMaskClip.xy,
    a_instanceMaskClip.zw - world
  );

  vec2 offset = world - a_instanceMaskOrigin;

  v_maskCoord = vec2(
    dot(a_instanceMaskAxes.xy, offset),
    dot(a_instanceMaskAxes.zw, offset)
  );
  v_maskShape = a_instanceMaskShape;
}
