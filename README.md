# Spoken Flashcards

An Angular-first spoken vocabulary trainer. It presents due cards, listens for a
target-language answer, evaluates the recognized text, and schedules the next
review with a simplified SM-2-style algorithm.

## Run locally

Prerequisites: Node.js 20.19+ (or a currently supported Node release) and npm.

```bash
npm install
npm start
```

Open `http://localhost:4200` in Chrome or Edge and allow microphone access.
Speech recognition support varies by browser and may use a browser-managed
network service.

Run the unit tests and production build:

```bash
npm test
npm run build
```

## Architecture

```text
src/app/
├── core/domain/       models, ports, injection tokens, use-case services
├── infrastructure/    Web Speech API and localStorage adapters
├── features/study/    standalone study UI components
└── shared/utils/      text normalization and Levenshtein distance
```

The application configuration binds domain ports to browser adapters. A future
Capacitor build can replace speech recognition or storage without changing the
study UI or scheduling logic.

## MVP behavior

- Stops after two seconds without a new speech result or ten seconds total.
- Normalizes case, punctuation, diacritics, and whitespace.
- Passes answers with a Levenshtein similarity score of at least `0.8`.
- Maps scores to `again`, `hard`, `good`, and `easy` review grades.
- Seeds five English-to-Dutch cards in localStorage.

To reset the seed deck, remove `spoken-flashcards.cards.v1` from browser
localStorage.
