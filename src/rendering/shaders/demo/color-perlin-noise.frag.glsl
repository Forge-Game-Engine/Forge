#version 300 es
precision mediump float;

uniform vec2 u_resolution;
uniform sampler2D u_texture;
uniform float u_time;

#include <perlinNoise>

out vec4 fragColor;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;

  uv.y = 1.0 - uv.y;

  vec4 black = vec4(0.0, 0.0, 0.0, 1.0);
  vec4 funnyColor = texture(u_texture, uv);
  vec3 perlinColor = perlinNoise(uv + u_time / 10000.0, 10.0, 0.0);

  fragColor = vec4(mix(black, funnyColor, perlinColor.x));
}