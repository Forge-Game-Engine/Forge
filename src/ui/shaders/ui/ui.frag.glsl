#version 300 es

#property name: ui.frag

precision highp float;

in vec2 v_uv;
in vec2 v_size;
in vec4 v_tint;
in vec4 v_borderColor;
in float v_borderWidth;
in float v_cornerRadius;
in float v_opacity;
in vec4 v_clipRect;
in vec2 v_screenPos;

out vec4 fragColor;

// SDF for a rounded box centered at origin with half-extents b and corner radius r.
// Returns negative inside, positive outside, zero on the edge.
float sdfRoundedBox(vec2 p, vec2 halfSize, float r) {
    vec2 d = abs(p) - halfSize + r;
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r;
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

    // Convert UV [0,1] to centered pixel coordinates.
    vec2 p = (v_uv - 0.5) * v_size;

    // Clamp corner radius to half the shortest side.
    float r = min(v_cornerRadius, min(v_size.x, v_size.y) * 0.5);
    vec2 halfSize = v_size * 0.5;

    float d = sdfRoundedBox(p, halfSize, r);

    // Anti-aliased outer alpha.
    float aa = fwidth(d);
    float outerAlpha = 1.0 - smoothstep(-aa, aa, d);

    // Base fill color.
    vec4 color = v_tint;

    // Border: blend border color over fill between SDF -borderWidth and 0.
    if (v_borderWidth > 0.0) {
        float borderInner = d + v_borderWidth;
        float borderAlpha = smoothstep(-aa, aa, borderInner);
        color = mix(v_borderColor, color, borderAlpha);
    }

    color.a *= v_opacity * outerAlpha;

    fragColor = color;
}
