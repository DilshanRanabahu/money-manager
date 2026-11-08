# CLAUDE.md

Personal money tracker in React Native (Expo, TypeScript). Offline-first, expo-sqlite (no ORM). Routes live in `src/app`. Also read AGENTS.md (Expo SDK notes).

Before changing code, read the relevant doc:
- Scope: [docs/PRODUCT.md](docs/PRODUCT.md) — do not add features outside the MVP unless asked.
- Structure & layer rules: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Tables, money & dates: [docs/DATA_MODEL.md](docs/DATA_MODEL.md)
- UI tokens & screens: [docs/DESIGN.md](docs/DESIGN.md)
- Animations: [docs/MOTION.md](docs/MOTION.md)
- Style & tests: [docs/CONVENTIONS.md](docs/CONVENTIONS.md)
- Current milestone: [docs/ROADMAP.md](docs/ROADMAP.md)

Hard rules:
- Money is integer minor units; use `shared/lib/money.ts` only.
- Dates are `YYYY-MM-DD` strings; use `shared/lib/dates.ts` only.
- Screens never import from `src/db`; go through feature hooks → services → repositories.
- All animation uses Reanimated and the tokens in `src/shared/motion`.
- Update the matching doc when changing architecture, schema, or tokens.
- Tick off ROADMAP items when done.

The user writes in Singlish; reply in Sinhala script.
