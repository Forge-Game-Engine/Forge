export const flickerShader = `#version 300 es

#pragma forge name(flicker-text.frag)

precision mediump float;

#pragma forge include(msdf)

// 0 at rest, up to 1 during a burst.
uniform float u_intensity;
uniform float u_seed;

in vec2 v_texCoord;
in vec4 v_tint;
out vec4 fragColor;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  // How far the atlas coordinates move per screen pixel, so offsets below
  // are in screen pixels whatever the text's size.
  vec2 pixel = fwidth(v_texCoord);

  // Thin horizontal bands of the word jump sideways during a burst.
  float band = floor(gl_FragCoord.y / 5.0);
  float isShifted = step(1.0 - 0.4 * u_intensity, hash(vec2(band, u_seed)));
  float shift = (hash(vec2(band + 0.5, u_seed)) * 2.0 - 1.0) * 4.0 * isShifted;
  vec2 uv = v_texCoord + vec2(shift * pixel.x, 0.0);

  // The red and blue ink pulled apart either side of the green.
  vec2 split = vec2((1.0 + 3.0 * u_intensity) * pixel.x, 0.0);
  vec3 coverage = vec3(
    msdfCoverage(uv + split),
    msdfCoverage(uv),
    msdfCoverage(uv - split)
  );
  float alpha = max(coverage.r, max(coverage.g, coverage.b));

  // Straight alpha: each channel's share of the pixel's coverage.
  fragColor = vec4(v_tint.rgb * coverage / max(alpha, 0.0001), v_tint.a * alpha);
}`;
