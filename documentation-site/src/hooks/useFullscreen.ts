import { RefObject, useCallback, useEffect, useState } from 'react';

interface UseFullscreenResult {
  isFullscreen: boolean;
  toggleFullscreen: () => void;
}

type UseFullscreenHook = (
  elementRef: RefObject<HTMLElement | null>,
) => UseFullscreenResult;

export const useFullscreen: UseFullscreenHook = (elementRef) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = (): void => {
      setIsFullscreen(document.fullscreenElement === elementRef.current);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener(
        'fullscreenchange',
        handleFullscreenChange,
      );
    };
  }, [elementRef]);

  const toggleFullscreen = useCallback((): void => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();

      return;
    }

    void elementRef.current?.requestFullscreen();
  }, [elementRef]);

  return { isFullscreen, toggleFullscreen };
};
