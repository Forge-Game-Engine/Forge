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
  // size. `u_distanceRange` is in atlas pixels, so it's first divided by
  // `u_atlasSize` to get a normalized (0-1 UV space) unit range, then
  // divided by `fwidth(v_texCoord)` (how much UV space one screen pixel
  // covers) to land in screen pixels.
  float screenPxRange = u_distanceRange /
      (2.0 * length(fwidth(v_texCoord)) * u_atlasSize);
  float screenPxDistance = signedDistance * screenPxRange;

  float glyphAlpha = clamp(screenPxDistance + 0.5, 0.0, 1.0);

  fragColor = vec4(v_tint.rgb, v_tint.a * glyphAlpha);
}
