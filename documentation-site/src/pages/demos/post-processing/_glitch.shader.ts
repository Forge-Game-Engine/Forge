export const glitchShader = `#version 300 es

#pragma forge name(glitch.frag)

precision highp float;

// The previous pass's output: the camera's image, premultiplied.
uniform sampler2D u_texture;

// 0 between bursts, up to 1 during one.
uniform float u_intensity;

// Picks which bands tear; changed in steps so the tears jump about.
uniform float u_seed;

in vec2 v_texCoord;
out vec4 fragColor;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  // Horizontal bands, a few of which shift sideways during a burst.
  float band = floor(v_texCoord.y * 24.0);
  float isTorn = step(1.0 - 0.3 * u_intensity, hash(vec2(band, u_seed)));
  float tear = (hash(vec2(band + 0.5, u_seed)) * 2.0 - 1.0) * isTorn;

  vec2 uv = v_texCoord + vec2(tear * 0.06 * u_intensity, 0.0);

  // Red and blue pulled apart either side of green.
  vec2 split = vec2(0.002 + 0.012 * u_intensity, 0.0);
  vec4 red = texture(u_texture, uv + split);
  vec4 green = texture(u_texture, uv);
  vec4 blue = texture(u_texture, uv - split);

  // Premultiplied, so each channel brings its own coverage with it.
  float alpha = max(green.a, max(red.a, blue.a));

  fragColor = vec4(red.r, green.g, blue.b, alpha);
}`;
