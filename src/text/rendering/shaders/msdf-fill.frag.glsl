#version 300 es

#pragma forge name(msdf-fill.frag)

precision mediump float;

#pragma forge include(msdf)

in vec2 v_texCoord;
in vec4 v_tint;
out vec4 fragColor;

// Draws only a glyph's own anti-aliased ink, the text's default material.
// Kept apart from the outline/shadow ("effects") shader, `msdf-effects.frag`,
// so it can reuse the plain `sprite.vert` and the base
// `spriteInstanceDataSegment` verbatim - a fill quad needs none of the
// outline/shadow per-instance data `msdf.vert` forwards, so glyphs with no
// effects at all (the common case) never pay for it.
//
// This pass is always drawn *after* every glyph's outline/shadow for the
// same text entity - see `pushTextRenderCommands` in `glyph-quad.ts` - so a
// glyph's fill can never be painted over by a neighboring glyph's
// outline/shadow, however far that effect reaches.
//
// A custom text material (see `createTextMaterial`) replaces this shader:
// it includes `msdf` the same way and builds on `msdfCoverage`.
void main() {
  fragColor = vec4(v_tint.rgb, v_tint.a * msdfCoverage(v_texCoord));
}
