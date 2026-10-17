import type { TrailSettings } from './components/trail-component.js';

const positiveSettings = [
  'lifetimeSeconds',
  'minVertexDistance',
  'tileLength',
] as const;

const widthSettings = ['startWidth', 'endWidth'] as const;

/**
 * Throws if a trail's settings are out of range. Called when a trail is
 * added, and by the trail system every frame, since game code can change
 * them at any time.
 * @param settings - The trail's settings.
 * @param entity - The trail's entity, named in the error.
 * @throws An error naming the setting that's out of range.
 */
export function validateTrailSettings(
  settings: TrailSettings,
  entity: number,
): void {
  for (const name of positiveSettings) {
    const value = settings[name];

    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(
        `Invalid trail on entity ${entity}: ${name} is "${value}", it must be a finite number greater than 0.`,
      );
    }
  }

  for (const name of widthSettings) {
    const value = settings[name];

    if (!Number.isFinite(value) || value < 0) {
      throw new Error(
        `Invalid trail on entity ${entity}: ${name} is "${value}", it must be a finite number of 0 or more.`,
      );
    }
  }
}
