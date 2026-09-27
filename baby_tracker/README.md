# Baby Log 👶

A simple iPhone app (also runs on Android) for tracking a newborn's day:
feeds, diapers, sleep, baths, medicine and notes, with a calendar where you
can look back at any day and edit it.

Built with [Expo](https://expo.dev) (React Native + TypeScript). All data stays
on the phone (no account, no server).

## Features

Inspired by apps like Baby Daybook, kept simple and private.

The interface is in **Hebrew, right-to-left** (`<html dir="rtl">` on web, `I18nManager.forceRTL` natively).
Charts and the timeline keep time running left→right (00 → 24).

**Home**
- Round quick-add buttons: 🍼 Bottle · 🧷 Diaper · 😴 Sleep · 🛁 Bath ·
  💊 Medicine · 📏 Growth · 📝 Note. Long-press any of them to enter a past event by hand.
- **Sleep** is a one-tap toggle (fall asleep / wake up) with a live "sleeping for…" banner.
- **Predicted nap**: based on the average awake window over the last 3 days.
- Today as a 24-hour strip, "time since last" feed/diaper/sleep, today's totals and list.
- Age shown as "1m 9d (Week 6)".

**Timeline**: many days stacked as 24-hour rows (sleep bars + event icons), so daily
rhythms line up. Filter by type; tap anything to edit it.

**Calendar**: month view with colored dots per event type; tap a day to review, add,
edit or delete events.

**Statistics**: daily charts for sleep, feeds, bottle ml and
diapers over 7/14/30 days, with the average line (complete days only) and, for sleep,
the recommended range for the baby's age. Tap a bar for details or view as a table.

**Growth**: log weight, height and head size; latest values and a chart over time.

**Add / edit form**: time defaults to now with `Now / -5m / -15m / -30m / -1h` chips or
the native picker. Bottle (formula / breast milk, ml with ± and presets), diaper (wet / dirty / both / dry + poop color), sleep
(start + wake-up), medicine (name + dose), growth, and a note on anything.

**Profile** (⚙️): name, birth date, JSON backup export, delete all. Dark mode supported.

**Sync between two phones** (⚙️ → סנכרון בין טלפונים): one phone creates a 16-character
family code, the other joins with it; both then share one log live, and changes made
offline upload when the connection returns. Uses Firebase Firestore — set up once:

1. [console.firebase.google.com](https://console.firebase.google.com) → create a project (Analytics not needed).
2. Build → Firestore Database → Create database (production mode).
3. Firestore → Rules → paste [`firestore.rules`](firestore.rules) → Publish.
4. Project settings → Your apps → Web app → copy the `firebaseConfig` values into
   [`src/lib/firebaseConfig.ts`](src/lib/firebaseConfig.ts).

Local testing against the emulator: build with `EXPO_PUBLIC_FIRESTORE_EMULATOR=127.0.0.1:8080`.

Not included (needs a native build, not possible in Expo Go): lock-screen widgets and an
Apple Watch app.

## Install on iPhone (web app — no App Store, no Mac, free)

The app is published as an installable web app at
**https://shaikisiegal.github.io/ml_algos_implementations/**

1. Open that link in **Safari** on the iPhone.
2. Tap **Share** (square with arrow) → **Add to Home Screen** → **Add**.
3. Open it from the new 👶 icon. It runs full-screen like a normal app and works offline.

Data is stored on the phone, inside the home-screen app. Use ⚙️ → **Export backup**
now and then; **Restore a backup** (paste the text) moves data to another phone.

### Publishing (one-time setup)

`.github/workflows/baby-log-pages.yml` builds and deploys the web app on every push to
`master` that touches `baby_tracker/`. Once: repo **Settings → Pages → Build and
deployment → Source: GitHub Actions**. The base path `/ml_algos_implementations` is set in
`app.json` (`experiments.baseUrl`) and `public/index.html`; change both if the repo is renamed.

Build locally with `npm run build:web` (output in `dist/`).

## Run it in Expo Go (development)

1. Install **Expo Go** from the App Store on your iPhone.
2. On a computer with [Node.js](https://nodejs.org) 20+:
   ```bash
   cd baby_tracker
   npm install
   npx expo start
   ```
3. Scan the QR code with the iPhone camera; it opens in Expo Go.
   (Phone and computer must be on the same Wi-Fi, or use `npx expo start --tunnel`.)

### Installing it as a real app

To get a standalone app icon (no Expo Go, no computer running), build it with
[EAS](https://docs.expo.dev/build/introduction/):

```bash
npx eas-cli@latest build --platform ios --profile preview
```

Installing on a device needs an Apple Developer account. The bundle ID in
`app.json` (`com.babylog.app`) should be changed to your own.

> Data saved inside Expo Go does not carry over to a standalone build.
> Use **Profile → Export backup** first if you switch.

## Development

```bash
npm run typecheck   # TypeScript
npm test            # unit tests for date/summary logic (node --test)
npm run web         # quick preview in the browser
```

```
src/app/              screens (Expo Router)
  (tabs)/index.tsx    Home
  (tabs)/timeline.tsx Timeline (multi-day 24h grid)
  (tabs)/calendar.tsx Calendar
  (tabs)/stats.tsx    Statistics
  (tabs)/growth.tsx   Growth
  event.tsx           add / edit form (modal)
  settings.tsx        baby profile + data
src/components/       DayStrip, charts, BreastTimerCard, Chip, EventRow, TimeField, …
src/lib/              types, storage (store.tsx), stats + nap prediction, breast timer, theme
tests/                unit tests
```
