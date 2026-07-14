#version 300 es

#pragma forge name(tone-mapping.frag)

// highp, not the mediump used elsewhere in post-process shaders: mediump's
// ~10-bit mantissa visibly bands on HDR magnitudes and exposure-scaled
// values in a way mediump's [0,1] LDR usage never exercised.
precision highp float;

uniform sampler2D u_texture;
uniform float u_exposure;
uniform bool u_useAces;

in vec2 v_texCoord;
out vec4 fragColor;

vec3 reinhard(vec3 color) {
    return color / (color + vec3(1.0));
}

// Narkowicz's ACES filmic fit.
vec3 acesFilmic(vec3 color) {
    const float a = 2.51;
    const float b = 0.03;
    const float c = 2.43;
    const float d = 0.59;
    const float e = 0.14;

    return clamp(
        (color * (a * color + b)) / (color * (c * color + d) + e),
        0.0,
        1.0
    );
}

void main() {
    vec4 hdr = texture(u_texture, v_texCoord);
    vec3 exposed = hdr.rgb * u_exposure;
    vec3 mapped = u_useAces ? acesFilmic(exposed) : reinhard(exposed);

    fragColor = vec4(mapped, hdr.a);
}
