#version 300 es

#pragma forge name(perlinNoise.frag)

precision mediump float;

uniform vec2 u_resolution;

#pragma forge include(perlinNoise)

out vec4 fragColor;

void main() {
  // gl_FragCoord's origin is the bottom-left of the destination; flip it so
  // uv's origin is the top-left, like every other 2D coordinate in the
  // engine. Dividing both axes by the height keeps the grid square.
  vec2 fragCoord = vec2(gl_FragCoord.x, u_resolution.y - gl_FragCoord.y);
  vec2 uv = fragCoord / u_resolution.y;

  uv = uv + vec2(u_time * 0.05, 0.0);

  vec3 layer1 = perlinNoise(uv, 3.0, 0.35);
  vec3 layer2 = perlinNoise(uv, 8.0, 1.0);
  vec3 layer3 = perlinNoise(uv, 13.0, 2.0);

  vec3 combined = (layer1 * 0.8 + layer2 * 0.4 + layer3 * 0.2) 
    / (0.8 + 0.4 + 0.2);

  combined = (combined * 0.5 + 0.5) - 0.6;

  fragColor = vec4(combined, 1.0);
}