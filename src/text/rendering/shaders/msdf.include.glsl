#pragma forge name(msdf)

// The glyph atlas of the text being drawn. Bound by the text renderer for
// every font, so a text material never sets these itself.
uniform sampler2D u_atlas;
uniform float u_distanceRange;   // FontAtlasData.distanceRange
uniform float u_atlasSize;       // FontAtlasData.atlasSize.height (assumes square texels)

float msdfMedian(vec3 msdf) {
  return max(min(msdf.r, msdf.g), min(max(msdf.r, msdf.g), msdf.b));
}

// How many screen pixels one unit of the atlas's signed distance spans at
// `texCoord`, however much the glyph is scaled: the atlas's distance range,
// in texture coordinates, over how far the texture coordinates move per
// screen pixel here. Never below 1, so tiny text still gets a 1px edge.
float msdfScreenPxRange(vec2 texCoord) {
  vec2 unitRange = vec2(u_distanceRange) / vec2(u_atlasSize);
  vec2 screenTexSize = vec2(1.0) / fwidth(texCoord);

  return max(0.5 * dot(unitRange, screenTexSize), 1.0);
}

// The signed distance from the glyph's edge at `texCoord`, in screen
// pixels: positive inside the glyph, negative outside.
float msdfScreenPxDistance(vec2 texCoord) {
  float signedDistance = msdfMedian(texture(u_atlas, texCoord).rgb) - 0.5;

  return signedDistance * msdfScreenPxRange(texCoord);
}

// How much of the screen pixel at `texCoord` the glyph's ink covers, from
// 0 to 1, anti-aliased over one screen pixel.
float msdfCoverage(vec2 texCoord) {
  return clamp(msdfScreenPxDistance(texCoord) + 0.5, 0.0, 1.0);
}
