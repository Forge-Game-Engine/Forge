export const backgroundShader = `#version 300 es

#property name: background.frag

precision mediump float;

uniform vec2 u_resolution;
uniform vec4 u_color;

#include <perlinNoise>
 
out vec4 fragColor;

void main() {
  // part 0 - basic shader setup
  vec2 uv = gl_FragCoord.xy / u_resolution;

  // make sure the grid is square
  uv = gl_FragCoord.xy / u_resolution.y;

  uv = uv + vec2(0.0, u_time * 0.2);

  vec3 layer1 = perlinNoise(uv, 3.0, 0.35);
  vec3 layer2 = perlinNoise(uv, 8.0, 1.0);
  vec3 layer3 = perlinNoise(uv, 13.0, 2.0);

  vec3 combined = (layer1 * 0.8 + layer2 * 0.4 + layer3 * 0.2) 
    / (0.8 + 0.4 + 0.2);

  combined = (combined * 0.5 + 0.5) - 0.6;

  fragColor = vec4(combined * u_color.rgb, u_color.a);
}`;
