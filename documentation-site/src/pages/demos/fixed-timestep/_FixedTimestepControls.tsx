import React, { FC, MutableRefObject, useEffect, useState } from 'react';
import {
  DemoChoice,
  DemoSettings,
  DemoSettingsSection,
} from '@site/src/components/demo-page';
import {
  defaultStepRate,
  simulateHitch,
  StepRate,
  stepRates,
} from './_controls';
import { FixedTimestepDemo } from './_create-game';
import { getFixedStepsThisFrame } from './_fixed-step-counter.component';
import styles from './_FixedTimestepControls.module.css';

const stepRateOptions = stepRates.map((rate) => ({
  value: String(rate),
  label: `${rate} Hz`,
}));

// A catch-up burst lasts one frame, too short to read, so the panel also
// shows the most steps any frame ran over this window.
const peakWindowMilliseconds = 2000;

interface Readout {
  steps: number;
  peakSteps: number;
  overstepFraction: number;
}

const emptyReadout: Readout = { steps: 0, peakSteps: 0, overstepFraction: 0 };

/**
 * Reads the running demo's step count and overstep fraction on every
 * animation frame.
 * @param demoRef - The running demo, or `null` before it's ready.
 * @returns The latest readout.
 */
const useReadout = (
  demoRef: MutableRefObject<FixedTimestepDemo | null>,
): Readout => {
  const [readout, setReadout] = useState(emptyReadout);

  useEffect(() => {
    const samples: { at: number; steps: number }[] = [];
    let frameRequest = 0;

    const sample = (now: number): void => {
      frameRequest = requestAnimationFrame(sample);

      const demo = demoRef.current;

      if (!demo) {
        return;
      }

      const steps = getFixedStepsThisFrame(demo.stepCounter, demo.time);

      samples.push({ at: now, steps });

      while (samples[0].at < now - peakWindowMilliseconds) {
        samples.shift();
      }

      setReadout({
        steps,
        peakSteps: Math.max(...samples.map((s) => s.steps)),
        overstepFraction: demo.time.fixedOverstepFraction,
      });
    };

    frameRequest = requestAnimationFrame(sample);

    return () => cancelAnimationFrame(frameRequest);
  }, [demoRef]);

  return readout;
};

interface FixedTimestepControlsProps {
  demoRef: MutableRefObject<FixedTimestepDemo | null>;
  stepRate: StepRate;
  onStepRateChange: (stepRate: StepRate) => void;
}

/**
 * The settings and readout beside the fixed timestep demo's canvas.
 */
export const FixedTimestepControls: FC<FixedTimestepControlsProps> = ({
  demoRef,
  stepRate,
  onStepRateChange,
}) => {
  const readout = useReadout(demoRef);

  return (
    <DemoSettings>
      <DemoChoice
        label="Fixed step rate"
        value={String(stepRate)}
        options={stepRateOptions}
        onChange={(value) =>
          onStepRateChange(
            stepRates.find((rate) => String(rate) === value) ?? defaultStepRate,
          )
        }
      />
      <button
        type="button"
        className="button button--secondary button--sm button--block"
        onClick={() => simulateHitch()}
      >
        Simulate a 200 ms hitch
      </button>

      <DemoSettingsSection title="Last frame">
        <dl className={styles.readout}>
          <dt>Fixed steps</dt>
          <dd>{readout.steps}</dd>
          <dt>Most in one frame (2 s)</dt>
          <dd>{readout.peakSteps}</dd>
          <dt>Overstep fraction</dt>
          <dd>{readout.overstepFraction.toFixed(2)}</dd>
        </dl>
      </DemoSettingsSection>
    </DemoSettings>
  );
};
