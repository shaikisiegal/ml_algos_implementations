# Baby Log 👶

A simple iPhone app (also runs on Android) for tracking a newborn's day:
feeds, diapers, sleep, baths, medicine and notes, with a calendar where you
can look back at any day and edit it.

Built with [Expo](https://expo.dev) (React Native + TypeScript). All data stays
on the phone (no account, no server).

## Features

**Today screen**
- Big one-tap buttons: 🍼 Feed · 🧷 Diaper · 😴 Sleep · 🛁 Bath · 💊 Medicine · 📝 Note
- Sleep is a toggle: tap once when the baby falls asleep and again on wake-up
  (or tap the banner). Long-press it to enter a past nap by hand.
- "How long ago" cards: last feed, last diaper, asleep/awake for how long
- Today's totals (feeds, ml, breastfeeding minutes, wet/dirty diapers, sleep)
  and a timeline. Tap any entry to edit it.

**Add / edit form** (designed for one hand at 3 am)
- Time defaults to *now*; quick chips `Now / -5m / -15m / -30m / -1h`, or the
  native date-time picker
- Feed: bottle (formula / breast milk, amount in ml with ± buttons and
  30–180 ml presets), breast (left / right / both + minutes), or solids
- Diaper: wet / dirty / both / dry, optional poop color
- Sleep: start and wake-up time (or "still sleeping"), duration shown live
- Medicine: name + dose; every event can have a note
- Delete from the edit screen

**Calendar**
- Month view with colored dots per event type on each day
- Tap a day to see its totals and all its events; tap an event to edit/delete it
- "+ Add" logs an event on the selected (past) day

**Profile** (⚙️ top-right): baby's name and birth date (shows age), JSON
backup export via the share sheet, delete all data. Dark mode supported.

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
  (tabs)/index.tsx    Today
  (tabs)/calendar.tsx Calendar
  event.tsx           add / edit form (modal)
  settings.tsx        baby profile + data
src/components/       Chip, EventRow, SummaryChips, TimeField, QuickTimes
src/lib/              types, storage (store.tsx), date + summary helpers
tests/                unit tests
```
