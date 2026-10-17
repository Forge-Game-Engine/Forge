#version 300 es

#pragma forge name(radialGradient.frag)

precision mediump float;

uniform vec2 u_resolution;
uniform vec2 u_center;
uniform sampler2D u_gradientTexture;

#pragma forge include(radialGradient)

out vec4 fragColor;

void main() {
  // gl_FragCoord's origin is the bottom-left of the destination; flip it so
  // uv's origin is the top-left, like every other 2D coordinate in the
  // engine. Dividing both axes by the height keeps the grid square.
  vec2 fragCoord = vec2(gl_FragCoord.x, u_resolution.y - gl_FragCoord.y);
  vec2 uv = fragCoord / u_resolution.y;

  fragColor = radialGradient(uv, u_center, u_gradientTexture);
}