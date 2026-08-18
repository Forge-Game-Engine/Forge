#version 300 es

#pragma forge name(msdf-fill.frag)

precision mediump float;

uniform sampler2D u_atlas;
uniform float u_distanceRange;   // FontAtlasData.distanceRange
uniform float u_atlasSize;       // FontAtlasData.atlasSize.height (assumes square texels)

in vec2 v_texCoord;
in vec4 v_tint;
out vec4 fragColor;

float median(float r, float g, float b) {
  return max(min(r, g), min(max(r, g), b));
}

// Draws only a glyph's own anti-aliased ink - the same computation
// `msdf-effects.frag`'s `fillLayer` used to do as one layer of a combined
// shader, now its own draw pass. Kept in its own shader (rather than a
// uniform "mode" switch on one shared program) so it can reuse the plain
// `sprite.vert` and the base `spriteInstanceDataSegment` verbatim - a fill
// quad needs none of the outline/shadow per-instance data `msdf.vert`
// forwards, so glyphs with no effects at all (the common case) never pay
// for it.
//
// This pass is always drawn *after* every glyph's outline/shadow ("effects"
// pass, see `msdf-effects.frag`) for the same text entity - see
// `pushTextRenderCommands` in `glyph-quad.ts` - so a glyph's fill can never
// be painted over by a neighboring glyph's outline/shadow, however far that
// effect reaches, regardless of draw order within the effects pass itself.
void main() {
  vec3 msdf = texture(u_atlas, v_texCoord).rgb;
  float signedDistance = median(msdf.r, msdf.g, msdf.b) - 0.5;

  // See `msdf.vert`/`msdf-effects.frag` for the full derivation of this
  // screen-pixel conversion - identical here, just applied to the fill
  // edge alone.
  vec2 unitRange = vec2(u_distanceRange) / vec2(u_atlasSize);
  vec2 uvPerScreenPx = fwidth(v_texCoord);
  vec2 screenTexSize = vec2(1.0) / uvPerScreenPx;
  float screenPxRange = max(0.5 * dot(unitRange, screenTexSize), 1.0);
  float screenPxDistance = signedDistance * screenPxRange;

  float glyphAlpha = clamp(screenPxDistance + 0.5, 0.0, 1.0);
  fragColor = vec4(v_tint.rgb, v_tint.a * glyphAlpha);
}
