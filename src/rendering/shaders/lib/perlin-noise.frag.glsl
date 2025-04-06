#version 300 es
precision mediump float;

uniform vec2 u_resolution;

#include <perlinNoise>

out vec4 fragColor;

void main() {
  // part 0 - basic shader setup
  vec2 uv = gl_FragCoord.xy / u_resolution;

  // make sure the grid is square
  uv = gl_FragCoord.xy / u_resolution.y;

  uv = uv + vec2(u_time * 0.1, 0.0);

  vec3 layer1 = perlinNoise(uv + vec2(u_time * 0.02, 0.0), 3.0, 0.35);
  vec3 layer2 = perlinNoise(uv + vec2(u_time * 0.015, u_time * 0.015), 8.0, 1.0);
  vec3 layer3 = perlinNoise(uv + vec2(0.0, u_time * 0.01), 13.0, 2.0);

  vec3 combined = (layer1 * 0.8 + layer2 * 0.4 + layer3 * 0.2) 
    / (0.8 + 0.4 + 0.2);

  fragColor = vec4(combined, 1.0);
}