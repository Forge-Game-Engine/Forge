#version 300 es

#pragma forge name(msdf-effects.frag)

precision mediump float;

uniform sampler2D u_atlas;
uniform float u_distanceRange;   // FontAtlasData.distanceRange
uniform float u_atlasSize;       // FontAtlasData.atlasSize.height (assumes square texels)

in vec2 v_texCoord;
in vec4 v_outlineColor;
in float v_outlineWidth;
in vec4 v_shadowColor;
in vec2 v_shadowOffset;
in float v_shadowSoftness;
in float v_maxEffectClearance;
in vec2 v_worldPerUv;
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

// Draws a glyph's outline ring and soft shadow/glow, with no fill layer -
// see `msdf-fill.frag` for that half, drawn as a separate, always-later
// pass (see `pushTextRenderCommands` in `glyph-quad.ts`). Splitting the two
// into ordered passes is what lets the outline below drop the same-word
// neighbor clamp `msdf.frag` (this shader's single-pass predecessor) used
// to apply to it: since every glyph's fill in a text entity is now
// guaranteed to draw after every glyph's outline/shadow, one glyph's
// outline can safely reach past a same-word neighbor's own quad - even
// merge with that neighbor's own outline, which is harmless, since outline
// layers are typically the same color and neither one ever ends up on top
// of a fill - without ever painting over that neighbor's fill. Only the
// atlas's own graded-distance encoding budget still bounds the outline.
void main() {
  vec3 msdf = texture(u_atlas, v_texCoord).rgb;
  float signedDistance = median(msdf.r, msdf.g, msdf.b) - 0.5;

  // Converts the distance field's abstract units into screen pixels so the
  // effect's reach is exactly as many *screen* pixels wide as requested
  // regardless of how much the glyph is scaled - see `msdf-fill.frag`/the
  // engine's `text-effects.md` doc for the full derivation.
  vec2 unitRange = vec2(u_distanceRange) / vec2(u_atlasSize);
  vec2 uvPerScreenPx = fwidth(v_texCoord);
  vec2 screenTexSize = vec2(1.0) / uvPerScreenPx;
  float screenPxRange = max(0.5 * dot(unitRange, screenTexSize), 1.0);
  float screenPxDistance = signedDistance * screenPxRange;

  // The atlas's own encoded budget: the distance field only carries graded
  // (non-saturated) data up to roughly `screenPxRange / 2` screen pixels
  // from the glyph's true edge (see `text-effects.md`'s "Choosing a safe
  // range"). Past that, an effect still renders, clamped to the widest
  // value the atlas can faithfully represent, rather than boxing out or
  // producing quantized banding. This is the *only* remaining clamp on the
  // outline below - see this file's doc comment for why the same-word
  // neighbor clamp no longer applies to it.
  float atlasSafeDistance = max(screenPxRange * 0.5 - 0.5, 0.0);

  float clampedOutlineWidth = min(v_outlineWidth, atlasSafeDistance);
  float outlineCoverage = v_outlineWidth > 0.0
    ? clamp(screenPxDistance + 0.5 + clampedOutlineWidth, 0.0, 1.0)
    : 0.0;
  vec4 outlineLayer = vec4(v_outlineColor.rgb, outlineCoverage);

  // The shadow still needs the same-word neighbor clamp, unlike the
  // outline above: it re-samples the distance field at an offset UV, and
  // reaching far enough can leave this glyph's own atlas tile entirely -
  // into the packer's padding gap or a neighboring glyph's unrelated tile -
  // which is a texture-sampling correctness problem, not a draw-order one,
  // so the two-pass split this shader is part of doesn't fix it.
  // `v_maxEffectClearance` is this glyph's own shape-time-computed safe
  // distance (see `GlyphQuad.effectClearance`), in *world* units;
  // `v_worldPerUv` converts it to the same UV space `unitRange` is already
  // in, and the same `screenTexSize` dot-product then carries it the rest
  // of the way to screen pixels, dynamically, at whatever zoom/scale is
  // actually in effect.
  vec2 clearanceInUv = vec2(v_maxEffectClearance) / v_worldPerUv;
  float neighborSafeDistance = max(0.5 * dot(clearanceInUv, screenTexSize), 0.0);
  float maxSafeShadowDistance = min(atlasSafeDistance, neighborSafeDistance);

  float shadowOffsetLength = length(v_shadowOffset);
  vec2 clampedShadowOffset = shadowOffsetLength > maxSafeShadowDistance && shadowOffsetLength > 0.0
    ? v_shadowOffset * (maxSafeShadowDistance / shadowOffsetLength)
    : v_shadowOffset;
  vec2 shadowUv = v_texCoord - clampedShadowOffset * uvPerScreenPx;
  vec3 shadowMsdf = texture(u_atlas, shadowUv).rgb;
  float shadowSignedDistance = median(shadowMsdf.r, shadowMsdf.g, shadowMsdf.b) - 0.5;
  float shadowScreenPxDistance = shadowSignedDistance * screenPxRange;
  float shadowReach = max(min(v_shadowSoftness, maxSafeShadowDistance), 0.001);
  float shadowCoverage = clamp(1.0 - (-shadowScreenPxDistance) / shadowReach, 0.0, 1.0);
  vec4 shadowLayer = vec4(v_shadowColor.rgb, shadowCoverage * v_shadowColor.a);

  fragColor = compositeOver(outlineLayer, shadowLayer);
}
