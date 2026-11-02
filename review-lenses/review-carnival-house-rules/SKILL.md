---
name: review-carnival-house-rules
description: Review a change to a carnival game for the house rules in AGENTS.md that keep every booth on the midway consistent, namely that each game registers on the midway, reports scores through recordScore from src/carnival, and draws with theme and canvasFont. Use as one lens in a code review run on changes under src/games/.
---

# Review lens: Carnival House Rules

Review whether a game under `src/games/` keeps house rules 1 to 3 in `AGENTS.md`, so it shows up on the midway, its scores reach the shared tables, and it looks like the other booths.

## Scope

- **Registration** (house rule 1) A game lives in `src/games/<game-id>/`, its `game.ts` default-exports its `CarnivalGame`, and its `id` matches the folder name. `src/games/index.ts` finds games only through `./*/game.ts`, so a game in a nested folder, or one whose `CarnivalGame` lives in a file other than `game.ts`, never reaches the midway.
- **Scores** (house rule 2) A game reports a score by calling `recordScore(game.id, score)` from `src/carnival`, once, when a round ends. It does not read or write `localStorage` or `sessionStorage` itself, and keeps no high score table of its own.
- **Theme** (house rule 3) A game's colours, fonts and sizes come from `theme` and `canvasFont` in `src/carnival/theme.ts`. No hex, `rgb()`, `hsl()` or named colour literals, and no font strings, inside a game.

Code outside `src/games/` is out of scope: `src/carnival/` defines the theme and the scores module, and `src/midway/palette.ts` has its own scenery colours.

## Method

Read `AGENTS.md` at the repository root for the current wording of the house rules before judging against them.

For each changed `game.ts`, check where it sits, what it default-exports, and the `id` it gives. Read the folder name from the path, not from the code.

Trace each place a round ends to the `recordScore` call it makes. Check the call happens once per round, not per frame, per hit or per redraw, and that the id passed is the game's own `id`. Look for any other path that persists or compares scores: storage access, a module-level best score, a table kept across rounds.

Read every colour and font the game assigns to the canvas, such as `fillStyle`, `strokeStyle`, `shadowColor`, `font` and gradient stops, and the DOM styles it sets, and follow each value back to where it comes from.

## Threshold

Report a game that breaks one of these three rules in code that runs.

Do not report:

- Values derived from the theme, such as a colour from `theme.colors` with alpha applied, a size computed from `theme.font` or `theme.canvas`, or a `canvasFont` result.
- Test data in `game.test.ts`, such as a fixed score or a stand-in colour.
- Anything lint, the type-checker or the tests already enforce. `src/games/index.test.ts` imports the registry, and `src/games/index.ts` throws when a `game.ts` has no default export or exports an `id` other than its folder name, so `npm run check` already fails on either. `createRegistry` also rejects an id that is not kebab-case and two games that share an id.
- Code outside `src/games/`.

## Reporting

Be accurate about the consequence for the player. Say what the code does, not what a rule implies:

- A game outside `src/games/<game-id>/game.ts` gets no booth and cannot be played.
- A `game.ts` with no default export, or with an `id` other than its folder name, makes `src/games/index.ts` throw when the midway loads, so the whole midway fails, not only that booth.
- A game that skips `recordScore` shows no best score on its booth card, and its scores are lost. One that calls it more than once a round fills the shared table with partial scores.
- A game that keeps its own storage or score table disagrees with the booth card, which reads only the shared scores.
- A hard-coded colour or font string still draws. It breaks the house rule and drifts from the other booths when the theme changes, but nothing breaks for the player.

For each finding:

- Name the rule by its number in `AGENTS.md`, the file and line, and the consequence above.
- State the fix: the `theme` or `canvasFont` value to use, where the single `recordScore` call belongs, or where the file or export should move.
