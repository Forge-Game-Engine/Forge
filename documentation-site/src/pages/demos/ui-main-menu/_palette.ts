import { Color } from '@forge-game-engine/forge/rendering';

/**
 * The reference design's flat sci-fi palette ("TSN Fleet Command"): a dark
 * void background, a lighter panel tone for raised surfaces, a muted border
 * tone for structural rules/left-border accents, a primary blue accent, a
 * yellow CTA/secondary accent, and an ink body-text tone. Every label/panel/
 * button in this demo pulls its color from here, so the whole screen reads
 * as one consistent system instead of each file picking its own one-off
 * tints.
 */
export const fleetCommandPalette = {
  void: new Color(0.039, 0.078, 0.125, 1),
  panel: new Color(0.059, 0.129, 0.208, 1),
  border: new Color(0.137, 0.31, 0.494, 1),
  blue: new Color(0.184, 0.561, 0.878, 1),
  yellow: new Color(1, 0.773, 0.192, 1),
  ink: new Color(0.918, 0.953, 0.984, 1),
};
