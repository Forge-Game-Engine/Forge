#version 300 es
#pragma forge name(tilemap.frag)

precision mediump float;

uniform sampler2D u_texture; // The tileset source's atlas texture
uniform vec4 u_tint;         // The layer's tintColor, straight alpha

in vec2 v_texCoord;
flat in highp vec4 v_texBounds;

out vec4 fragColor;

#pragma forge include(mask)

void main() {
  vec4 color =
    texture(u_texture, clamp(v_texCoord, v_texBounds.xy, v_texBounds.zw)) *
    u_tint;

  // Straight alpha: the render system's blending premultiplies it. Color
  // above 1 reaches an HDR target as it is, for bloom.
  fragColor = vec4(color.rgb, color.a * maskCoverage());
}
