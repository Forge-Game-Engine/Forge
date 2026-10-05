export const shimmerShader = `#version 300 es

#pragma forge name(shimmer-text.frag)

precision mediump float;

// Declares the font atlas (bound by the engine) and msdfCoverage.
#pragma forge include(msdf)

uniform vec4 u_highlightColor;
uniform float u_time;

in vec2 v_texCoord;
in vec4 v_tint;
out vec4 fragColor;

void main() {
  // A bright diagonal band sweeping across the screen, so it runs along
  // the whole word rather than through each letter on its own.
  float sweep = fract((gl_FragCoord.x + gl_FragCoord.y * 0.5) / 900.0 - u_time * 0.35);
  float band = smoothstep(0.0, 0.08, sweep) * (1.0 - smoothstep(0.08, 0.16, sweep));

  vec3 color = mix(v_tint.rgb, u_highlightColor.rgb, band);

  fragColor = vec4(color, v_tint.a * msdfCoverage(v_texCoord));
}`;
