# ShareLendar

Minimal React Native (Expo) Android app: sign in with Google, list your Google Calendar
events, open one, and share it as an `.ics` file (WhatsApp, Messenger, email, …).

Targets Android 16 / API 36 (Pixel 10), min SDK 26.

## Structure

```
index.ts                     entry point
app.json                     Expo config (package name, SDK levels, plugins)
src/
  App.tsx                    navigation (auth-gated stack)
  auth/AuthContext.tsx       Google Sign-In + access token
  api/googleCalendar.ts      Calendar REST v3: events.list
  utils/ics.ts               RFC 5545 .ics builder
  utils/share.ts             write .ics to cache + Android share sheet
  utils/format.ts            date/time formatting
  screens/                   SignIn, EventList, EventDetail
```

## Prerequisites

- Node.js 20+
- JDK 17 and Android Studio (Android SDK 36) — or use EAS Build in the cloud
- A Pixel 10 (USB debugging enabled) or an API 36 emulator

> Google Sign-In is a native module, so the app **does not run in Expo Go**.
> It runs as a development build (`expo-dev-client`).

## 1. Google Cloud setup (one time)

1. Create a project at <https://console.cloud.google.com>.
2. **APIs & Services → Library**: enable **Google Calendar API**.
3. **OAuth consent screen**: External, add the scope
   `https://www.googleapis.com/auth/calendar.readonly`, and add your Google account as a **test user**.
4. **Credentials → Create OAuth client ID**:
   - **Android**: package `com.sharelendar.app`, SHA-1 of your signing key.
     For local debug builds (after step 2 below):
     `cd android && ./gradlew signingReport` (use the `debug` variant SHA-1).
   - **Web application**: no settings needed — copy its client ID.
5. `cp .env.example .env` and set `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` to the **Web** client ID.

## 2. Install & run

```bash
npm install
npx expo install --fix      # align native package versions with the Expo SDK
npm run android             # prebuild + build + install on the connected device
```

Afterwards, `npm start` launches the dev server for fast refresh.

## 3. Testing & Validation

Run code validations and automated tests:

```bash
npm run validate        # Runs typecheck + lint + test suite
npm test                # Run Jest test suite (66 tests across 9 test suites)
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Generate test coverage report
npm run lint            # ESLint static analysis
npm run typecheck       # TypeScript compilation check
```

## Notes / next steps

- Events are fetched from the **primary** calendar, from 30 days ago onward
  (see `listEvents` in `src/api/googleCalendar.ts`).
- Recurring events are expanded; sharing one shares that single occurrence.
- Timed events are exported in UTC, so recipients see them in their own time zone.
- For a release build, register the release/Play App Signing SHA-1 as another Android OAuth client.

## `npm audit`

- `package.json` overrides `xcode`'s `uuid` to `^11.1.1` (fixes GHSA for uuid < 11.1.1).
- Remaining findings come from `braces` (via Metro) and `node-forge` (via `@expo/cli`).
  No patched versions exist upstream yet. Both are build/dev-time tooling and are
  **not bundled into the APK**. Re-check with `npm audit` after `npx expo install --fix`.
- **Do not run `npm audit fix --force`** — it "fixes" by downgrading to `expo@44`, which breaks the app.

