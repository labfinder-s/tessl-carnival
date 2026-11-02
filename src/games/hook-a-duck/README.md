# Hook a Duck

Rubber ducks float round a stream in a loop. Hook as many as you can before
your casts run out.

## How to play

- Move the mouse to hold the hook over the stream. The circle shows where it
  will land.
- Click to lower the hook. If a duck is under it when it reaches the water, you
  catch that duck. If two are in reach, you catch the closer one.
- You have 10 casts. The round ends when the last cast has reached the water.
- Click again on the game over screen to play another round.

## Scoring

Each duck has a number on its base, and catching it scores that number. The 12
ducks on the stream are numbered 1, 2, 5, 1, 3, 1, 2, 10, 1, 3, 2 and 1. A miss
scores nothing.

Your final score is saved to the carnival's score board when the round ends.

## Files

- `game.ts`: the game logic (`createState`, `cast`, `step`, `duckUnder`,
  `positionOnStream`) and the `hookADuck` entry, the default export the midway
  finds.
- `game.test.ts`: tests for the game logic.
