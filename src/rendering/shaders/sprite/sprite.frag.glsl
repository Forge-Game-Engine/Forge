#version 300 es

#pragma forge name(sprite.frag)

precision mediump float;

uniform sampler2D u_texture;          // The sprite's texture
uniform sampler2D u_emissiveTexture;  // The sprite's emissive map, added on top unlit

in highp vec2 v_texCoord;     // Input from vertex shader
flat in highp vec4 v_texBounds; // The sampled rect, to keep filtering inside the sprite's region
in vec4 v_tint;               // Tint color
in vec3 v_emissive;           // Multiplies the (typically greyscale) emissive map
out vec4 fragColor;           // Output color

#pragma forge include(mask)

void main() {
  highp vec2 texCoord = clamp(v_texCoord, v_texBounds.xy, v_texBounds.zw);

  vec4 tex = texture(u_texture, texCoord);
  vec3 emissiveMask = texture(u_emissiveTexture, texCoord).rgb;
  vec3 emissive = emissiveMask * v_emissive;

  fragColor = vec4(tex.rgb * v_tint.rgb + emissive, tex.a * v_tint.a * maskCoverage());
}
