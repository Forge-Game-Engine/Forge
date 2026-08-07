#version 300 es

#pragma forge name(msdf.frag)

precision mediump float;

uniform sampler2D u_texture;    // The MSDF font atlas
uniform float u_distanceRange;  // The atlas's signed distance field range, in atlas pixels

in vec2 v_texCoord;           // Input from vertex shader
in vec4 v_tint;               // Tint color (text color)
out vec4 fragColor;           // Output color

// The median of the MSDF's three channels reconstructs the single-channel
// signed distance field (see msdf-atlas-gen's own recommended shader):
// wherever two of the three channels agree, their shared value is the "true"
// distance, since only one channel is ever allowed to diverge to preserve a
// sharp corner.
float median(float r, float g, float b) {
  return max(min(r, g), min(max(r, g), b));
}

// Converts `u_distanceRange` (in atlas pixels) into screen pixels via the
// texture coordinate's screen-space derivative (`fwidth`), so the glyph
// edge's antialiasing band stays a constant width in screen pixels
// regardless of how much the text is scaled, instead of blurring when
// scaled up or aliasing when scaled down.
float screenPxRange() {
  vec2 unitRange = vec2(u_distanceRange) / vec2(textureSize(u_texture, 0));
  vec2 screenTexSize = vec2(1.0) / fwidth(v_texCoord);

  return max(0.5 * dot(unitRange, screenTexSize), 1.0);
}

void main() {
  vec3 msd = texture(u_texture, v_texCoord).rgb;
  float signedDistance = median(msd.r, msd.g, msd.b) - 0.5;
  float screenPxDistance = screenPxRange() * signedDistance;
  float alpha = clamp(screenPxDistance + 0.5, 0.0, 1.0);

  fragColor = vec4(v_tint.rgb, v_tint.a * alpha);
}
