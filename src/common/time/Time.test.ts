import { beforeEach, describe, expect, it } from 'vitest';
import { Time } from './Time';

describe('Time', () => {
  let time: Time;

  beforeEach(() => {
    time = new Time();
  });

  it('should initialize with default values', () => {
    expect(time.frames).toBe(0);
    expect(time.rawTimeInMilliseconds).toBe(0);
    expect(time.rawDeltaTimeInMilliseconds).toBe(0);
    expect(time.deltaTimeInMilliseconds).toBe(0);
    expect(time.timeInMilliseconds).toBe(0);
    expect(time.previousTimeInMilliseconds).toBe(0);
    expect(time.timeScale).toBe(1);
    expect(time.times).toEqual([]);

    expect(time.rawTimeInSeconds).toBe(0);
    expect(time.rawDeltaTimeInSeconds).toBe(0);
    expect(time.deltaTimeInSeconds).toBe(0);
    expect(time.timeInSeconds).toBe(0);
    expect(time.previousTimeInSeconds).toBe(0);
  });

  it('should update time-related information', () => {
    const currentTime = 16;
    time.update(currentTime);

    expect(time.frames).toBe(1);
    expect(time.rawTimeInMilliseconds).toBe(currentTime);
    expect(time.rawDeltaTimeInMilliseconds).toBe(currentTime);
    expect(time.deltaTimeInMilliseconds).toBe(currentTime);
    expect(time.timeInMilliseconds).toBe(currentTime);
    expect(time.previousTimeInMilliseconds).toBe(0);
    expect(time.times).toEqual([currentTime]);

    expect(time.rawTimeInSeconds).toBeCloseTo(currentTime / 1000);
    expect(time.rawDeltaTimeInSeconds).toBeCloseTo(currentTime / 1000);
    expect(time.deltaTimeInSeconds).toBeCloseTo(currentTime / 1000);
    expect(time.timeInSeconds).toBeCloseTo(currentTime / 1000);
    expect(time.previousTimeInSeconds).toBe(0);
  });

  it('should update time-related information with time scale', () => {
    const currentTime = 1000;
    const deltaTime = 16;
    const nextFrameTime = currentTime + deltaTime;

    time.update(currentTime);
    time.update(nextFrameTime);

    expect(time.frames).toBe(2);
    expect(time.rawTimeInMilliseconds).toBe(nextFrameTime);
    expect(time.rawDeltaTimeInMilliseconds).toBe(deltaTime);
    expect(time.deltaTimeInMilliseconds).toBe(deltaTime);
    expect(time.timeInMilliseconds).toBe(nextFrameTime);
    expect(time.previousTimeInMilliseconds).toBe(currentTime);
    expect(time.times).toEqual([currentTime, nextFrameTime]);

    expect(time.rawTimeInSeconds).toBeCloseTo(nextFrameTime / 1000);
    expect(time.rawDeltaTimeInSeconds).toBeCloseTo(deltaTime / 1000);
    expect(time.deltaTimeInSeconds).toBeCloseTo(deltaTime / 1000);
    expect(time.timeInSeconds).toBeCloseTo(nextFrameTime / 1000);
    expect(time.previousTimeInSeconds).toBeCloseTo(currentTime / 1000);
  });

  it('should remove old times from the times array', () => {
    const currentTime = 1000;
    time.update(currentTime);
    time.update(currentTime + 2000);

    expect(time.times).toEqual([currentTime + 2000]);
    expect(time.rawTimeInSeconds).toBeCloseTo((currentTime + 2000) / 1000);
  });

  it('should update time-related information with reduced time scale', () => {
    const currentTime = 1000;
    const deltaTime = 16;
    const nextFrameTime = currentTime + deltaTime;

    time.update(currentTime);

    time.timeScale = 0.5;
    time.update(nextFrameTime);

    expect(time.frames).toBe(2);
    expect(time.rawTimeInMilliseconds).toBe(nextFrameTime);
    expect(time.rawDeltaTimeInMilliseconds).toBe(16);
    expect(time.deltaTimeInMilliseconds).toBe(8); // 50% of rawDeltaTime
    expect(time.timeInMilliseconds).toBe(1008); // 1000 (initial) + 8 (scaled deltaTime)
    expect(time.previousTimeInMilliseconds).toBe(currentTime);
    expect(time.times).toEqual([currentTime, nextFrameTime]);

    expect(time.rawTimeInSeconds).toBeCloseTo(nextFrameTime / 1000);
    expect(time.rawDeltaTimeInSeconds).toBeCloseTo(16 / 1000);
    expect(time.deltaTimeInSeconds).toBeCloseTo(8 / 1000); // 50% of rawDeltaTimeInSeconds
    expect(time.timeInSeconds).toBeCloseTo(1 + 8 / 1000); // 1 (initial) + 8/1000 (scaled deltaTimeInSeconds)
    expect(time.previousTimeInSeconds).toBeCloseTo(currentTime / 1000);
  });

  it('should clamp an oversized delta time to the maximum, without clamping the raw delta', () => {
    const currentTime = 1000;
    const hitchTime = currentTime + 5000; // a 5 second stall/hitch

    time.update(currentTime);
    time.update(hitchTime);

    expect(time.rawDeltaTimeInMilliseconds).toBe(5000);
    expect(time.deltaTimeInMilliseconds).toBeCloseTo(1000 / 15);
    expect(time.deltaTimeInSeconds).toBeCloseTo(1 / 15);
    expect(time.timeInMilliseconds).toBeCloseTo(currentTime + 1000 / 15);
  });

  it('should clamp a negative delta time to zero, without clamping the raw delta', () => {
    const currentTime = 1000;
    const earlierTime = currentTime - 200; // an out-of-order timestamp

    time.update(currentTime);
    time.update(earlierTime);

    expect(time.rawDeltaTimeInMilliseconds).toBe(-200);
    expect(time.deltaTimeInMilliseconds).toBe(0);
    expect(time.deltaTimeInSeconds).toBe(0);
    expect(time.timeInMilliseconds).toBe(currentTime);
  });

  describe('fixed timestep', () => {
    const consumeAllFixedSteps = (): number => {
      let steps = 0;

      while (time.consumeFixedStep()) {
        steps++;
      }

      return steps;
    };

    it('should default the fixed delta time to 1/60 of a second', () => {
      expect(time.fixedDeltaTimeInMilliseconds).toBeCloseTo(1000 / 60);
      expect(time.fixedDeltaTimeInSeconds).toBeCloseTo(1 / 60);
      expect(time.isInFixedStep).toBe(false);
      expect(time.fixedOverstepFraction).toBe(0);
    });

    it('should take 0, 2 and 3 steps for frames of 7, 33 and 50 milliseconds, carrying the leftover', () => {
      time.update(1000);

      time.update(1007);
      expect(consumeAllFixedSteps()).toBe(0);

      time.update(1040);
      let steps = 0;

      while (time.consumeFixedStep()) {
        steps++;
        expect(time.deltaTimeInSeconds).toBeCloseTo(1 / 60);
        expect(time.deltaTimeInMilliseconds).toBeCloseTo(1000 / 60);
      }

      expect(steps).toBe(2);

      time.update(1090);
      steps = 0;

      while (time.consumeFixedStep()) {
        steps++;
        expect(time.deltaTimeInSeconds).toBeCloseTo(1 / 60);
      }

      expect(steps).toBe(3);
      expect(time.fixedOverstepFraction).toBeCloseTo(
        (90 - 5 * (1000 / 60)) / (1000 / 60),
      );
    });

    it.each([
      { frameDelta: 5, steps: 0, overstepFraction: 0.5 },
      { frameDelta: 10, steps: 1, overstepFraction: 0 },
      { frameDelta: 25, steps: 2, overstepFraction: 0.5 },
    ])(
      'should take $steps steps for a $frameDelta millisecond frame with a 10 millisecond fixed delta time',
      ({ frameDelta, steps, overstepFraction }) => {
        time.fixedDeltaTimeInMilliseconds = 10;
        time.update(1000);
        time.update(1000 + frameDelta);

        expect(consumeAllFixedSteps()).toBe(steps);
        expect(time.fixedOverstepFraction).toBe(overstepFraction);
      },
    );

    it('should carry the leftover time to the next frame', () => {
      time.fixedDeltaTimeInMilliseconds = 10;
      time.update(1000);

      time.update(1006);
      expect(consumeAllFixedSteps()).toBe(0);

      time.update(1012);
      expect(consumeAllFixedSteps()).toBe(1);
      expect(time.fixedOverstepFraction).toBeCloseTo(0.2);
    });

    it('should take no steps while the time scale is 0', () => {
      time.fixedDeltaTimeInMilliseconds = 10;
      time.timeScale = 0;
      time.update(1000);
      time.update(1050);
      time.update(1100);

      expect(consumeAllFixedSteps()).toBe(0);
      expect(time.fixedOverstepFraction).toBe(0);
    });

    it('should feed the scaled delta time when the time scale is 0.5', () => {
      time.fixedDeltaTimeInMilliseconds = 10;
      time.timeScale = 0.5;
      time.update(1000);
      time.update(1040);

      expect(consumeAllFixedSteps()).toBe(2);
      expect(time.fixedOverstepFraction).toBe(0);
    });

    it('should feed nothing on the first update', () => {
      time.update(5000);

      expect(consumeAllFixedSteps()).toBe(0);
      expect(time.fixedOverstepFraction).toBe(0);
    });

    it('should report the fixed clock only while a fixed step is running', () => {
      time.fixedDeltaTimeInMilliseconds = 10;
      time.update(5000);
      time.update(5020);

      expect(time.consumeFixedStep()).toBe(true);
      expect(time.isInFixedStep).toBe(true);
      expect(time.deltaTimeInMilliseconds).toBe(10);
      expect(time.deltaTimeInSeconds).toBeCloseTo(0.01);
      expect(time.timeInMilliseconds).toBe(5010);
      expect(time.timeInSeconds).toBeCloseTo(5.01);
      expect(time.rawDeltaTimeInMilliseconds).toBe(20);
      expect(time.rawTimeInMilliseconds).toBe(5020);
      expect(time.frames).toBe(2);
      expect(time.timeScale).toBe(1);

      expect(time.consumeFixedStep()).toBe(true);
      expect(time.timeInMilliseconds).toBe(5020);

      expect(time.consumeFixedStep()).toBe(false);
      expect(time.isInFixedStep).toBe(false);
      expect(time.deltaTimeInMilliseconds).toBe(20);
      expect(time.deltaTimeInSeconds).toBeCloseTo(0.02);
      expect(time.timeInMilliseconds).toBe(5020);
      expect(time.timeInSeconds).toBeCloseTo(5.02);
    });

    it('should keep the accumulated time and the running step size when the fixed delta time changes', () => {
      time.fixedDeltaTimeInMilliseconds = 10;
      time.update(1000);
      time.update(1030);

      expect(time.consumeFixedStep()).toBe(true);

      time.fixedDeltaTimeInMilliseconds = 20;

      expect(time.deltaTimeInMilliseconds).toBe(10);
      expect(time.consumeFixedStep()).toBe(true);
      expect(time.deltaTimeInMilliseconds).toBe(20);
      expect(time.timeInMilliseconds).toBe(1030);
      expect(time.consumeFixedStep()).toBe(false);
      expect(time.fixedOverstepFraction).toBe(0);
    });

    it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
      'should throw for a fixed delta time of %s',
      (value) => {
        expect(() => {
          time.fixedDeltaTimeInMilliseconds = value;
        }).toThrow('must be finite and greater than 0');
        expect(time.fixedDeltaTimeInMilliseconds).toBeCloseTo(1000 / 60);
      },
    );

    it('should throw when updated while a fixed step is running', () => {
      time.fixedDeltaTimeInMilliseconds = 10;
      time.update(1000);
      time.update(1020);
      time.consumeFixedStep();

      expect(() => time.update(1030)).toThrow('fixed step is running');
    });
  });
});
