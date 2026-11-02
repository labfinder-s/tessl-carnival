import { describe, expect, it } from 'vitest';
import {
  CASTS,
  CAST_TIME,
  CATCH_RADIUS,
  DUCK_NUMBERS,
  DUCK_SPEED,
  STREAM,
  cast,
  createState,
  duckUnder,
  positionOnStream,
  step,
  streamLength,
} from './game';

/** Puts a single duck with `value` at the start of the stream and returns where it sits. */
function oneDuck(value: number) {
  const state = createState();
  state.ducks = [{ distance: 0, value }];
  return { state, at: positionOnStream(0) };
}

describe('hook a duck', () => {
  it('starts with every duck on the stream, all casts left and no score', () => {
    const state = createState();
    expect(state.ducks.map((d) => d.value)).toEqual(DUCK_NUMBERS);
    expect(state.casts).toBe(CASTS);
    expect(state.score).toBe(0);
    expect(state.phase).toBe('playing');
  });

  it('floats the ducks round the stream in a loop', () => {
    const state = createState();
    state.ducks = [{ distance: streamLength() - 10, value: 1 }];
    step(state, 20 / DUCK_SPEED);
    expect(state.ducks[0].distance).toBeCloseTo(10);
  });

  it('keeps every point of the loop on the stream', () => {
    const { centerX, centerY, straight, radius } = STREAM;
    for (let d = 0; d < streamLength(); d += 17) {
      const { x, y } = positionOnStream(d);
      const nearestX = Math.max(centerX - straight / 2, Math.min(x, centerX + straight / 2));
      expect(Math.hypot(x - nearestX, y - centerY)).toBeCloseTo(radius);
    }
  });

  it('uses one cast each time the hook goes down', () => {
    const state = createState();
    expect(cast(state, 100, 100)).toBe(true);
    expect(state.casts).toBe(CASTS - 1);
    expect(state.hook).not.toBeNull();
  });

  it('cannot cast again while the hook is still going down', () => {
    const state = createState();
    cast(state, 100, 100);
    expect(cast(state, 100, 100)).toBe(false);
    expect(state.casts).toBe(CASTS - 1);
  });

  it('cannot cast once the casts are used up', () => {
    const state = createState();
    state.casts = 0;
    expect(cast(state, 100, 100)).toBe(false);
    expect(state.hook).toBeNull();
  });

  it('scores the number on the duck the hook lands on', () => {
    const { state, at } = oneDuck(5);
    state.ducks[0].distance = -DUCK_SPEED * CAST_TIME;
    cast(state, at.x, at.y);
    step(state, CAST_TIME);
    expect(state.score).toBe(5);
    expect(state.hook).toBeNull();
  });

  it('scores nothing when the hook lands on open water', () => {
    const { state, at } = oneDuck(5);
    cast(state, at.x, at.y + CATCH_RADIUS * 3);
    step(state, CAST_TIME);
    expect(state.score).toBe(0);
  });

  it('only checks for a duck once the hook reaches the water', () => {
    const { state, at } = oneDuck(5);
    cast(state, at.x, at.y);
    step(state, 0);
    expect(state.score).toBe(0);
    expect(state.hook).not.toBeNull();
  });

  it('hooks the closest duck when two are in reach', () => {
    const { state, at } = oneDuck(1);
    state.ducks.push({ distance: 10, value: 10 });
    expect(duckUnder(state, at.x + 9, at.y)?.value).toBe(10);
    expect(duckUnder(state, at.x + 1, at.y)?.value).toBe(1);
  });

  it('ends the round when the casts are used up and the hook is back', () => {
    const state = createState();
    state.casts = 1;
    cast(state, 100, 100);
    step(state, CAST_TIME / 2);
    expect(state.phase).toBe('playing');
    step(state, CAST_TIME);
    expect(state.phase).toBe('over');
  });

  it('cannot cast after the round is over', () => {
    const state = createState();
    state.phase = 'over';
    expect(cast(state, 100, 100)).toBe(false);
  });
});
