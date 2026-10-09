/**
 * What kind of code a demo source file holds, worked out from its name:
 * `*.component.ts` and `*.system.ts` are ECS components and systems,
 * `*.shader.*` and `*.glsl` are shaders, and everything else sets up the
 * game.
 */
export type DemoFileType = 'component' | 'system' | 'shader' | 'setup';

interface DemoFileTypeInfo {
  label: string;
  pluralLabel: string;
  icon: string;
}

export const demoFileTypes: Record<DemoFileType, DemoFileTypeInfo> = {
  setup: { label: 'Setup', pluralLabel: 'Setup', icon: 'fa-wrench' },
  component: { label: 'Component', pluralLabel: 'Components', icon: 'fa-cube' },
  system: { label: 'System', pluralLabel: 'Systems', icon: 'fa-gears' },
  shader: { label: 'Shader', pluralLabel: 'Shaders', icon: 'fa-palette' },
};

export const demoFileTypeOrder: readonly DemoFileType[] = [
  'setup',
  'component',
  'system',
  'shader',
];

export const getDemoFileType = (fileName: string): DemoFileType => {
  if (fileName.includes('.component.')) {
    return 'component';
  }

  if (fileName.includes('.system.')) {
    return 'system';
  }

  if (fileName.includes('.shader.') || fileName.endsWith('.glsl')) {
    return 'shader';
  }

  return 'setup';
};
