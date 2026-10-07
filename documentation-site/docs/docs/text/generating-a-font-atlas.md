---
sidebar_position: 1
---

# Generating a Font Atlas

`forge-generate-font-atlas` is a command that turns a `.ttf` or `.otf` font
into an MSDF atlas: `<out>.png` (the atlas texture) and `<out>.json` (the
glyph metrics, in the
[`FontAtlasData`](/Forge/docs/api/interfaces/FontAtlasData) format). Run it
at build time, whenever the font or the character set changes; the game
loads the two files it writes. To draw text without a font of your own, use
the package's default font (see [Text](./index.md#the-default-font)).

## Installing the generator

The command uses
[`msdf-bmfont-xml`](https://www.npmjs.com/package/msdf-bmfont-xml), an
optional peer dependency of `@forge-game-engine/forge` that isn't installed
with the package. Install it as a dev dependency of your project:

```bash
npm install --save-dev msdf-bmfont-xml
```

or globally:

```bash
npm install -g msdf-bmfont-xml
```

## Generating an atlas

```bash
npx forge-generate-font-atlas --font my-font.ttf --charset ascii --out assets/fonts/my-font
```

This writes `assets/fonts/my-font.png` and `assets/fonts/my-font.json`.
Load them with [`FontAtlasCache`](./loading-a-font-atlas.md), passing the
URL of each. The JSON's glyph positions match only the image from the same
run, so replace both files together.

| Flag                             | Default  | Meaning                                                                                                                                |
| -------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `--font <path>`                  | required | The input `.ttf`/`.otf` file.                                                                                                          |
| `--out <path>`                   | required | Output path with no extension; writes `<out>.png` and `<out>.json`.                                                                    |
| `--charset <name\|string\|path>` | `ascii`  | `ascii` for printable ASCII (32-126), a literal string of characters, or a path to a text file to read them from.                      |
| `--size <n>`                     | `42`     | The font size, in pixels, the distance field is generated at.                                                                          |
| `--distance-range <n>`           | `4`      | The distance field's range, in pixels. A larger range lets outlines and shadows reach further (see [Text Effects](./text-effects.md)). |
| `--texture-width <n>`            | `512`    | Atlas texture width, in pixels.                                                                                                        |
| `--texture-height <n>`           | `512`    | Atlas texture height, in pixels.                                                                                                       |
| `--help`, `-h`                   |          | Print usage.                                                                                                                           |

## Choosing a charset

The atlas contains only the characters in `--charset`. A character that
isn't in the atlas is skipped when text is drawn: it gets no glyph and no
space. Every character takes room in the texture, so a large character
set (accented Latin, Cyrillic, CJK) needs a larger texture or a smaller
`--size`.

For a font that only draws a few characters, pass them as a literal
string:

```bash
npx forge-generate-font-atlas --font heading.ttf --charset "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789" --out assets/fonts/heading
```

For a long list, or one shared by several fonts, pass a path to a text file
that contains the characters:

```bash
npx forge-generate-font-atlas --font body.ttf --charset ./charsets/latin-extended.txt --out assets/fonts/body
```

:::caution
An atlas is one texture. If the charset doesn't fit in
`--texture-width` by `--texture-height`, the command fails with an error
and writes nothing. Reduce the charset or increase the texture size.
:::
