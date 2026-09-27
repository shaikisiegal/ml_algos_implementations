# Baby Log 👶

A simple iPhone app (also runs on Android) for tracking a newborn's day:
feeds, diapers, sleep, baths, medicine and notes, with a calendar where you
can look back at any day and edit it.

Built with [Expo](https://expo.dev) (React Native + TypeScript). All data stays
on the phone (no account, no server).

## Features

Inspired by apps like Baby Daybook, kept simple and private.

**Home**
- Round quick-add buttons: 🤱 Breast · 🍼 Bottle · 🧷 Diaper · 😴 Sleep · 🛁 Bath ·
  💊 Medicine · 📏 Growth · 📝 Note. Long-press any of them to enter a past event by hand.
- **Breastfeeding stopwatch**: tap Breast, then ▶ L / ▶ R. Switching sides pauses the
  other one; "Finish & save" stores the minutes per side. It keeps running if the app is closed.
- **Sleep** is a one-tap toggle (fall asleep / wake up) with a live "sleeping for…" banner.
- **Predicted nap**: based on the average awake window over the last 3 days.
- Today as a 24-hour strip, "time since last" feed/diaper/sleep, today's totals and list.
- Age shown as "1m 9d (Week 6)".

**Timeline**: many days stacked as 24-hour rows (sleep bars + event icons), so daily
rhythms line up. Filter by type; tap anything to edit it.

**Calendar**: month view with colored dots per event type; tap a day to review, add,
edit or delete events.

**Statistics**: daily charts for sleep, feeds, bottle ml, breastfeeding minutes and
diapers over 7/14/30 days, with the average line (complete days only) and, for sleep,
the recommended range for the baby's age. Tap a bar for details or view as a table.

**Growth**: log weight, height and head size; latest values and a chart over time.

**Add / edit form**: time defaults to now with `Now / -5m / -15m / -30m / -1h` chips or
the native picker. Bottle (formula / breast milk, ml with ± and presets), breast
(minutes per side), solids, diaper (wet / dirty / both / dry + poop color), sleep
(start + wake-up), medicine (name + dose), growth, and a note on anything.

**Profile** (⚙️): name, birth date, JSON backup export, delete all. Dark mode supported.

Not included (needs a native build, not possible in Expo Go): lock-screen widgets and an
Apple Watch app.

## Run it on your iPhone (no Mac needed)

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
