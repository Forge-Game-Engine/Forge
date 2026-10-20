# Sprite atlas

`sprite-atlas.png` and `sprite-atlas.json` are the texture atlas the
sprite atlas demo (`src/pages/demos/sprite-atlas`) loads. The JSON is in
TexturePacker's "JSON (Hash)" format.

## License

Every image in the atlas is [Kenney](https://kenney.nl) art, licensed
[CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/), from packs
already in this folder's parent: the
[Pirate Pack](https://kenney.nl/assets/pirate-pack)
(`../kenney_pirate-pack/License.txt`) and
[Fantasy UI Borders](https://kenney.nl/assets/fantasy-ui-borders)
(`../kenney_fantasy-ui-borders/License.txt`). The atlas is CC0 1.0 too.

## How it was made

A one-off script packed the atlas in a browser canvas and wrote the JSON
in the TexturePacker "JSON (Hash)" layout. TexturePacker and free-tex-packer
weren't used, but the settings match these options in either one:

- Trim: on, except for `panel`, which is nine-sliced and so must stay
  untrimmed. A frame trims to the bounds of its pixels with alpha above `0`.
- Rotation: off.
- Premultiplied alpha: off.
- Padding: 2 px between frames and from the atlas's edges.
- Extrusion: 1 px, around every frame.
- Sprite names: trimmed, without `.png`.
- Pivot: `(0.5, 0.5)`, except `fire_1` and `fire_2`, which pivot at
  `(0.5, 1)`, the base of the flame.

To change the atlas, pack the source images below with these settings and
the region names in the table, then replace both files.

## Sources

Paths are relative to `../kenney_pirate-pack/PNG/Default size/` unless
they start with `kenney_`.

| Region                   | Source                                                       |
| ------------------------ | ------------------------------------------------------------ |
| `island_1` to `island_3` | `Tiles/tile_01.png` to `tile_03.png`                         |
| `island_4` to `island_6` | `Tiles/tile_17.png` to `tile_19.png`                         |
| `island_7` to `island_9` | `Tiles/tile_33.png` to `tile_35.png`                         |
| `rock_1` to `rock_3`     | `Tiles/tile_49.png` to `tile_51.png`                         |
| `mossy_rock_1` to `_3`   | `Tiles/tile_65.png` to `tile_67.png`                         |
| `palm_1` to `palm_3`     | `Tiles/tile_70.png` to `tile_72.png`                         |
| `sprig_1`, `sprig_2`     | `Tiles/tile_87.png`, `tile_88.png`                           |
| `plank_1` to `plank_4`   | `Ship parts/wood (1).png` to `wood (4).png`                  |
| `cannon`                 | `Ship parts/cannon.png`                                      |
| `cannon_ball`            | `Ship parts/cannonBall.png`                                  |
| `ship_1` to `ship_6`     | `Ships/ship (1).png` to `ship (6).png`                       |
| `dinghy_1` to `dinghy_3` | `Ships/dinghySmall1.png` to `dinghySmall3.png`               |
| `fire_1`, `fire_2`       | `Effects/fire1.png`, `fire2.png`                             |
| `explosion_1` to `_3`    | `Effects/explosion3.png`, `explosion2.png`, `explosion1.png` |
| `panel`                  | `kenney_fantasy-ui-borders/PNG/Double/Panel/panel-030.png`   |

The two animations are drawn on one canvas size per animation before
trimming, so their frames share an untrimmed size:

- `fire_1` and `fire_2` are centered horizontally and placed at the bottom
  of a 20 x 40 px canvas.
- `explosion_1` to `explosion_3` are centered in a 76 x 76 px canvas. They
  are numbered smallest first, the order the explosion grows in, which is
  the reverse of Kenney's file names.
