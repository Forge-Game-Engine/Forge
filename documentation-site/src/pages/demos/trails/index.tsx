import React, { JSX, useCallback, useRef, useState } from 'react';
import { createTrailsGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import createTrailsCode from '!!raw-loader!./_create-trails';
import trailSettingsCode from '!!raw-loader!./_trail-settings';
import followMouseCode from '!!raw-loader!./_follow-mouse';
import loopingPathComponentCode from '!!raw-loader!./_looping-path.component';
import loopingPathSystemCode from '!!raw-loader!./_looping-path.system';

import {
  DemoChoice,
  DemoPage,
  DemoPanel,
  DemoSettings,
  DemoSettingsSection,
  DemoSlider,
  DemoToggle,
} from '@site/src/components/demo-page';
import type { DemoTrails } from './_create-trails';
import {
  applyTrailSettings,
  ColorPreset,
  defaultTrailSettings,
  EasingName,
  TextureChoice,
  TrailDemoSettings,
  TrailName,
} from './_trail-settings';

const trailOptions: readonly { value: TrailName; label: string }[] = [
  { value: 'cursor', label: 'Mouse' },
  { value: 'textured', label: 'Figure eight' },
  { value: 'glowing', label: 'Circle' },
  { value: 'ship', label: 'Ship' },
];

const colorOptions: readonly { value: ColorPreset; label: string }[] = [
  { value: 'white', label: 'White' },
  { value: 'fire', label: 'Fire' },
  { value: 'ice', label: 'Ice' },
  { value: 'toxic', label: 'Toxic' },
];

const easingOptions: readonly { value: EasingName; label: string }[] = [
  { value: 'linear', label: 'Linear' },
  { value: 'easeInOutSine', label: 'Sine' },
  { value: 'easeInOutQuint', label: 'Quint' },
];

const textureOptions: readonly { value: TextureChoice; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'stretch', label: 'Stretch' },
  { value: 'tile', label: 'Tile' },
];

const formatSeconds = (value: number): string => `${value.toFixed(1)} s`;

export default function Trails(): JSX.Element {
  const trailsRef = useRef<DemoTrails | null>(null);
  const [selected, setSelected] = useState<TrailName>('cursor');
  const [allSettings, setAllSettings] = useState(defaultTrailSettings);
  const settings = allSettings[selected];

  const createGame = useCallback(
    () =>
      createTrailsGame((trails) => {
        trailsRef.current = trails;
      }),
    [],
  );

  const handleChange = (change: Partial<TrailDemoSettings>): void => {
    const next = { ...settings, ...change };

    setAllSettings({ ...allSettings, [selected]: next });

    if (trailsRef.current) {
      applyTrailSettings(
        trailsRef.current.trails[selected],
        next,
        trailsRef.current.pattern,
      );
    }
  };

  return (
    <DemoPage
      slug="trails"
      createGame={createGame}
      controls={[
        {
          inputs: [{ device: 'mouse', label: 'Move' }],
          action: 'Draw the mouse trail',
          detail: 'Leaving and coming back onto the canvas clears it',
        },
      ]}
      panels={
        <DemoPanel title="Trail settings" icon="fa-sliders">
          <DemoSettings>
            <DemoChoice
              label="Trail"
              value={selected}
              options={trailOptions}
              onChange={(trail) => setSelected(trail)}
            />
            <DemoToggle
              label="Emitting"
              checked={settings.emitting}
              onChange={(emitting) => handleChange({ emitting })}
            />
            <DemoSettingsSection title="Length">
              <DemoSlider
                label="Lifetime"
                value={settings.lifetimeSeconds}
                min={0.1}
                max={3}
                step={0.1}
                format={formatSeconds}
                onChange={(lifetimeSeconds) =>
                  handleChange({ lifetimeSeconds })
                }
              />
              <DemoSlider
                label="Min vertex distance"
                value={settings.minVertexDistance}
                min={1}
                max={60}
                onChange={(minVertexDistance) =>
                  handleChange({ minVertexDistance })
                }
              />
            </DemoSettingsSection>
            <DemoSettingsSection title="Width">
              <DemoSlider
                label="Start width"
                value={settings.startWidth}
                min={0}
                max={60}
                onChange={(startWidth) => handleChange({ startWidth })}
              />
              <DemoSlider
                label="End width"
                value={settings.endWidth}
                min={0}
                max={60}
                onChange={(endWidth) => handleChange({ endWidth })}
              />
              <DemoChoice
                label="Width easing"
                value={settings.widthEasing}
                options={easingOptions}
                onChange={(widthEasing) => handleChange({ widthEasing })}
              />
            </DemoSettingsSection>
            <DemoSettingsSection title="Color">
              <DemoChoice
                label="Colors"
                value={settings.colors}
                options={colorOptions}
                onChange={(colors) => handleChange({ colors })}
              />
              <DemoChoice
                label="Color easing"
                value={settings.colorEasing}
                options={easingOptions}
                onChange={(colorEasing) => handleChange({ colorEasing })}
              />
              <DemoToggle
                label="Glow (brighter than white)"
                checked={settings.glow}
                onChange={(glow) => handleChange({ glow })}
              />
            </DemoSettingsSection>
            <DemoSettingsSection title="Texture">
              <DemoChoice
                label="Texture mode"
                value={settings.texture}
                options={textureOptions}
                onChange={(texture) => handleChange({ texture })}
              />
              {settings.texture === 'tile' && (
                <DemoSlider
                  label="Tile length"
                  value={settings.tileLength}
                  min={8}
                  max={120}
                  onChange={(tileLength) => handleChange({ tileLength })}
                />
              )}
            </DemoSettingsSection>
          </DemoSettings>
        </DemoPanel>
      }
      highlights={[
        {
          text: 'Each trail is a trail component on a moving entity. The trail system records where the entity goes and draws the trail as a mesh.',
          file: 'create-trails.ts',
        },
        {
          text: "Every setting is a field of the trail component that the trail system reads each frame, so the panel's changes apply on the next frame.",
          file: 'trail-settings.ts',
        },
        {
          text: 'The camera renders in HDR with bloom over a threshold of 1, so only trails with colors brighter than white glow.',
          file: 'create-game.ts',
        },
        {
          text: "The ship's trail is on the ship's entity and its sprite on a child, so the trail draws behind the ship and over the background.",
          file: 'create-trails.ts',
        },
        {
          text: 'When the mouse comes back onto the canvas, clearTrail drops the old trail so none is drawn across the jump.',
          file: 'follow-mouse.ts',
        },
      ]}
      docLinks={[
        { label: 'Trails', to: '/docs/docs/rendering/trails' },
        { label: 'Bloom', to: '/docs/docs/rendering/bloom' },
        { label: 'Draw order', to: '/docs/docs/rendering/draw-order' },
      ]}
      fileGroups={[
        {
          title: 'Start here',
          files: [
            {
              name: 'create-game.ts',
              summary:
                'Sets up the HDR camera with bloom, the background and the trails, and registers the systems.',
              content: gameCode,
            },
          ],
        },
        {
          title: 'Trails',
          files: [
            {
              name: 'create-trails.ts',
              summary:
                'Creates the four trail entities, their paths and the ship.',
              content: createTrailsCode,
            },
            {
              name: 'trail-settings.ts',
              summary:
                "Each trail's starting settings, and writes the page's settings into a trail.",
              content: trailSettingsCode,
            },
            {
              name: 'follow-mouse.ts',
              summary:
                'Moves the mouse trail to the mouse, and clears it when the mouse comes back onto the canvas.',
              content: followMouseCode,
            },
          ],
        },
        {
          title: 'Movement',
          files: [
            {
              name: 'looping-path.component.ts',
              summary: 'The center, size and speed of a looping path.',
              content: loopingPathComponentCode,
            },
            {
              name: 'looping-path.system.ts',
              summary:
                'Moves entities along their looping paths, turning the ones with a rotation to face where they go.',
              content: loopingPathSystemCode,
            },
          ],
        },
      ]}
    />
  );
}
