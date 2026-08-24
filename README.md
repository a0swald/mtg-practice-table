# MTG Practice Table

Mobile-first Magic: The Gathering Commander practice companion for use with physical cards. It is intentionally **not** a full rules engine.

## Current playable milestone

- 20/40 life new-game setup and one generic AI opponent (default)
- Human and AI battlefields
- Life tracking and chronological game log
- Scryfall autocomplete + fuzzy named-card lookup through Next.js server routes
- Real Scryfall card images/metadata on battlefield
- Tap/untap, +1/+1 counters, marked damage, graveyard, exile
- Quick tokens and manual cards
- Summoning-sickness indicator
- Basic player attack selection and damage confirmation
- Basic AI creature casting/attacking with Learning/Casual/Challenging aggression
- Incoming combat Take / Block / Respond flow
- End-turn cleanup for marked damage and temporary modifiers
- Undo/redo for the current session
- Automatic localStorage save/restore
- Mobile bottom sheets and horizontal battlefield scrolling

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

Production check:

```bash
npm run build
```

## Scryfall

Client calls go through `/api/cards/autocomplete` and `/api/cards/named`. The server routes send a descriptive User-Agent and Accept header, use fuzzy lookup, debounce autocomplete on the client, and use Next fetch caching/revalidation.

## Architecture

- `types/`: static card definitions vs mutable game instances
- `lib/game/`: pure state transitions, computed P/T, game creation
- `lib/ai/`: deterministic generic AI templates and turn behavior
- `lib/storage/`: localStorage persistence
- `lib/scryfall/`: Scryfall normalization
- `components/`: reusable mobile UI pieces
- `app/api/cards/`: Scryfall proxy routes

## Deliberate MVP limitations / next work

Commander zone/tax/damage UI, custom counters, -1/-1 action controls, detailed card modal, exact block assignment, real AI libraries/hands, AI removal/draw/ramp, phase-by-phase turn controls, multiple-AI turn rotation, custom starting life, richer tutor explanations, token art/stack splitting, and full zone return-to-hand flows remain for subsequent milestones.

The player remains responsible for Oracle-text resolution. The app records the resulting state instead of attempting to execute arbitrary Magic rules.
