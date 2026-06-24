export const backgroundShader = `#version 300 es
#property name: background.frag

precision mediump float;

uniform float u_time;

in vec2 v_texCoord;
out vec4 fragColor;

void main() {
  vec2 uv = v_texCoord;

  vec3 topColor = vec3(0.05, 0.25, 0.85);
  vec3 bottomColor = vec3(0.0, 0.0, 0.0);

  // The blend's midpoint drifts slowly up and down, so the gradient breathes
  // gently rather than sitting completely static.
  float midpoint = 0.5 + 0.06 * sin(u_time * 0.3);
  float t = smoothstep(midpoint - 0.5, midpoint + 0.5, uv.y);
  vec3 color = mix(topColor, bottomColor, t);

  // Soft vignette so the corners recede and the bricks/ball read clearly
  // against the centre of the screen.
  float vignette = smoothstep(0.9, 0.2, length(uv - 0.5));
  color *= mix(0.7, 1.0, vignette);

  fragColor = vec4(color, 1.0);
}`;
