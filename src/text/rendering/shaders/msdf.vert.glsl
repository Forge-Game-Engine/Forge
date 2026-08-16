#version 300 es

#pragma forge name(msdf.vert)

in vec2 a_position;      // Vertex position (e.g., quad corners)
in vec2 a_texCoord;      // Texture coordinate

// Per-instance attributes (base sprite segment, see `sprite.vert.glsl`):
in vec2 a_instancePos;        // Glyph position
in float a_instanceRot;       // Glyph rotation (radians)
in vec2 a_instanceScale;      // Glyph scale
in vec2 a_instanceSize;       // Glyph width/height, in world units
in vec2 a_instancePivot;      // Glyph pivot (origin offset)
in vec2 a_instanceTexOffset;  // Texture region offset (UV)
in vec2 a_instanceTexSize;    // Texture region size (UV)
in vec4 a_instanceTint;       // tint color

// Per-instance attributes (text effects segment, see
// `textEffectsInstanceDataSegment`):
in vec4 a_instanceOutlineColor;
in float a_instanceOutlineWidth;
in vec4 a_instanceShadowColor;
in vec2 a_instanceShadowOffset;
in float a_instanceShadowSoftness;
in float a_instanceMaxEffectClearance;

// Uniforms for projection/camera:
uniform mat3 u_projection; // 2D projection/camera matrix

out vec2 v_texCoord;
out vec4 v_tint;
out vec4 v_outlineColor;
out float v_outlineWidth;
out vec4 v_shadowColor;
out vec2 v_shadowOffset;
out float v_shadowSoftness;
out float v_maxEffectClearance;

// World units per UV unit, per axis - the ratio between how far this
// glyph's quad spans in world space (`a_instanceSize`) versus how far its
// texture coordinates span in the atlas (`a_instanceTexSize`). Both are
// per-instance constants (identical at all 4 of a glyph's quad vertices),
// so this ratio is too; forwarding it (rather than `a_instanceMaxEffectClearance`
// itself, which is in world units) lets the fragment shader convert this
// glyph's world-unit neighbor clearance into the same screen-pixel-range
// units `screenPxRange` already uses, at whatever scale/zoom is actually in
// effect on screen - see `msdf.frag`'s derivation, which is the same
// technique `screenPxRange` itself uses via `fwidth`, just applied to world
// space instead of atlas UV space.
out vec2 v_worldPerUv;

void main() {
    // Identical to `sprite.vert` - glyph quads are positioned, pivoted,
    // rotated, and projected exactly like a sprite region already is (see
    // `sprite.vert.glsl` for the derivation of each step below).
    vec2 normalizedPivot = vec2(
        (a_instancePivot.x - 0.5) * 2.0,
        -(a_instancePivot.y - 0.5) * 2.0
    );

    vec2 pivoted = a_position - normalizedPivot;
    vec2 scaled = pivoted * a_instanceSize * a_instanceScale * 0.5;

    float c = cos(a_instanceRot);
    float s = sin(a_instanceRot);
    vec2 rotated = vec2(
        c * scaled.x - s * scaled.y,
        s * scaled.x + c * scaled.y
    );

    vec2 world = rotated + a_instancePos;

    vec3 projected = u_projection * vec3(world, 1.0);

    gl_Position = vec4(projected.xy, 0.0, 1.0);
    v_texCoord = a_instanceTexOffset + a_texCoord * a_instanceTexSize;
    v_tint = a_instanceTint;

    // Passed through unchanged - every vertex of a glyph's quad shares the
    // same per-instance effect parameters, so no per-vertex computation is
    // needed here; `msdf.frag` does all the actual effect work.
    v_outlineColor = a_instanceOutlineColor;
    v_outlineWidth = a_instanceOutlineWidth;
    v_shadowColor = a_instanceShadowColor;
    v_shadowOffset = a_instanceShadowOffset;
    v_shadowSoftness = a_instanceShadowSoftness;
    v_maxEffectClearance = a_instanceMaxEffectClearance;

    // `a_instanceScale` is folded in here (not left for the fragment shader
    // to rediscover) since it's a per-instance constant already available in
    // this stage, exactly like `a_instanceSize`/`a_instanceTexSize`
    // themselves - `abs()` because a negative scale (sprite flip) changes
    // handedness, not magnitude, and this ratio only ever needs to convert
    // *distances*.
    v_worldPerUv = abs(a_instanceSize * a_instanceScale) /
        max(a_instanceTexSize, vec2(1e-6));
}
