#version 300 es

#pragma forge name(bloom-threshold.frag)

precision mediump float;

uniform sampler2D u_texture;
uniform float u_threshold;

in vec2 v_texCoord;
out vec4 fragColor;

// How far above u_threshold brightness has to climb before contributing at
// full strength. Softens the cutoff into a fade instead of a hard edge.
const float knee = 0.1;

void main() {
    vec4 color = texture(u_texture, v_texCoord);
    float brightness = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
    float contribution = smoothstep(u_threshold, u_threshold + knee, brightness);

    // Alpha carries `contribution` itself, not the source pixel's original
    // alpha: this buffer gets blurred next, and the glow needs to spread
    // its own opacity outward past the source sprite's silhouette (into
    // pixels that were fully transparent) for the halo to actually show up
    // once it's composited back with alpha blending.
    fragColor = vec4(color.rgb * contribution, contribution);
}
