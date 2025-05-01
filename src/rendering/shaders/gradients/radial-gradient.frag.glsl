#version 300 es

#property name: radialGradient.frag

precision mediump float;

uniform vec2 u_resolution;
uniform vec2 u_center;
uniform sampler2D u_gradientTexture;

#include <radialGradient>

out vec4 fragColor;

void main() {
  // part 0 - basic shader setup
  vec2 uv = gl_FragCoord.xy / u_resolution;

  // make sure the grid is square
  uv = gl_FragCoord.xy / u_resolution.y;

  fragColor = radialGradient(uv, u_center, u_gradientTexture);
}