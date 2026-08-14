#version 300 es

#pragma forge name(msdf.frag)

precision mediump float;

uniform sampler2D u_atlas;
uniform float u_distanceRange;   // FontAtlasData.distanceRange
uniform float u_atlasSize;       // FontAtlasData.atlasSize.height (assumes square texels)

in vec2 v_texCoord;
in vec4 v_tint;
in vec4 v_outlineColor;
in float v_outlineWidth;
in vec4 v_shadowColor;
in vec2 v_shadowOffset;
in float v_shadowSoftness;
out vec4 fragColor;

float median(float r, float g, float b) {
  return max(min(r, g), min(max(r, g), b));
}

// Standard "top over bottom" alpha compositing, both sides straight
// (non-premultiplied) alpha - matches the layout `fragColor` itself must be
// in, since the render pipeline blends with `gl.blendFunc(SRC_ALPHA,
// ONE_MINUS_SRC_ALPHA)`.
vec4 compositeOver(vec4 top, vec4 bottom) {
  float outAlpha = top.a + bottom.a * (1.0 - top.a);

  if (outAlpha <= 0.0) {
    return vec4(0.0);
  }

  vec3 outColor = (top.rgb * top.a + bottom.rgb * bottom.a * (1.0 - top.a)) / outAlpha;

  return vec4(outColor, outAlpha);
}

void main() {
  vec3 msdf = texture(u_atlas, v_texCoord).rgb;
  float signedDistance = median(msdf.r, msdf.g, msdf.b) - 0.5;

  // Converts the distance field's abstract units into screen pixels so the
  // anti-aliasing band is exactly one screen pixel wide regardless of how
  // much the glyph is scaled - the entire reason MSDF stays crisp at any
  // size. `unitRange` is `u_distanceRange` (in atlas pixels) expressed as a
  // fraction of the 0-1 UV space; `screenTexSize` is how many screen pixels
  // correspond to a full 1.0 UV unit, per axis (the reciprocal of
  // `fwidth(v_texCoord)`, taken per-axis and summed via `dot`, not combined
  // through `length()` first - the two give different, and at non-uniform
  // scale/rotation genuinely different, results). `max(..., 1.0)` keeps the
  // band from collapsing below one screen pixel at small on-screen sizes,
  // which otherwise aliases instead of anti-aliasing.
  vec2 unitRange = vec2(u_distanceRange) / vec2(u_atlasSize);
  vec2 uvPerScreenPx = fwidth(v_texCoord);
  vec2 screenTexSize = vec2(1.0) / uvPerScreenPx;
  float screenPxRange = max(0.5 * dot(unitRange, screenTexSize), 1.0);
  float screenPxDistance = signedDistance * screenPxRange;

  float glyphAlpha = clamp(screenPxDistance + 0.5, 0.0, 1.0);
  vec4 fillLayer = vec4(v_tint.rgb, v_tint.a * glyphAlpha);

  // The distance field only encodes a graded (non-saturated) distance up to
  // `screenPxRange / 2` screen pixels from the glyph's true edge - beyond
  // that, every texel reads the same saturated "fully outside" value
  // (`msdf-atlas-gen`'s `distanceRange` is a finite, encoded range, not an
  // unbounded true distance field). An `outlineWidth`/`shadowOffset` beyond
  // that budget has no real distance data to extend into: naively adding it
  // to `screenPxDistance` would make the *entire* saturated region (i.e.
  // most of the glyph's padding, not just a thin ring near its edge) read as
  // "inside the outline", painting a solid box around each glyph instead of
  // a ring. Capping both to the safe budget keeps them within the region
  // the atlas can faithfully represent - a request beyond the cap still
  // renders the widest/most-offset effect the atlas supports, rather than
  // degrading into a box or sampling into a neighboring glyph's atlas tile.
  float maxSafeEffectDistance = max(screenPxRange * 0.5 - 0.5, 0.0);

  // The outline is the ring between the glyph's own edge and `outlineWidth`
  // screen pixels further out. Gated to exactly `0` alpha (rather than just
  // relying on `outlineWidth` cancelling out below) when disabled: without
  // the gate, at `outlineWidth == 0` this band is identical to `glyphAlpha`
  // itself, which would still visibly blend `v_outlineColor` into the
  // glyph's anti-aliased edge.
  float clampedOutlineWidth = min(v_outlineWidth, maxSafeEffectDistance);
  float outlineCoverage = v_outlineWidth > 0.0
    ? clamp(screenPxDistance + 0.5 + clampedOutlineWidth, 0.0, 1.0)
    : 0.0;
  vec4 outlineLayer = vec4(v_outlineColor.rgb, outlineCoverage);

  // The soft shadow re-samples the distance field at an offset UV (the
  // offset, like `outlineWidth`, is expressed in screen-pixel-range units,
  // so it's converted to UV space the same way `screenPxRange` converts the
  // other direction: `uvPerScreenPx` is how much UV changes per screen
  // pixel). `shadowSoftness` widens the anti-aliasing band around that
  // second sample to blur its edge; `0` leaves it exactly as crisp as the
  // glyph itself, just offset. Zero alpha (the default `shadowColor`) drops
  // out of `compositeOver` with no visible effect, so no separate gate is
  // needed here.
  float shadowOffsetLength = length(v_shadowOffset);
  vec2 clampedShadowOffset = shadowOffsetLength > maxSafeEffectDistance && shadowOffsetLength > 0.0
    ? v_shadowOffset * (maxSafeEffectDistance / shadowOffsetLength)
    : v_shadowOffset;
  vec2 shadowUv = v_texCoord - clampedShadowOffset * uvPerScreenPx;
  vec3 shadowMsdf = texture(u_atlas, shadowUv).rgb;
  float shadowSignedDistance = median(shadowMsdf.r, shadowMsdf.g, shadowMsdf.b) - 0.5;
  float shadowScreenPxDistance = shadowSignedDistance * screenPxRange;
  float shadowSoftness = max(v_shadowSoftness, 1.0);
  float shadowCoverage = clamp(shadowScreenPxDistance / shadowSoftness + 0.5, 0.0, 1.0);
  vec4 shadowLayer = vec4(v_shadowColor.rgb, shadowCoverage * v_shadowColor.a);

  fragColor = compositeOver(fillLayer, compositeOver(outlineLayer, shadowLayer));
}
