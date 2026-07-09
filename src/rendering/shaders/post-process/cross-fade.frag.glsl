#version 300 es

#pragma forge name(cross-fade.frag)

precision mediump float;

// Generic cross-fade between two textures: not specific to blurring, so any
// effect that needs to dial between an unmodified and a processed version of
// a scene by a scalar factor (blur intensity, a vignette, a damage overlay,
// etc.) can reuse this shader.
uniform sampler2D u_fromTexture;
uniform sampler2D u_toTexture;
uniform float u_factor;

in vec2 v_texCoord;
out vec4 fragColor;

void main() {
    vec4 from = texture(u_fromTexture, v_texCoord);
    vec4 to = texture(u_toTexture, v_texCoord);

    fragColor = mix(from, to, u_factor);
}
