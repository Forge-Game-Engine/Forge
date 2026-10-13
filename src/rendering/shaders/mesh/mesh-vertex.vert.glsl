#pragma forge name(meshVertex)

// Set by the render system for each mesh it draws (see `MeshMaterial`); a
// mesh material can't set them. Unlike the sprite pipeline's instance data,
// everything here is in the engine's Y-up world.
uniform mat3 u_model;          // Local -> world: the entity's world position, rotation and scale
uniform mat3 u_viewProjection; // World -> clip space, for the camera being drawn
uniform vec4 u_maskClip;       // The masks' clip rect: min.xy, max.xy
uniform vec4 u_maskAxes;       // World offset -> mask coordinates, by row
uniform vec2 u_maskOrigin;     // The shape mask's center
uniform vec4 u_maskShape;      // Mode (0 none, 1 linear, 2 radial; +3 when clipped), then its parameters

out vec4 v_maskClipDistance;
out vec2 v_maskCoord;
flat out vec4 v_maskShape;

// Maps a vertex position from the entity's local space into the world.
vec2 meshWorldPosition(vec2 localPosition) {
  // Matrix * vector: `u_model` is built for column vectors (see
  // `Matrix3x3.translate`).
  return (u_model * vec3(localPosition, 1.0)).xy;
}

// Projects a world position into clip space for the camera being drawn.
vec4 meshClipPosition(vec2 worldPosition) {
  return vec4((u_viewProjection * vec3(worldPosition, 1.0)).xy, 0.0, 1.0);
}

// Forwards a vertex's mask inputs to `maskCoverage` (the `mask` include).
// Both are affine in the vertex's world position, so they interpolate
// exactly across each triangle.
void forwardMeshMask(vec2 worldPosition) {
  v_maskClipDistance = vec4(
    worldPosition - u_maskClip.xy,
    u_maskClip.zw - worldPosition
  );

  vec2 offset = worldPosition - u_maskOrigin;

  v_maskCoord = vec2(dot(u_maskAxes.xy, offset), dot(u_maskAxes.zw, offset));
  v_maskShape = u_maskShape;
}
