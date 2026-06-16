import { Vector2 } from '../../math/index.js';

/**
 * A named anchor configuration: the anchor rect corners and a matching pivot.
 */
export interface AnchorPreset {
  /** Normalised (0–1) minimum corner of the anchor rect. */
  anchorMin: Vector2;
  /** Normalised (0–1) maximum corner of the anchor rect. */
  anchorMax: Vector2;
  /** Normalised pivot that matches the anchor position. */
  pivot: Vector2;
}

/**
 * Named anchor presets for {@link UiTransformEcsComponent}.
 *
 * Point anchors (`anchorMin === anchorMax`) position the element relative to a
 * single point in the parent. Stretch anchors (`anchorMin !== anchorMax`) let
 * the element resize with the parent; use `offsetMin`/`offsetMax` as margins.
 *
 * All Vector2 instances are created fresh per access; mutating them does not
 * affect future calls.
 */
export const anchorPresets = {
  // --- Point anchors (corners and edges) ---

  /** Top-left corner of the parent. */
  get topLeft(): AnchorPreset {
    return {
      anchorMin: new Vector2(0, 0),
      anchorMax: new Vector2(0, 0),
      pivot: new Vector2(0, 0),
    };
  },

  /** Top-centre edge of the parent. */
  get topCenter(): AnchorPreset {
    return {
      anchorMin: new Vector2(0.5, 0),
      anchorMax: new Vector2(0.5, 0),
      pivot: new Vector2(0.5, 0),
    };
  },

  /** Top-right corner of the parent. */
  get topRight(): AnchorPreset {
    return {
      anchorMin: new Vector2(1, 0),
      anchorMax: new Vector2(1, 0),
      pivot: new Vector2(1, 0),
    };
  },

  /** Middle-left edge of the parent. */
  get middleLeft(): AnchorPreset {
    return {
      anchorMin: new Vector2(0, 0.5),
      anchorMax: new Vector2(0, 0.5),
      pivot: new Vector2(0, 0.5),
    };
  },

  /** Centre of the parent. */
  get center(): AnchorPreset {
    return {
      anchorMin: new Vector2(0.5, 0.5),
      anchorMax: new Vector2(0.5, 0.5),
      pivot: new Vector2(0.5, 0.5),
    };
  },

  /** Middle-right edge of the parent. */
  get middleRight(): AnchorPreset {
    return {
      anchorMin: new Vector2(1, 0.5),
      anchorMax: new Vector2(1, 0.5),
      pivot: new Vector2(1, 0.5),
    };
  },

  /** Bottom-left corner of the parent. */
  get bottomLeft(): AnchorPreset {
    return {
      anchorMin: new Vector2(0, 1),
      anchorMax: new Vector2(0, 1),
      pivot: new Vector2(0, 1),
    };
  },

  /** Bottom-centre edge of the parent. */
  get bottomCenter(): AnchorPreset {
    return {
      anchorMin: new Vector2(0.5, 1),
      anchorMax: new Vector2(0.5, 1),
      pivot: new Vector2(0.5, 1),
    };
  },

  /** Bottom-right corner of the parent. */
  get bottomRight(): AnchorPreset {
    return {
      anchorMin: new Vector2(1, 1),
      anchorMax: new Vector2(1, 1),
      pivot: new Vector2(1, 1),
    };
  },

  // --- Stretch anchors ---

  /** Fills the entire parent (all edges stretch). */
  get stretchAll(): AnchorPreset {
    return {
      anchorMin: new Vector2(0, 0),
      anchorMax: new Vector2(1, 1),
      pivot: new Vector2(0.5, 0.5),
    };
  },

  /** Stretches horizontally, fixed height at vertical centre. */
  get stretchHorizontal(): AnchorPreset {
    return {
      anchorMin: new Vector2(0, 0.5),
      anchorMax: new Vector2(1, 0.5),
      pivot: new Vector2(0.5, 0.5),
    };
  },

  /** Stretches vertically, fixed width at horizontal centre. */
  get stretchVertical(): AnchorPreset {
    return {
      anchorMin: new Vector2(0.5, 0),
      anchorMax: new Vector2(0.5, 1),
      pivot: new Vector2(0.5, 0.5),
    };
  },

  /** Stretches along the top edge of the parent. */
  get topStretch(): AnchorPreset {
    return {
      anchorMin: new Vector2(0, 0),
      anchorMax: new Vector2(1, 0),
      pivot: new Vector2(0.5, 0),
    };
  },

  /** Stretches along the bottom edge of the parent. */
  get bottomStretch(): AnchorPreset {
    return {
      anchorMin: new Vector2(0, 1),
      anchorMax: new Vector2(1, 1),
      pivot: new Vector2(0.5, 1),
    };
  },

  /** Stretches along the left edge of the parent. */
  get leftStretch(): AnchorPreset {
    return {
      anchorMin: new Vector2(0, 0),
      anchorMax: new Vector2(0, 1),
      pivot: new Vector2(0, 0.5),
    };
  },

  /** Stretches along the right edge of the parent. */
  get rightStretch(): AnchorPreset {
    return {
      anchorMin: new Vector2(1, 0),
      anchorMax: new Vector2(1, 1),
      pivot: new Vector2(1, 0.5),
    };
  },
} as const;
