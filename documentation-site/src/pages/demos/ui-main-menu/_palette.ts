import { Color } from '@forge-game-engine/forge/rendering';

/**
 * The reference design's flat sci-fi palette ("TSN Fleet Command"): a dark
 * background tone, two panel-fill tones, a primary accent, a secondary/CTA
 * accent, and a body-text tone. Every label/panel/button in this demo pulls
 * its color from here, so the whole screen reads as one consistent system
 * instead of each file picking its own one-off tints.
 */
export const fleetCommandPalette = {
  void: new Color(0.039, 0.078, 0.125, 1),
  panel: new Color(0.059, 0.129, 0.208, 1),
  well: new Color(0.082, 0.18, 0.286, 1),
  blue: new Color(0.184, 0.561, 0.878, 1),
  yellow: new Color(1, 0.773, 0.192, 1),
  ink: new Color(0.918, 0.953, 0.984, 1),
};
