# MTG Practice Table

Mobile-first Magic: The Gathering Commander practice app with two play styles:

- **Physical Companion** — play your real deck on the table while the app mirrors the battlefield, tracks state, and runs an AI opponent.
- **Virtual Game** — import a Commander deck, shuffle/draw the real 99-card library digitally, and play directly from a visible virtual hand.

It is intentionally **not** a full Comprehensive Rules engine. The app automates safe/common state changes and lets the player confirm unusual Oracle interactions.

## Current playable features

- Physical and Virtual game modes
- Local **My Decks** library with pasted Commander deck import
- Scryfall-backed commander/card lookup and real card images
- Virtual 7-card opening hand, mulligan, real shuffled library, automatic turn draws, and manual draw control
- Play lands and cast real cards directly from the virtual hand
- One-land-per-turn tracking in Virtual mode
- Virtual instant responses are restricted to cards actually in hand
- Battlefield, graveyard, exile, hand/library counts, and return-to-hand tracking
- Dedicated commander zones, commander tax, and commander damage
- Real commander-based AI decks with fresh shuffled libraries each game
- AI spell acknowledgement / resolve / counter / cast-response flow
- Common Oracle-effect handling for draw/life loss, removal restrictions, Pacifism-style combat disabling, and other supported effects
- Life tracking and chronological game log
- Tap/untap, +1/+1 counters, marked damage, graveyard, exile
- Quick tokens and manual cards
- Summoning-sickness indicator
- Basic attacks, intelligent AI blocking, and combat damage resolution
- Attack-tax awareness such as Ghostly Prison
- End-turn cleanup for marked damage and temporary modifiers
- Undo/redo and automatic localStorage save/restore
- Victory/defeat overlays and quit-to-menu flow
- Mobile-first card rows, bottom sheets, and centered resolution modals

## Run locally

```bash
npm install
npm run dev -- -p 3100
```

Open http://localhost:3100.

Production check:

```bash
npm run build
```

## Importing a Commander deck

Open **My Decks** from the main menu. Enter a deck name and commander, then paste a list such as:

```text
1 Sol Ring
1 Arcane Signet
1 Guttersnipe
...
```

ManaBox/Moxfield-style set information after card names is accepted. The importer resolves each unique card through the app's Scryfall proxy, removes the commander from the pasted list when present, and expects 99 non-commander cards.

Decks and games are stored locally in the browser; no account or database is required.

## Scryfall

Client calls go through `/api/cards/autocomplete` and `/api/cards/named`. The server routes provide normalized `CardDefinition` data used separately from mutable `CardInstance` game state.

## Architecture

- `types/`: card, game, AI, and saved-deck models
- `lib/game/`: state transitions, combat/effect helpers, game creation
- `lib/ai/`: commander-based deck construction and turn behavior
- `lib/storage/`: local game/deck persistence
- `lib/scryfall/`: Scryfall normalization
- `components/`: battlefield, commander, hand, combat, response, and modal UI
- `app/decks/`: local deck import/management
- `app/api/cards/`: Scryfall proxy routes

## Deliberate limitations

This remains a practice simulator rather than MTG Arena/Forge. Complex stack ordering, replacement effects, every keyword interaction, alternate costs, full mana-color enforcement, exhaustive target validation, and arbitrary Oracle text are not automatically resolved yet. The app should prefer asking/allowing manual resolution over confidently applying an incorrect rule.
