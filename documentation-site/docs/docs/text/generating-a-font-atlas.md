---
sidebar_position: 1
---

# Generating a Font Atlas

`forge-generate-font-atlas` is an offline command that turns a `.ttf`/`.otf`
font into an MSDF atlas: `<out>.png` (the atlas texture) and `<out>.json`
(the glyph metrics, in Forge's own
[`FontAtlasData`](/Forge/docs/api/interfaces/FontAtlasData) shape). It's a
build-time step, run once whenever your font or charset changes, not
something your game runs at runtime.

## Install the generator

The command wraps [`msdf-bmfont-xml`](https://www.npmjs.com/package/msdf-bmfont-xml),
an **optional peer dependency** of `@forge-game-engine/forge`. A plain
`npm install @forge-game-engine/forge` does not install it, since most games
don't need the atlas generator itself, only its output. Install it as a dev
dependency of your project:

```bash
npm install --save-dev msdf-bmfont-xml
```

Or, since most games never need it at runtime and only run it occasionally,
install it globally instead:

```bash
npm install -g msdf-bmfont-xml
```

## Generate an atlas

```bash
npx forge-generate-font-atlas --font my-font.ttf --charset ascii --out assets/fonts/my-font
```

This writes `assets/fonts/my-font.png` and `assets/fonts/my-font.json`, which
[`FontAtlasCache`](./loading-a-font-atlas.md) loads together at runtime.

| Flag                             | Default  | Meaning                                                                                                           |
| -------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------- |
| `--font <path>`                  | required | The input `.ttf`/`.otf` file.                                                                                     |
| `--out <path>`                   | required | Output path with no extension; writes `<out>.png` and `<out>.json`.                                               |
| `--charset <name\|string\|path>` | `ascii`  | `ascii` for printable ASCII (32-126), a literal string of characters, or a path to a text file to read them from. |
| `--size <n>`                     | `42`     | The font size, in pixels, the distance field is authored at.                                                      |
| `--distance-range <n>`           | `4`      | The distance field's encoded range, in pixels.                                                                    |
| `--texture-width <n>`            | `512`    | Atlas texture width, in pixels.                                                                                   |
| `--texture-height <n>`           | `512`    | Atlas texture height, in pixels.                                                                                  |
| `--help`, `-h`                   |          | Print usage.                                                                                                      |

## Picking a charset

Only include the characters your game actually displays. A charset of every
printable ASCII character comfortably fits a default 512x512 atlas for most
fonts; adding a full Unicode range (accented Latin, Cyrillic, CJK) does not
and pushes the atlas texture much larger for glyphs you may never draw. For
a menu that only ever shows uppercase letters and digits, pass a literal
charset instead of the `ascii` preset:

```bash
npx forge-generate-font-atlas --font heading.ttf --charset "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789" --out assets/fonts/heading
```

Or point `--charset` at a text file if the character list is long or shared
across multiple fonts:

```bash
npx forge-generate-font-atlas --font body.ttf --charset ./charsets/latin-extended.txt --out assets/fonts/body
```

## Only one atlas page is supported

If a charset doesn't fit in the requested texture size, generation fails
with an error telling you to reduce the charset or increase
`--texture-width`/`--texture-height`, rather than silently splitting the
glyphs across multiple pages. Multi-page atlases aren't supported: every
`FontAtlas` maps to exactly one texture, so a `FontAtlasCache` lookup never
needs to bind more than one image per font.
