import React, { FC } from 'react';
import {
  DemoChoice,
  DemoSettings,
  DemoSettingsSection,
  DemoSlider,
  DemoTextField,
  DemoToggle,
} from '@site/src/components/demo-page';
import {
  TextHorizontalAlign,
  TextVerticalAlign,
} from '@forge-game-engine/forge/text';
import {
  playgroundMaxWrapWidth,
  PlaygroundSettings,
} from './_create-playground';

const horizontalAlignOptions: { value: TextHorizontalAlign; label: string }[] =
  [
    { value: 'left', label: 'Left' },
    { value: 'center', label: 'Center' },
    { value: 'right', label: 'Right' },
    { value: 'justify', label: 'Justify' },
  ];

const verticalAlignOptions: { value: TextVerticalAlign; label: string }[] = [
  { value: 'top', label: 'Top' },
  { value: 'capline', label: 'Capline' },
  { value: 'middle', label: 'Middle' },
  { value: 'baseline', label: 'Baseline' },
  { value: 'bottom', label: 'Bottom' },
];

const oneDecimal = (value: number): string => value.toFixed(1);

interface PlaygroundControlsProps {
  settings: PlaygroundSettings;
  onChange: (change: Partial<PlaygroundSettings>) => void;
}

/**
 * The settings beside the text demo's canvas. Each change is written into
 * the running text straight away.
 */
export const PlaygroundControls: FC<PlaygroundControlsProps> = ({
  settings,
  onChange,
}) => {
  return (
    <DemoSettings>
      <DemoTextField
        label="Text"
        rows={3}
        value={settings.text}
        onChange={(text) => onChange({ text })}
      />
      <DemoToggle
        label="Rich text tags (<b>, <color>)"
        checked={settings.richText}
        onChange={(richText) => onChange({ richText })}
      />

      <DemoSettingsSection title="Layout">
        <DemoSlider
          label="Size"
          value={settings.size}
          min={12}
          max={64}
          onChange={(size) => onChange({ size })}
        />
        <DemoSlider
          label="Wrap width"
          value={settings.wrapWidth}
          min={120}
          max={playgroundMaxWrapWidth}
          onChange={(wrapWidth) => onChange({ wrapWidth })}
        />
        <DemoSlider
          label="Line height"
          value={settings.lineHeight}
          min={0.6}
          max={2}
          step={0.1}
          format={oneDecimal}
          onChange={(lineHeight) => onChange({ lineHeight })}
        />
        <DemoChoice
          label="Horizontal align"
          value={settings.horizontalAlign}
          options={horizontalAlignOptions}
          onChange={(horizontalAlign) => onChange({ horizontalAlign })}
        />
        <DemoChoice
          label="Vertical align (to the orange line)"
          value={settings.verticalAlign}
          options={verticalAlignOptions}
          onChange={(verticalAlign) => onChange({ verticalAlign })}
        />
      </DemoSettingsSection>

      <DemoSettingsSection title="Effects">
        <DemoToggle
          label="Outline"
          checked={settings.outline}
          onChange={(outline) => onChange({ outline })}
        >
          <DemoSlider
            label="Width"
            value={settings.outlineWidth}
            min={0.1}
            max={4}
            step={0.1}
            format={oneDecimal}
            onChange={(outlineWidth) => onChange({ outlineWidth })}
          />
        </DemoToggle>
        <DemoToggle
          label="Glow"
          checked={settings.glow}
          onChange={(glow) => onChange({ glow })}
        >
          <DemoSlider
            label="Offset X"
            value={settings.glowOffsetX}
            min={-3}
            max={3}
            step={0.1}
            format={oneDecimal}
            onChange={(glowOffsetX) => onChange({ glowOffsetX })}
          />
          <DemoSlider
            label="Offset Y"
            value={settings.glowOffsetY}
            min={-3}
            max={3}
            step={0.1}
            format={oneDecimal}
            onChange={(glowOffsetY) => onChange({ glowOffsetY })}
          />
          <DemoSlider
            label="Softness"
            value={settings.glowSoftness}
            min={0}
            max={4}
            step={0.1}
            format={oneDecimal}
            onChange={(glowSoftness) => onChange({ glowSoftness })}
          />
        </DemoToggle>
      </DemoSettingsSection>
    </DemoSettings>
  );
};
