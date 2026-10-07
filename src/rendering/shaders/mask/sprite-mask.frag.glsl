#pragma forge name(spriteMask)

// The mask inputs `sprite.vert` forwards for every instance: the distances
// to the four edges of the instance's clip rect, the fragment's position
// in its shape mask's rect (-1 to 1 on each axis) and the shape's
// parameters.
in highp vec4 v_maskClipDistance;
in highp vec2 v_maskCoord;
flat in highp vec4 v_maskShape;

const highp float SPRITE_MASK_TURN = 6.28318530718;

// Coverage of a fragment `distance` inside an edge, anti-aliased over one
// screen pixel (`width` is how much `distance` changes per pixel).
highp float spriteMaskEdge(highp float distance, highp float width) {
  return clamp(distance / max(width, 1e-6) + 0.5, 0.0, 1.0);
}

highp float spriteMaskClipCoverage() {
  highp vec4 width = fwidth(v_maskClipDistance);

  return spriteMaskEdge(v_maskClipDistance.x, width.x) *
    spriteMaskEdge(v_maskClipDistance.y, width.y) *
    spriteMaskEdge(v_maskClipDistance.z, width.z) *
    spriteMaskEdge(v_maskClipDistance.w, width.w);
}

// The sector between `startAngle` and `startAngle + filledSweep`, with
// angles measured in the mask rect's own units (`aspect` is its width over
// its height), so a non-square rect keeps the angles it was authored with.
highp float spriteMaskRadialCoverage(
  highp float startAngle,
  highp float filledSweep,
  highp float aspect
) {
  if (abs(filledSweep) >= SPRITE_MASK_TURN) {
    return 1.0;
  }

  highp vec2 point = vec2(v_maskCoord.x * aspect, v_maskCoord.y);
  highp float direction = filledSweep < 0.0 ? -1.0 : 1.0;
  highp float sweep = abs(filledSweep);
  highp float angle = mod(
    direction * (atan(point.y, point.x) - startAngle),
    SPRITE_MASK_TURN
  );
  // How far inside (positive) or outside the sector the fragment is, in
  // radians to the nearest of its two edges.
  highp float angleInside = angle <= sweep
    ? min(angle, sweep - angle)
    : -min(angle - sweep, SPRITE_MASK_TURN - angle);
  // Turned into an arc length, so it's anti-aliased over a pixel at any
  // distance from the center.
  highp float radius = length(point);

  return spriteMaskEdge(angleInside * radius, length(fwidth(point)));
}

highp float spriteMaskShapeCoverage(highp float mode) {
  if (mode < 0.5) {
    return 1.0;
  }

  highp vec2 width = fwidth(v_maskCoord);
  highp float rectCoverage =
    spriteMaskEdge(1.0 - abs(v_maskCoord.x), width.x) *
    spriteMaskEdge(1.0 - abs(v_maskCoord.y), width.y);

  if (mode < 1.5) {
    // Linear: the edge it reveals from is always -X, turned into place by
    // the mask's axes; `y` is how far the revealed part reaches.
    return rectCoverage * spriteMaskEdge(v_maskShape.y - v_maskCoord.x, width.x);
  }

  return rectCoverage *
    spriteMaskRadialCoverage(v_maskShape.y, v_maskShape.z, v_maskShape.w);
}

// How much of the fragment the masks above the instance (see
// `MaskEcsComponent`) let through, 0 to 1. Every sprite fragment shader
// multiplies its output alpha by it.
float spriteMaskCoverage() {
  // The mode is the shape's (0 none, 1 linear, 2 radial), plus 3 when a
  // rect mask clips the instance. Branching on it is uniform across the
  // quad, since it's flat, so an unmasked quad skips the work.
  highp float mode = v_maskShape.x;

  if (mode < 0.5) {
    return 1.0;
  }

  if (mode < 2.5) {
    return spriteMaskShapeCoverage(mode);
  }

  return spriteMaskClipCoverage() * spriteMaskShapeCoverage(mode - 3.0);
}
