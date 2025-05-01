#property name: radialGradient

vec4 radialGradient(vec2 uv, vec2 center, sampler2D gradientTexture) {    
    float dist = distance(uv, center);

    // Interpolation factor (0.0 at center, 1.0 at edges)
    float t = clamp(dist / 0.5, 0.0, 1.0);

    vec4 gradientColor = texture(gradientTexture, vec2(t, 0.5));

    return gradientColor;
}
