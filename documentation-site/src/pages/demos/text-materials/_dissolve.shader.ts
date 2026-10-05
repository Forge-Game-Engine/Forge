export const dissolveShader = `#version 300 es

#pragma forge name(dissolve-text.frag)

precision mediump float;

#pragma forge include(msdf)

// 0 shows the whole word, 1 has burned it all away.
uniform float u_progress;
uniform vec4 u_edgeColor;

in vec2 v_texCoord;
in vec4 v_tint;
out vec4 fragColor;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// Smooth value noise in screen space, in cells of 6 pixels.
float noise(vec2 p) {
  vec2 cell = floor(p / 6.0);
  vec2 f = smoothstep(0.0, 1.0, fract(p / 6.0));

  return mix(
    mix(hash(cell), hash(cell + vec2(1.0, 0.0)), f.x),
    mix(hash(cell + vec2(0.0, 1.0)), hash(cell + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

void main() {
  float n = noise(gl_FragCoord.xy);
  float remaining = n - u_progress;

  if (remaining < 0.0) {
    discard;
  }

  // A glowing rim just ahead of where it's burned away.
  float edge = 1.0 - smoothstep(0.0, 0.08, remaining);
  vec3 color = mix(v_tint.rgb, u_edgeColor.rgb, edge);

  fragColor = vec4(color, v_tint.a * msdfCoverage(v_texCoord));
}`;
