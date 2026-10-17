import { RefObject, useEffect } from 'react';

const pageScrollKeys = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  ' ',
  'PageUp',
  'PageDown',
]);

/**
 * Stops the keys that scroll the page from scrolling it while `elementRef`
 * has focus, so playing a demo with the arrow keys or space doesn't move
 * the page. The engine's keyboard input listens on the whole page, so the
 * game still receives the keys.
 */
export const usePreventPageScrollKeys = (
  elementRef: RefObject<HTMLElement | null>,
): void => {
  useEffect(() => {
    const element = elementRef.current;

    if (!element) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (pageScrollKeys.has(event.key)) {
        event.preventDefault();
      }
    };

    element.addEventListener('keydown', handleKeyDown);

    return () => {
      element.removeEventListener('keydown', handleKeyDown);
    };
  }, [elementRef]);
};
