import { Color } from '@forge-game-engine/forge/rendering';
import type { UiRenderableEcsComponent } from '@forge-game-engine/forge/ui';

export interface ShowcaseTheme {
  name: string;
  panelTint: Color;
  accentTint: Color;
  borderColor: Color;
  textColor: Color;
}

export const showcaseThemes: ShowcaseTheme[] = [
  {
    name: 'Slate',
    panelTint: new Color(0.16, 0.17, 0.2, 1),
    accentTint: new Color(0.25, 0.55, 0.95, 1),
    borderColor: new Color(0.35, 0.38, 0.45, 1),
    textColor: Color.white,
  },
  {
    name: 'Parchment',
    panelTint: new Color(0.93, 0.89, 0.78, 1),
    accentTint: new Color(0.72, 0.36, 0.18, 1),
    borderColor: new Color(0.55, 0.47, 0.35, 1),
    textColor: new Color(0.2, 0.15, 0.1, 1),
  },
  {
    name: 'Mint',
    panelTint: new Color(0.9, 0.98, 0.94, 1),
    accentTint: new Color(0.1, 0.6, 0.45, 1),
    borderColor: new Color(0.55, 0.75, 0.65, 1),
    textColor: new Color(0.05, 0.2, 0.15, 1),
  },
];

/**
 * A renderable + the role it plays, so the theme switcher knows which
 * theme color to assign when cycling themes.
 */
export interface ThemedRenderable {
  renderable: UiRenderableEcsComponent;
  role: 'panel' | 'accent';
}

export function applyTheme(
  themedRenderables: ThemedRenderable[],
  theme: ShowcaseTheme,
): void {
  for (const { renderable, role } of themedRenderables) {
    renderable.tintColor = role === 'panel' ? theme.panelTint : theme.accentTint;
    renderable.borderColor = theme.borderColor;
  }
}
