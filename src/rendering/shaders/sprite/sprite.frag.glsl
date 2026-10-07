#version 300 es

#pragma forge name(sprite.frag)

precision mediump float;

uniform sampler2D u_texture;          // The sprite's texture
uniform sampler2D u_emissiveTexture;  // The sprite's emissive map, added on top unlit

in vec2 v_texCoord;           // Input from vertex shader
in vec4 v_tint;               // Tint color
in vec3 v_emissive;           // Multiplies the (typically greyscale) emissive map
out vec4 fragColor;           // Output color

#pragma forge include(spriteMask)

void main() {

  vec4 tex = texture(u_texture, v_texCoord);
  vec3 emissiveMask = texture(u_emissiveTexture, v_texCoord).rgb;
  vec3 emissive = emissiveMask * v_emissive;

  fragColor = vec4(tex.rgb * v_tint.rgb + emissive, tex.a * v_tint.a * spriteMaskCoverage());
}
