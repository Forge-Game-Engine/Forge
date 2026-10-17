#version 300 es
#pragma forge name(trail.frag)

precision mediump float;

uniform sampler2D u_texture; // The trail's texture, or white for none

in vec2 v_texCoord;
in vec4 v_color;

out vec4 fragColor;

#pragma forge include(mask)

void main() {
  vec4 color = texture(u_texture, v_texCoord) * v_color;

  // Straight alpha: the render system's blending premultiplies it. Color
  // above 1 reaches an HDR target as it is, for bloom.
  fragColor = vec4(color.rgb, color.a * maskCoverage());
}
