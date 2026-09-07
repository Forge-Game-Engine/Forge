/**
 * A browser viewport's safe-area insets - the margin, on each edge, that a
 * device's notch, camera cutout, rounded corners, or home indicator
 * obscures - in CSS pixels. See {@link getSafeAreaInsets}.
 */
export interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * The probe element `getSafeAreaInsets` reads `env(safe-area-inset-*)`
 * through. Created lazily on first use and reused for the page's lifetime,
 * rather than creating/removing a DOM element on every call.
 */
let probe: HTMLDivElement | null = null;

function getProbe(): HTMLDivElement {
  if (!probe) {
    probe = document.createElement('div');

    // `position: fixed` anchors the probe to the viewport - the same frame
    // `env(safe-area-inset-*)` itself is defined against - rather than any
    // scrolled/positioned ancestor. Zero size and `visibility: hidden` keep
    // it from affecting layout or painting; `pointer-events: none` keeps it
    // out of hit-testing were it ever visible.
    probe.style.cssText =
      'position:fixed;top:0;left:0;width:0;height:0;visibility:hidden;pointer-events:none;' +
      'padding-top:env(safe-area-inset-top,0px);' +
      'padding-right:env(safe-area-inset-right,0px);' +
      'padding-bottom:env(safe-area-inset-bottom,0px);' +
      'padding-left:env(safe-area-inset-left,0px);';

    document.body.appendChild(probe);
  }

  return probe;
}

/**
 * Reads the browser viewport's current safe-area insets (`env(safe-area-
 * inset-*)`), in CSS pixels - there's no direct JS API for these, so this
 * uses the standard technique of reading them back off a hidden probe
 * element's computed `padding`. Safe to call every frame - the probe
 * element is created once and reused, and reading computed style is cheap.
 *
 * A browser with no notch/cutout (or that doesn't support
 * `env()`) reads as all zeroes, so calling this unconditionally is always
 * safe - no feature-detection needed.
 * @returns The current safe-area insets, in CSS pixels.
 */
export function getSafeAreaInsets(): SafeAreaInsets {
  const style = getComputedStyle(getProbe());

  return {
    top: parseFloat(style.paddingTop) || 0,
    right: parseFloat(style.paddingRight) || 0,
    bottom: parseFloat(style.paddingBottom) || 0,
    left: parseFloat(style.paddingLeft) || 0,
  };
}
