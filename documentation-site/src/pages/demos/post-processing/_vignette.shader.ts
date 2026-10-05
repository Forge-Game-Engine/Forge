export const vignetteShader = `#version 300 es

#pragma forge name(vignette.frag)

precision mediump float;

// The previous pass's output: here, the glitch pass's.
uniform sampler2D u_texture;

// How many scanlines run down the image.
uniform float u_scanlineCount;

in vec2 v_texCoord;
out vec4 fragColor;

void main() {
  vec4 color = texture(u_texture, v_texCoord);

  // Darkens towards the corners.
  vec2 fromCenter = v_texCoord - 0.5;
  float vignette = 1.0 - smoothstep(0.35, 0.75, length(fromCenter));

  float scanline = 0.85 + 0.15 * sin(v_texCoord.y * u_scanlineCount * 6.2832);

  // Scaling a premultiplied color darkens it without changing its coverage.
  fragColor = vec4(color.rgb * vignette * scanline, color.a);
}`;
