# Money Manager

A personal, offline-first app for tracking where my money goes. Log income (salary, OT, side income) and daily expenses, then see each day and each month at a glance.

The goal is **clarity, not features**: open the app, add an entry in under 5 seconds, close it.

## Stack

| Concern        | Choice                                                  |
| -------------- | ------------------------------------------------------- |
| Framework      | React Native with **Expo** (managed workflow)           |
| Language       | **TypeScript** (strict)                                 |
| Navigation     | **Expo Router** (file-based)                            |
| Local database | **expo-sqlite** (typed repositories, SQL migrations, small shared query cache) |
| UI state       | **Zustand** (small, transient UI state only)            |
| Animation      | **React Native Reanimated** + **Gesture Handler**       |
| Haptics        | **expo-haptics**                                        |
| Validation     | **Zod**                                                 |
| Icons          | **Ionicons** via `@expo/vector-icons`                   |
| Testing        | Jest (`jest-expo`)                                      |

## Docs

Read these before writing code:

| Doc                                      | What it covers                                        |
| ---------------------------------------- | ----------------------------------------------------- |
| [docs/PRODUCT.md](docs/PRODUCT.md)       | What we build, MVP scope, what we do *not* build yet  |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Layers, folder structure, data flow, key decisions |
| [docs/DATA_MODEL.md](docs/DATA_MODEL.md) | Database tables, money handling, dates, queries       |
| [docs/DESIGN.md](docs/DESIGN.md)         | Visual language, design tokens, screens, components   |
| [docs/MOTION.md](docs/MOTION.md)         | Animation principles and the exact animations we use  |
| [docs/CONVENTIONS.md](docs/CONVENTIONS.md) | Code style, naming, testing, git                    |
| [docs/ROADMAP.md](docs/ROADMAP.md)       | Build order (milestones) and future ideas             |

## Getting started

```bash
npm install
npx expo start          # scan the QR code with Expo Go
```

On a phone connected over USB (no Wi-Fi needed):

```bash
npx expo start --localhost --port 8082
adb reverse tcp:8082 tcp:8082
adb shell am start -a android.intent.action.VIEW -d "exp://127.0.0.1:8082" host.exp.exponent
```

Checks before a commit:

```bash
npm run typecheck
npx eslint .
npm test
```
