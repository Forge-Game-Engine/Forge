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
    const currentTime = 1000;
    time.update(currentTime);

    expect(time.frames).toBe(1);
    expect(time.rawTimeInMilliseconds).toBe(currentTime);
    expect(time.rawDeltaTimeInMilliseconds).toBe(currentTime);
    expect(time.deltaTimeInMilliseconds).toBe(currentTime);
    expect(time.timeInMilliseconds).toBe(currentTime);
    expect(time.previousTimeInMilliseconds).toBe(0);
    expect(time.times).toEqual([currentTime]);

    expect(time.rawTimeInSeconds).toBeCloseTo(1);
    expect(time.rawDeltaTimeInSeconds).toBeCloseTo(1);
    expect(time.deltaTimeInSeconds).toBeCloseTo(1);
    expect(time.timeInSeconds).toBeCloseTo(1);
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
});
