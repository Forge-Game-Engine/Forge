#version 300 es

#pragma forge name(sprite.vert)

in vec2 a_position;      // Vertex position (e.g., quad corners)
in vec2 a_texCoord;      // Texture coordinate

// Per-instance attributes:
in vec4 a_instancePosScale;   // Sprite position (xy) and scale (zw)
in float a_instanceRot;       // Sprite rotation (radians)
in vec4 a_instanceSizePivot;  // Sprite width/height (xy) and pivot (zw)
in vec4 a_instanceTexRect;    // Texture region offset (xy) and size (zw), in UV
in vec4 a_instanceTint;       // tint color
in vec3 a_instanceEmissive;   // emissive color

// Per-instance mask attributes (see `maskInstanceDataSegment`).
#pragma forge include(spriteMaskVertex)

// Uniforms for projection/camera:
uniform mat3 u_projection; // 2D projection/camera matrix

out vec2 v_texCoord;
out vec4 v_tint;
out vec3 v_emissive;

void main() {
    // Convert pivot from [0,1] to [-1,1] coordinate space, matching
    // a_position's own [-1,1] range so the pivot fully offsets the origin
    // to the requested edge instead of only halfway there. Without this
    // doubling, a_position (widened to [-1,1] to make its own `* 0.5` below
    // correct) and the pivot's contribution stay on mismatched
    // scales, so pivot only ever applies half its intended offset - e.g.
    // pivot (0,0) lands 25% in from the sprite's edge instead of at the
    // edge, and every non-center pivot value needs a compensating
    // adjustment to land where it visually should.
    //
    // Y is negated on top of that: `a_instanceSizePivot.zw` is public API
    // (`SpriteEcsComponent.pivot`) and is Y-up like every other public
    // Y-facing value in the engine (world position, rotation), so pivot
    // (0, 0) means bottom-left and (1, 1) means top-right. Everything below
    // this line - a_position, a_instancePos, the projection - lives in the
    // Y-down space the projection matrix's flip expects, so the pivot's Y
    // needs the same flip before it's combined with a_position.
    vec2 normalizedPivot = vec2(
        (a_instanceSizePivot.z - 0.5) * 2.0,
        -(a_instanceSizePivot.w - 0.5) * 2.0
    );
    
    // 1. Apply pivot (move origin)
    vec2 pivoted = a_position - normalizedPivot;

    // 2. Scale quad to sprite size and scale
    vec2 scaled = pivoted * a_instanceSizePivot.xy * a_instancePosScale.zw * 0.5;

    // 3. Rotate
    float c = cos(a_instanceRot);
    float s = sin(a_instanceRot);
    vec2 rotated = vec2(
        c * scaled.x - s * scaled.y,
        s * scaled.x + c * scaled.y
    );

    // 4. Translate to world position
    vec2 world = rotated + a_instancePosScale.xy;

    // 5. Project to screen
    //
    // Must be matrix * vector (not vector * matrix): u_projection is built
    // via Matrix3x3.scale()/.translate(), which compose new transforms by
    // right-multiplying (M_new = M_old * T), the standard convention for a
    // matrix that acts on column vectors via M*v. GLSL's `vec * mat` instead
    // computes `transpose(M) * v`, which routes the translation terms into
    // the (unused) z component instead of x/y - silently dropping any
    // camera pan/translation.
    vec3 projected = u_projection * vec3(world, 1.0);

    gl_Position = vec4(projected.xy, 0.0, 1.0);
    v_texCoord = a_instanceTexRect.xy + a_texCoord * a_instanceTexRect.zw;
    v_tint = a_instanceTint;
    v_emissive = a_instanceEmissive;

    forwardSpriteMask(world);
}