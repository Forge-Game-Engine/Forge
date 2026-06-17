#version 300 es

#property name: text.frag

precision highp float;

in vec2 v_atlasUV;
in vec4 v_color;
in vec4 v_clipRect;
in vec2 v_screenPos;
in float v_opacity;

// SDF atlas texture (R for single-channel SDF; RGB for MSDF)
uniform sampler2D u_atlas;

// true  = multi-channel MSDF atlas (use median of R, G, B)
// false = single-channel SDF atlas  (use R channel only)
uniform bool u_msdf;

out vec4 fragColor;

// MSDF median of three channels.
float median(float r, float g, float b) {
    return max(min(r, g), min(max(r, g), b));
}

void main() {
    // Rectangular clip test in screen-space pixels.
    // clipRect.zw == 0 means no clipping.
    if (v_clipRect.z > 0.0 && v_clipRect.w > 0.0) {
        if (v_screenPos.x < v_clipRect.x ||
            v_screenPos.y < v_clipRect.y ||
            v_screenPos.x > v_clipRect.x + v_clipRect.z ||
            v_screenPos.y > v_clipRect.y + v_clipRect.w) {
            discard;
        }
    }

    vec4 sample = texture(u_atlas, v_atlasUV);

    float dist;
    if (u_msdf) {
        dist = median(sample.r, sample.g, sample.b);
    } else {
        dist = sample.r;
    }

    // Anti-aliased coverage via screen-space derivative.
    float w = fwidth(dist);
    float alpha = smoothstep(0.5 - w, 0.5 + w, dist);

    vec4 color = v_color;
    color.a *= alpha * v_opacity;

    fragColor = color;
}
