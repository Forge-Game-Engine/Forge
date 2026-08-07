# Liberation Sans MSDF atlas

`liberation-sans-msdf.png` + `liberation-sans-msdf.json` were generated from
`LiberationSans-Regular.ttf` (SIL Open Font License 1.1, see `OFL.txt`)
using [`msdf-atlas-gen`](https://github.com/Chlumsky/msdf-atlas-gen) v1.4.0:

```sh
msdf-atlas-gen \
  -font LiberationSans-Regular.ttf \
  -type msdf -format png \
  -imageout liberation-sans-msdf.png \
  -json liberation-sans-msdf.json \
  -size 48 -pxrange 4 -yorigin bottom
```

Used by the [Text demo](../../src/pages/demos/text) as the sample font for
`@forge-game-engine/forge/text`. Regenerate with the same command (pointed
at an updated font file, or with a different `-charset` if the demo needs
characters outside the default ASCII set) to refresh these assets.
