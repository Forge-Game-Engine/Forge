#version 300 es

#pragma forge name(msdf.frag)

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
  vec2 screenTexSize = vec2(1.0) / fwidth(v_texCoord);
  float screenPxRange = max(0.5 * dot(unitRange, screenTexSize), 1.0);
  float screenPxDistance = signedDistance * screenPxRange;

  float glyphAlpha = clamp(screenPxDistance + 0.5, 0.0, 1.0);

  fragColor = vec4(v_tint.rgb, v_tint.a * glyphAlpha);
}
