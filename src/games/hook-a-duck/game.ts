import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

export const CASTS = 10;
/** Seconds the hook takes to reach the water. */
export const CAST_TIME = 0.35;
/** How close, in pixels, the hook must land to a duck to catch it. */
export const CATCH_RADIUS = 26;
export const DUCK_SPEED = 90;
/** The stream: a loop with two straights and two round ends. */
export const STREAM = {
  centerX: WIDTH / 2,
  centerY: 250,
  straight: 440,
  radius: 120,
} as const;
/** The number on each duck's base, in the order they float. */
export const DUCK_NUMBERS = [1, 2, 5, 1, 3, 1, 2, 10, 1, 3, 2, 1];

export interface Duck {
  /** Distance along the loop, in pixels from the top left of the stream. */
  distance: number;
  value: number;
}

export interface Hook {
  x: number;
  y: number;
  /** 0 when the cast starts, 1 when the hook reaches the water. */
  progress: number;
}

export interface Catch {
  x: number;
  y: number;
  value: number;
  age: number;
}

export interface HookADuckState {
  ducks: Duck[];
  hook: Hook | null;
  catches: Catch[];
  casts: number;
  score: number;
  phase: 'playing' | 'over';
}

export function streamLength(): number {
  return 2 * STREAM.straight + 2 * Math.PI * STREAM.radius;
}

/** Where a duck at `distance` along the loop sits on the canvas. */
export function positionOnStream(distance: number): { x: number; y: number } {
  const { centerX, centerY, straight, radius } = STREAM;
  const length = streamLength();
  let d = ((distance % length) + length) % length;
  const left = centerX - straight / 2;
  const right = centerX + straight / 2;
  const arc = Math.PI * radius;

  // Top straight, left to right.
  if (d < straight) return { x: left + d, y: centerY - radius };
  d -= straight;
  // Right end, top to bottom.
  if (d < arc) {
    const angle = -Math.PI / 2 + d / radius;
    return { x: right + Math.cos(angle) * radius, y: centerY + Math.sin(angle) * radius };
  }
  d -= arc;
  // Bottom straight, right to left.
  if (d < straight) return { x: right - d, y: centerY + radius };
  d -= straight;
  // Left end, bottom to top.
  const angle = Math.PI / 2 + d / radius;
  return { x: left + Math.cos(angle) * radius, y: centerY + Math.sin(angle) * radius };
}

export function createState(): HookADuckState {
  const spacing = streamLength() / DUCK_NUMBERS.length;
  const ducks = DUCK_NUMBERS.map((value, i) => ({ distance: spacing * i, value }));
  return { ducks, hook: null, catches: [], casts: CASTS, score: 0, phase: 'playing' };
}

/** Lowers the hook at the aim point. Returns false if nothing was cast. */
export function cast(state: HookADuckState, x: number, y: number): boolean {
  if (state.phase !== 'playing' || state.casts === 0 || state.hook) return false;
  state.hook = { x, y, progress: 0 };
  state.casts -= 1;
  return true;
}

/** The duck closest to the point, if one is within reach of the hook. */
export function duckUnder(state: HookADuckState, x: number, y: number): Duck | undefined {
  let closest: Duck | undefined;
  let closestGap = CATCH_RADIUS;
  for (const duck of state.ducks) {
    const at = positionOnStream(duck.distance);
    const gap = Math.hypot(at.x - x, at.y - y);
    if (gap <= closestGap) {
      closest = duck;
      closestGap = gap;
    }
  }
  return closest;
}

/** Advances the game by `dt` seconds. */
export function step(state: HookADuckState, dt: number): void {
  const length = streamLength();
  for (const duck of state.ducks) {
    duck.distance = (duck.distance + DUCK_SPEED * dt) % length;
  }

  const hook = state.hook;
  if (hook) {
    hook.progress += dt / CAST_TIME;
    if (hook.progress >= 1) {
      const duck = duckUnder(state, hook.x, hook.y);
      if (duck) {
        state.score += duck.value;
        state.catches.push({ x: hook.x, y: hook.y, value: duck.value, age: 0 });
      }
      state.hook = null;
    }
  }

  for (const caught of state.catches) caught.age += dt;
  state.catches = state.catches.filter((c) => c.age < 0.8);

  if (state.casts === 0 && !state.hook) state.phase = 'over';
}

const ROD_BASE = { x: WIDTH / 2, y: HEIGHT - 10 } as const;
/** How high above the water the hook dangles before a cast. */
const DANGLE = 90;

function drawDuck(ctx: CanvasRenderingContext2D, x: number, y: number, value: number) {
  const { colors } = theme;
  ctx.fillStyle = colors.accent;
  ctx.beginPath();
  ctx.ellipse(x, y, 18, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 10, y - 12, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = colors.stripeA;
  ctx.beginPath();
  ctx.moveTo(x + 17, y - 14);
  ctx.lineTo(x + 25, y - 11);
  ctx.lineTo(x + 17, y - 9);
  ctx.fill();
  ctx.fillStyle = colors.background;
  ctx.font = canvasFont('small', 'bold');
  ctx.textAlign = 'center';
  ctx.fillText(String(value), x - 3, y + 5);
}

function draw(ctx: CanvasRenderingContext2D, state: HookADuckState, aim: { x: number; y: number }) {
  const { colors } = theme;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Booth awning.
  const stripe = WIDTH / 16;
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? colors.stripeA : colors.stripeB;
    ctx.fillRect(i * stripe, 0, stripe, 40);
  }

  // The stream: a wooden trough with water running round it.
  const { centerX, centerY, straight, radius } = STREAM;
  const left = centerX - straight / 2;
  const right = centerX + straight / 2;
  const trace = () => {
    ctx.beginPath();
    ctx.arc(right, centerY, radius, -Math.PI / 2, Math.PI / 2);
    ctx.arc(left, centerY, radius, Math.PI / 2, (Math.PI * 3) / 2);
    ctx.closePath();
  };
  ctx.lineCap = 'round';
  ctx.strokeStyle = colors.wood;
  ctx.lineWidth = 60;
  trace();
  ctx.stroke();
  ctx.strokeStyle = colors.water;
  ctx.lineWidth = 46;
  trace();
  ctx.stroke();

  for (const duck of state.ducks) {
    const at = positionOnStream(duck.distance);
    drawDuck(ctx, at.x, at.y, duck.value);
  }

  // The rod, from the player's hand to the hook.
  const hook = state.hook;
  const hookX = hook ? hook.x : aim.x;
  const hookY = hook ? hook.y - DANGLE * (1 - Math.min(hook.progress, 1)) : aim.y - DANGLE;
  const tip = { x: hookX, y: (hook ? hook.y : aim.y) - DANGLE - 20 };
  ctx.strokeStyle = colors.wood;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(ROD_BASE.x, ROD_BASE.y);
  ctx.lineTo(tip.x, tip.y);
  ctx.stroke();
  ctx.strokeStyle = colors.text;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(tip.x, tip.y);
  ctx.lineTo(hookX, hookY);
  ctx.stroke();
  ctx.strokeStyle = colors.muted;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(hookX, hookY + 6, 6, 0, Math.PI);
  ctx.stroke();

  // Where the hook will land.
  if (!hook && state.phase === 'playing') {
    ctx.strokeStyle = colors.text;
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(aim.x, aim.y, CATCH_RADIUS, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  ctx.font = canvasFont('title', 'bold');
  ctx.textAlign = 'center';
  for (const caught of state.catches) {
    ctx.globalAlpha = 1 - caught.age / 0.8;
    ctx.fillStyle = colors.accent;
    ctx.fillText(`+${caught.value}`, caught.x, caught.y - 30 - caught.age * 60);
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, HEIGHT - 20);
  ctx.textAlign = 'right';
  ctx.fillText(`Casts ${state.casts}/${CASTS}`, WIDTH - 16, HEIGHT - 20);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`Out of casts! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body');
    ctx.fillText('Click to play again', WIDTH / 2, HEIGHT / 2 + 40);
  }
}

export const hookADuck: CarnivalGame = {
  id: 'hook-a-duck',
  name: 'Hook a Duck',
  description: 'Hook the rubber ducks as they float round the stream. Each duck scores its number.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;
    const aim = { x: WIDTH / 2, y: STREAM.centerY + STREAM.radius };

    const toCanvas = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((event.clientX - rect.left) / rect.width) * WIDTH,
        y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
      };
    };
    const onMove = (event: PointerEvent) => Object.assign(aim, toCanvas(event));
    const onDown = (event: PointerEvent) => {
      Object.assign(aim, toCanvas(event));
      if (state.phase === 'over') {
        state = createState();
        scoreRecorded = false;
      } else {
        cast(state, aim.x, aim.y);
      }
    };
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerdown', onDown);

    let frame = 0;
    let last = performance.now();
    const loop = (time: number) => {
      // Cap the step so a background tab doesn't teleport everything.
      const dt = Math.min((time - last) / 1000, 0.05);
      last = time;
      step(state, dt);
      if (state.phase === 'over' && !scoreRecorded) {
        recordScore(hookADuck.id, state.score);
        scoreRecorded = true;
      }
      draw(ctx, state, aim);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
    };
  },
};

export default hookADuck;
